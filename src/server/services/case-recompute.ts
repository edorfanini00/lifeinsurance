import { prisma } from "@/lib/db";
import { scoreOpportunity } from "./opportunity-scoring";
import type { CaseStatus } from "@prisma/client";

/**
 * Recomputes confidence bands, opportunity score, queue, and the earliest
 * research stage a case has earned from evidence actually on file.
 * Never advances a case past human-gated stages.
 */
export async function recomputeCase(caseId: string) {
  const kase = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      property: true,
      organization: true,
      conflicts: { where: { open: true } },
      documents: true,
      agreements: true,
      claims: true,
      people: {
        include: {
          person: {
            include: { death: true, contacts: true, fromRelationships: true },
          },
        },
      },
    },
  });
  if (!kase) return null;

  const owner = kase.people.find((p) => p.role === "owner")?.person;
  const relatives = kase.people.filter((p) => p.role !== "owner");
  const contacts = relatives.flatMap((r) => r.person.contacts);

  const identityConfidence = owner?.identityConfidence ?? 0;
  const deathConfidence = owner?.death?.confidence ?? 0;
  const familyConfidence = relatives.length
    ? Math.min(95, 60 + relatives.length * 10)
    : 0;
  const contactConfidence = contacts.length
    ? Math.max(...contacts.map((c) => c.confidence))
    : 0;

  const accepted = kase.documents.filter((d) => d.status === "ACCEPTED").length;
  const documentationScore = kase.documents.length
    ? Math.round((accepted / kase.documents.length) * 100)
    : 0;
  const probateSimplicity = kase.conflicts.length ? 20 : relatives.length > 3 ? 45 : 75;

  const scored = scoreOpportunity(
    {
      estimatedValueCents: kase.property.estimatedValueCents,
      identityConfidence,
      deathConfidence,
      familyConfidence,
      contactConfidence,
      documentationScore,
      probateSimplicity,
      claimProbability: kase.claims.some((c) => c.status === "APPROVED") ? 90 : 55,
      claimStatus: kase.property.claimStatus,
    },
    {},
  );

  const status = advanceStatus(kase.status, {
    hasIdentity: identityConfidence >= kase.organization.identityThreshold,
    hasDeath: !!owner?.death,
    hasRelative: relatives.length > 0,
    hasContact: contacts.length > 0,
    conflicted: kase.conflicts.length > 0,
  });

  return prisma.case.update({
    where: { id: caseId },
    data: {
      identityConfidence,
      deathConfidence,
      familyConfidence,
      contactConfidence,
      opportunityScore: scored.score,
      queue: scored.queue,
      status,
    },
  });
}

/**
 * Research-stage progression only. Anything from outreach onward requires a
 * human, so those statuses are returned untouched.
 */
function advanceStatus(
  current: CaseStatus,
  f: {
    hasIdentity: boolean;
    hasDeath: boolean;
    hasRelative: boolean;
    hasContact: boolean;
    conflicted: boolean;
  },
): CaseStatus {
  const researchStages: CaseStatus[] = [
    "DISCOVERED",
    "RESEARCHING",
    "IDENTITY_CONFIRMED",
    "DECEASED_VERIFIED",
    "RELATIVES_FOUND",
    "READY_FOR_OUTREACH",
  ];
  if (!researchStages.includes(current)) return current;
  if (f.conflicted) return "RESEARCHING";

  let earned: CaseStatus = "RESEARCHING";
  if (f.hasIdentity) earned = "IDENTITY_CONFIRMED";
  if (f.hasIdentity && f.hasDeath) earned = "DECEASED_VERIFIED";
  if (f.hasIdentity && f.hasDeath && f.hasRelative) earned = "RELATIVES_FOUND";
  if (f.hasIdentity && f.hasDeath && f.hasRelative && f.hasContact) earned = "READY_FOR_OUTREACH";

  return researchStages.indexOf(earned) > researchStages.indexOf(current) ? earned : current;
}
