import type { JobDefinition } from "../types";
import { prisma } from "@/lib/db";
import { draftInitialOutreach } from "@/server/services/outreach";

/**
 * Drafts only. Sending stays behind ComplianceService and a human approval,
 * regardless of automation level.
 */
export const autoDraftOutreachJob: JobDefinition = {
  id: "auto-draft-outreach",
  name: "Draft first-touch outreach",
  description:
    "For cases that reached READY FOR OUTREACH with a contactable relative, drafts a compliant first email and opens a human approval request. Never sends.",
  everySeconds: 180,
  requires: ["autoDraftOutreach"],
  async run(ctx) {
    const cases = await prisma.case.findMany({
      where: {
        organizationId: ctx.organizationId,
        status: "READY_FOR_OUTREACH",
        communications: { none: {} },
        conflicts: { none: { open: true } },
      },
      include: {
        people: { include: { person: { include: { contacts: true } } } },
      },
      take: 10,
    });

    if (!cases.length) {
      return { processed: 0, created: 0, detail: "No cases ready for a first draft.", skipped: true };
    }

    let drafted = 0;
    const notes: string[] = [];

    for (const kase of cases) {
      const target = kase.people.find((p) => p.role !== "owner" && p.person.contacts.length > 0);
      if (!target) continue;

      const firstName = target.person.canonicalFullName.split(" ")[0];
      const { communication, compliance } = await draftInitialOutreach({
        caseId: kase.id,
        firstName,
        agentName: "your case researcher",
        actorUserId: ctx.actorUserId,
      });

      const existing = await prisma.approvalRequest.findFirst({
        where: { caseId: kase.id, type: "FIRST_OUTBOUND", status: "PENDING" },
      });
      if (!existing) {
        await prisma.approvalRequest.create({
          data: {
            caseId: kase.id,
            type: "FIRST_OUTBOUND",
            reason: `Automated draft prepared for ${target.person.canonicalFullName}. Compliance: ${compliance.decision}. ${compliance.reasons.join(" ")}`,
            requesterId: ctx.actorUserId,
          },
        });
      }
      drafted += 1;
      notes.push(`${kase.caseNumber}: draft ${communication.id.slice(0, 8)} (${compliance.decision})`);
    }

    return { processed: cases.length, created: drafted, detail: notes.join("; ") || "No contactable relative yet." };
  },
};
