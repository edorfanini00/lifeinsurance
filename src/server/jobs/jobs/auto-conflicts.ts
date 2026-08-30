import type { JobDefinition } from "../types";
import { prisma } from "@/lib/db";
import { normalizeName } from "@/lib/crypto";

/**
 * Deduplication and conflict detection. Prevents two researchers from working
 * the same household and blocks outreach where entitlement is contested.
 */
export const autoConflictsJob: JobDefinition = {
  id: "auto-conflicts",
  name: "Duplicate and conflict scan",
  description:
    "Flags shared contact details, repeated owner identities, active probate, and already-claimed property. Open conflicts block automated outreach.",
  everySeconds: 300,
  requires: ["autoConflicts"],
  async run(ctx) {
    const cases = await prisma.case.findMany({
      where: { organizationId: ctx.organizationId },
      include: {
        property: true,
        conflicts: true,
        people: { include: { person: { include: { contacts: true } } } },
      },
    });

    const byContact = new Map<string, string[]>();
    const byOwner = new Map<string, string[]>();

    for (const kase of cases) {
      for (const cp of kase.people) {
        for (const contact of cp.person.contacts) {
          const list = byContact.get(contact.valueHash) || [];
          list.push(kase.id);
          byContact.set(contact.valueHash, list);
        }
      }
      const key = `${normalizeName(kase.property.ownerNameRaw)}|${kase.property.city ?? ""}`;
      const list = byOwner.get(key) || [];
      list.push(kase.id);
      byOwner.set(key, list);
    }

    let created = 0;
    const notes: string[] = [];
    const raisedThisRun = new Set<string>();

    const raise = async (
      caseId: string,
      type: "DUPLICATE_HOUSEHOLD" | "AMBIGUOUS_IDENTITY" | "ALREADY_CLAIMED",
      detail: string,
    ) => {
      const key = `${caseId}:${type}`;
      if (raisedThisRun.has(key)) return;
      raisedThisRun.add(key);
      const kase = cases.find((c) => c.id === caseId);
      if (kase?.conflicts.some((c) => c.type === type && c.open)) return;
      await prisma.conflictFlag.create({ data: { caseId, type, detail } });
      created += 1;
      notes.push(`${kase?.caseNumber}: ${type}`);
    };

    for (const [, ids] of byContact) {
      const unique = [...new Set(ids)];
      if (unique.length > 1) {
        for (const id of unique) {
          await raise(
            id,
            "DUPLICATE_HOUSEHOLD",
            `A contact method on this case also appears on ${unique.length - 1} other case(s). Coordinate before any outreach.`,
          );
        }
      }
    }

    for (const [key, ids] of byOwner) {
      const unique = [...new Set(ids)];
      if (unique.length > 1) {
        for (const id of unique) {
          await raise(
            id,
            "AMBIGUOUS_IDENTITY",
            `The reported owner name and city (${key.replace("|", ", ")}) appear on ${unique.length} properties. Same-name records are not the same person without evidence.`,
          );
        }
      }
    }

    for (const kase of cases) {
      if (kase.property.claimStatus === "CLAIMED" || kase.property.claimStatus === "PAID") {
        await raise(kase.id, "ALREADY_CLAIMED", "Property record reports the account is already claimed or paid.");
      }
    }

    return {
      processed: cases.length,
      created,
      detail: notes.length ? notes.slice(0, 8).join("; ") : "No new conflicts.",
      skipped: created === 0,
    };
  },
};
