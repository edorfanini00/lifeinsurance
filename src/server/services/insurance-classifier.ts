import type { InsuranceCategory } from "@prisma/client";
import { INSURANCE_KEYWORDS, INSURER_HOLDERS } from "../../lib/constants";
import { normalizeName } from "../../lib/crypto";

export function classifyInsurance(input: {
  holderName?: string | null;
  categoryRaw?: string | null;
  description?: string | null;
}): { category: InsuranceCategory; probability: number; reasons: string[] } {
  const blob = `${input.holderName || ""} ${input.categoryRaw || ""} ${input.description || ""}`.toLowerCase();
  const reasons: string[] = [];
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
