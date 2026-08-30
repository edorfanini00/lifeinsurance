import type { OpportunityQueue, ScoringWeightSet } from "@prisma/client";

export type ScoreInput = {
  estimatedValueCents: number | null;
  identityConfidence: number;
  deathConfidence: number;
  familyConfidence: number;
  contactConfidence: number;
  documentationScore: number;
  probateSimplicity: number;
  claimProbability: number;
  claimStatus?: string;
};

const DEFAULT = {
  valueWeight: 30,
  identityWeight: 20,
  familyWeight: 15,
  contactWeight: 10,
  documentationWeight: 10,
  probateWeight: 10,
  claimWeight: 5,
};

export function scoreOpportunity(input: ScoreInput, weights: Partial<ScoringWeightSet> = {}) {
  const w = { ...DEFAULT, ...weights };
  const valuePts = valuePoints(input.estimatedValueCents) * (w.valueWeight / 30);
  const identity = (input.identityConfidence / 100) * w.identityWeight;
  const family = (input.familyConfidence / 100) * w.familyWeight;
  const contact = (input.contactConfidence / 100) * w.contactWeight;
  const docs = (input.documentationScore / 100) * w.documentationWeight;
  const probate = (input.probateSimplicity / 100) * w.probateWeight;
  let claim = (input.claimProbability / 100) * w.claimWeight;
  if (input.claimStatus === "CLAIMED" || input.claimStatus === "PAID") claim = 0;

  const total = Math.round(
    Math.max(0, Math.min(100, valuePts + identity + family + contact + docs + probate + claim)),
  );
  return { score: total, queue: queueFor(total), parts: { valuePts, identity, family, contact, docs, probate, claim } };
}

function valuePoints(cents: number | null) {
  if (cents == null) return 10;
  const dollars = cents / 100;
  if (dollars >= 50000) return 30;
  if (dollars >= 15000) return 24;
  if (dollars >= 5000) return 18;
  if (dollars >= 1000) return 12;
  return 6;
}

export function queueFor(score: number): OpportunityQueue {
  if (score >= 80) return "HOT";
  if (score >= 65) return "GOOD";
  if (score >= 40) return "RESEARCH";
  return "LOW_PRIORITY";
}
