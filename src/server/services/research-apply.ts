import { prisma } from "@/lib/db";
import { encryptPii, hashLookup, normalizeName } from "@/lib/crypto";
import { getAdapter } from "@/server/adapters/registry";
import { writeAudit } from "@/server/audit";
import { recomputeCase } from "./case-recompute";
import { nextBestAction } from "./case-manager";
import type { AdapterHit } from "@/server/adapters/types";

const PROMPT_VERSION = "research-apply-v1";
const RESEARCH_ADAPTERS = [
  "fixture-public-records",
  "obituary-provider",
  "county-probate",
  "people-data-provider",
];

/**
 * Runs approved research adapters for a case and writes what they returned into
 * the investigation graph with provenance. Only adapter-sourced FACT hits create
 * records; nothing here manufactures a death, a relative, or a contact.
 */
export async function applyResearchToCase(input: {
  caseId: string;
  organizationId: string;
  actorUserId: string;
}) {
  const kase = await prisma.case.findFirst({
    where: { id: input.caseId, organizationId: input.organizationId },
    include: {
      property: true,
      people: { include: { person: { include: { death: true, contacts: true } } } },
    },
  });
  if (!kase) return { applied: 0, detail: "Case not found." };

  const owner = kase.people.find((p) => p.role === "owner")?.person;
  if (!owner) return { applied: 0, detail: "No owner person on case." };

  const objective = `Determine whether ${owner.canonicalFullName}, previously of ${kase.property.city ?? "Florida"}, Florida, is deceased and identify the strongest living relatives.`;

  const run = await prisma.aiResearchRun.create({
    data: {
      caseId: kase.id,
      objective,
      model: "adapter-extraction",
      promptVersion: PROMPT_VERSION,
      status: "RUNNING",
    },
  });

  const hits: { adapterId: string; hit: AdapterHit }[] = [];
  const notes: string[] = [];

  for (const adapterId of RESEARCH_ADAPTERS) {
    const adapter = getAdapter(adapterId);
    const result = await adapter.search(
      { name: owner.canonicalFullName, city: kase.property.city || undefined, state: "FL" },
      { organizationId: input.organizationId, actorUserId: input.actorUserId },
    );
    notes.push(...result.notes);
    for (const hit of result.hits) hits.push({ adapterId, hit });
  }

  let applied = 0;
  const applieds: string[] = [];

  for (const { adapterId, hit } of hits) {
    if (hit.kind !== "FACT") continue;
    const source = await ensureSource(input.organizationId, adapterId);
    const evidence = await prisma.sourceEvidence.create({
      data: {
        sourceId: source.id,
        field: hit.title,
        rawValue: JSON.stringify(hit.raw),
        url: hit.url,
        retrievedAt: hit.retrievedAt,
        interpretation: hit.interpretation,
        findingKind: "FACT",
      },
    });
    await prisma.aiFinding.create({
      data: {
        runId: run.id,
        kind: "FACT",
        statement: hit.interpretation || hit.title,
        confidence: 88,
        evidence: { connect: { id: evidence.id } },
      },
    });

    const raw = lower(hit.raw);

    const died = raw.died || raw.date_of_death || raw.dateofdeath;
    if (died && !(await prisma.deathRecord.findUnique({ where: { personId: owner.id } }))) {
      await prisma.deathRecord.create({
        data: {
          personId: owner.id,
          dateOfDeath: safeDate(died),
          location: raw.city ? `${raw.city}, FL` : null,
          obituaryUrl: hit.url,
          confidence: 88,
          evidence: { connect: { id: evidence.id } },
        },
      });
      await prisma.person.update({
        where: { id: owner.id },
        data: { livingStatus: "DECEASED", identityConfidence: Math.max(owner.identityConfidence, 85) },
      });
      applied += 1;
      applieds.push("death record");
    }

    const probateNumber = raw.casenumber || raw.case_number;
    if (probateNumber && raw.county) {
      const existing = await prisma.probateCase.findUnique({
        where: { county_caseNumber: { county: raw.county, caseNumber: probateNumber } },
      });
      if (!existing) {
        await prisma.probateCase.create({
          data: {
            county: raw.county,
            caseNumber: probateNumber,
            status: raw.status || "Unknown",
            evidence: { connect: { id: evidence.id } },
          },
        });
        await prisma.deathRecord.updateMany({
          where: { personId: owner.id },
          data: {
            probateCounty: raw.county,
            probateCaseNumber: probateNumber,
            personalRepresentative: raw.personalrepresentative || null,
            probateStatus: raw.status || null,
          },
        });
        applied += 1;
        applieds.push("probate case");
      }
    }

    for (const child of splitNames(raw.children)) {
      const rel = await upsertRelative(input.organizationId, kase.id, child, raw.city);
      if (rel.created) {
        await prisma.relationship.create({
          data: {
            fromPersonId: owner.id,
            toPersonId: rel.personId,
            type: "CHILD",
            confidence: 90,
            evidence: { connect: { id: evidence.id } },
          },
        });
        applied += 1;
        applieds.push(`relative ${child}`);
      }
    }

    for (const spouse of splitNames(raw.spouse)) {
      const clean = spouse.replace(/\(.*?\)/g, "").trim();
      if (!clean) continue;
      const rel = await upsertRelative(input.organizationId, kase.id, clean, raw.city);
      if (rel.created) {
        await prisma.relationship.create({
          data: {
            fromPersonId: owner.id,
            toPersonId: rel.personId,
            type: "SPOUSE",
            confidence: 90,
            evidence: { connect: { id: evidence.id } },
          },
        });
        applied += 1;
        applieds.push(`spouse ${clean}`);
      }
    }

    if ((raw.phone || raw.email) && raw.name) {
      const target = await prisma.person.findFirst({
        where: { organizationId: input.organizationId, normalizedName: normalizeName(raw.name) },
      });
      if (target) {
        for (const [channel, value] of [
          ["PHONE", raw.phone],
          ["EMAIL", raw.email],
        ] as const) {
          if (!value) continue;
          const exists = await prisma.contactMethod.findFirst({
            where: { personId: target.id, valueHash: hashLookup(value) },
          });
          if (exists) continue;
          await prisma.contactMethod.create({
            data: {
              personId: target.id,
              channel,
              valueEnc: encryptPii(value),
              valueHash: hashLookup(value),
              confidence: 86,
              evidence: { connect: { id: evidence.id } },
            },
          });
          applied += 1;
          applieds.push(`${channel.toLowerCase()} for ${raw.name}`);
        }
      }
    }
  }

  const facts = hits.filter((h) => h.hit.kind === "FACT").length;
  await prisma.aiResearchRun.update({
    where: { id: run.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      confidence: facts ? Math.min(94, 60 + facts * 8) : 20,
      stopReason: facts
        ? `Applied ${applied} graph update(s) from ${facts} sourced fact(s).`
        : "No approved live source returned data. Connect a licensed provider.",
      resultSummary: [
        `Objective: ${objective}`,
        applied ? `APPLIED: ${applieds.join(", ")}.` : "APPLIED: nothing; no sourced facts available.",
        notes
          .filter(Boolean)
          .slice(0, 6)
          .map((n) => `NOTE: ${n}`)
          .join("\n"),
        "A property or name match is not a determination of legal entitlement.",
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  });

  const updated = await recomputeCase(kase.id);

  if (updated) {
    const fresh = await prisma.case.findUnique({
      where: { id: kase.id },
      include: {
        conflicts: { where: { open: true } },
        documents: true,
        agreements: true,
        people: { include: { person: { include: { death: true, contacts: true } } } },
      },
    });
    if (fresh) {
      const nba = nextBestAction({
        status: fresh.status,
        hasDeath: fresh.people.some((p) => p.person.death),
        hasRelative: fresh.people.some((p) => p.role !== "owner"),
        hasContact: fresh.people.some((p) => p.person.contacts.length > 0),
        docsRequested: fresh.documents.length,
        docsComplete: fresh.documents.filter((d) => d.status === "ACCEPTED").length,
        hasAgreement: fresh.agreements.length > 0,
        hasRep: !!fresh.representativeId,
        conflicts: fresh.conflicts.map((c) => c.type),
      });
      await prisma.case.update({
        where: { id: kase.id },
        data: {
          nextAction: nba.action,
          nextActionReason: nba.reason,
          riskFlags: nba.risk,
          aiConfidence: nba.confidence,
        },
      });
    }
  }

  await writeAudit({
    userId: input.actorUserId,
    action: "AUTO_RESEARCH",
    entityType: "Case",
    entityId: kase.id,
    metadata: { runId: run.id, applied, promptVersion: PROMPT_VERSION },
  });

  return { applied, detail: applieds.join(", ") || "no sourced facts" };
}

async function upsertRelative(
  organizationId: string,
  caseId: string,
  name: string,
  city?: string,
) {
  const normalized = normalizeName(name);
  let person = await prisma.person.findFirst({ where: { organizationId, normalizedName: normalized } });
  let created = false;
  if (!person) {
    person = await prisma.person.create({
      data: {
        organizationId,
        canonicalFullName: name,
        normalizedName: normalized,
        lastKnownAddress: city ? `${city}, FL` : null,
        livingStatus: "LIKELY_LIVING",
        identityConfidence: 70,
      },
    });
    created = true;
  }
  const link = await prisma.casePerson.findFirst({ where: { caseId, personId: person.id } });
  if (!link) {
    await prisma.casePerson.create({
      data: { caseId, personId: person.id, role: "relative", claimantCategory: "KNOWN_RELATIVE" },
    });
    created = true;
  }
  return { personId: person.id, created };
}

function lower(raw: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) out[k.toLowerCase().replace(/[\s-]/g, "_")] = v;
  return out;
}

function splitNames(value?: string) {
  if (!value) return [];
  return value
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

function safeDate(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function ensureSource(organizationId: string, adapterId: string) {
  const existing = await prisma.source.findFirst({ where: { organizationId, adapterId } });
  if (existing) return existing;
  const adapter = getAdapter(adapterId);
  return prisma.source.create({
    data: {
      organizationId,
      adapterId,
      name: adapter.displayName,
      jurisdiction: "FL",
      legalNotes: adapter.legalNotes,
    },
  });
}
