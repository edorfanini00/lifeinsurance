import type { InsuranceCategory } from "@prisma/client";
import { INSURANCE_KEYWORDS, INSURER_HOLDERS } from "../../lib/constants";
import { normalizeName } from "../../lib/crypto";

/**
 * NAUPA standard property type codes as adopted in Florida's Unclaimed
 * Property Reporting Instructions Manual. A reported code is authoritative
 * metadata from the holder, so it outranks any keyword guess at description text.
 */
const NAUPA_INSURANCE: Record<
  string,
  { label: string; category: InsuranceCategory; probability: number }
> = {
  IN01: { label: "Individual policy benefits or claim payments", category: "UNKNOWN_INSURANCE_PROPERTY", probability: 92 },
  IN02: { label: "Group policy benefits or claim payments", category: "UNKNOWN_INSURANCE_PROPERTY", probability: 90 },
  IN03: { label: "Death benefits due beneficiaries", category: "DEATH_BENEFITS", probability: 99 },
  IN04: { label: "Proceeds from matured policy or endowment", category: "ANNUITY_PROCEEDS", probability: 96 },
  IN05: { label: "Premium refunds on individual policy", category: "INSURANCE_REFUNDS", probability: 88 },
  IN06: { label: "Unidentified remittances", category: "UNKNOWN_INSURANCE_PROPERTY", probability: 70 },
  IN07: { label: "Other amounts due under policy terms", category: "UNKNOWN_INSURANCE_PROPERTY", probability: 85 },
  IN08: { label: "Agent credit balances", category: "UNKNOWN_INSURANCE_PROPERTY", probability: 80 },
  IN09: { label: "Matured life policy, limiting age reached", category: "DEATH_BENEFITS", probability: 94 },
};

/** Codes that are insurance but are not proceeds payable to an owner or heir. */
const NOT_OWNER_PROCEEDS = new Set(["IN08"]);

export function classifyInsurance(input: {
  holderName?: string | null;
  categoryRaw?: string | null;
  description?: string | null;
  naupaCode?: string | null;
}): { category: InsuranceCategory; probability: number; reasons: string[] } {
  const blob = `${input.holderName || ""} ${input.categoryRaw || ""} ${input.description || ""}`.toLowerCase();
  const reasons: string[] = [];

  const code = detectNaupaCode(input.naupaCode, input.categoryRaw, input.description);
  if (code) {
    const mapped = NAUPA_INSURANCE[code];
    reasons.push(`Holder reported NAUPA type ${code} — ${mapped.label}.`);
    if (NOT_OWNER_PROCEEDS.has(code)) {
      reasons.push(
        "This code is money owed to an insurance agent, not policy proceeds payable to an owner or heir.",
      );
    }
    return { category: mapped.category, probability: mapped.probability, reasons };
  }

  let score = 8;

  const holderNorm = normalizeName(input.holderName || "");
  const insurerHit = INSURER_HOLDERS.some((h) => holderNorm.includes(h));
  if (insurerHit) {
    score += 28;
    reasons.push("Holder name matches a known life/annuity carrier. Company name alone does not prove death benefits.");
  }

  const keywordHits = INSURANCE_KEYWORDS.filter((k) => blob.includes(k));
  score += Math.min(40, keywordHits.length * 14);
  if (keywordHits.length) reasons.push(`Description/type contains: ${keywordHits.join(", ")}.`);

  if (blob.includes("life insurance") || blob.includes("death benefit")) {
    score += 18;
  }
  if (blob.includes("checking") || blob.includes("savings") || blob.includes("utility")) {
    score -= 20;
    reasons.push("Record also resembles a deposit or utility account.");
  }

  const probability = Math.max(0, Math.min(100, score));
  let category: InsuranceCategory = "UNLIKELY_INSURANCE";
  if (blob.includes("death benefit")) category = "DEATH_BENEFITS";
  else if (blob.includes("annuity")) category = "ANNUITY_PROCEEDS";
  else if (blob.includes("refund")) category = "INSURANCE_REFUNDS";
  else if (blob.includes("settlement")) category = "INSURANCE_SETTLEMENT";
  else if (blob.includes("life insurance") || (insurerHit && probability >= 45))
    category = "UNKNOWN_INSURANCE_PROPERTY";
  else if (insurerHit) category = "UNKNOWN_INSURANCE_PROPERTY";

  if (!reasons.length) reasons.push("Insufficient insurance-related metadata.");
  return { category, probability, reasons };
}

function detectNaupaCode(
  explicit?: string | null,
  categoryRaw?: string | null,
  description?: string | null,
) {
  for (const candidate of [explicit, categoryRaw, description]) {
    if (!candidate) continue;
    const match = candidate.toUpperCase().match(/\bIN0[1-9]\b/);
    if (match && NAUPA_INSURANCE[match[0]]) return match[0];
  }
  return null;
}
