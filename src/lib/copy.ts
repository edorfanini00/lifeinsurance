import { COMPANY_NAME } from "./constants";

export function propertyMatchNotice(ownerName: string) {
  return `We identified property associated with ${ownerName} that may potentially be claimable by you or the estate. Eligibility must be verified.`;
}

export function initialOutreach(firstName: string, agentName: string) {
  return `Hi ${firstName}, my name is ${agentName} with ${COMPANY_NAME}. During a review of publicly available property records, we identified a record associated with someone who may be related to you. It may involve funds that have not been claimed. We are an independent private recovery company, not a government agency. If you would like, I can provide additional information and explain what we found.`;
}

export const FORBIDDEN_PHRASES = [
  "you inherited",
  "you are entitled",
  "definitely yours",
  "department of financial services",
  "we are with the state",
  "on behalf of florida",
  "naic confirmed",
];

export function assertCompliantCopy(text: string) {
  const lower = text.toLowerCase();
  const hit = FORBIDDEN_PHRASES.find((p) => lower.includes(p));
  if (hit) {
    throw new Error(`Non-compliant copy contains restricted language: "${hit}"`);
  }
}
