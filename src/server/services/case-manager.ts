import type { CaseStatus } from "@prisma/client";

export function nextBestAction(input: {
  status: CaseStatus;
  hasDeath: boolean;
  hasRelative: boolean;
  hasContact: boolean;
  docsRequested: number;
  docsComplete: number;
  hasAgreement: boolean;
  hasRep: boolean;
  conflicts: string[];
}) {
  if (input.conflicts.length) {
    return {
      action: "Route to human review — conflict open",
      reason: `Conflict flags: ${input.conflicts.join(", ")}. Automated outreach is blocked.`,
      missing: ["Conflict resolution note"],
      risk: input.conflicts.join("; "),
      confidence: 90,
    };
  }
  if (!input.hasDeath && ["DISCOVERED", "RESEARCHING", "IDENTITY_CONFIRMED"].includes(input.status)) {
    return {
      action: "Confirm whether the reported owner is deceased using approved sources",
      reason: "Death status changes the research path (estate / relative vs. living owner).",
      missing: ["Sourced death record or living-owner confirmation"],
      risk: "Do not mark deceased without evidence.",
      confidence: 78,
    };
  }
  if (input.hasDeath && !input.hasRelative) {
    return {
      action: "Expand family graph from obituary and probate fixtures/providers",
      reason: "A relative or personal representative is required before outreach can be considered.",
      missing: ["Known relative", "Personal representative if public"],
      risk: "Name-only matches must not be merged.",
      confidence: 74,
    };
  }
  if (input.hasRelative && !input.hasContact) {
    return {
      action: "Enrich contact data for the strongest living relative via a permitted provider",
      reason: "Contactability is required before a first-touch draft is useful.",
      missing: ["Phone or email with provenance"],
      risk: "Do not use leaked or DNC-prohibited data.",
      confidence: 80,
    };
  }
  if (input.hasContact && !["CONTACTED", "RESPONDED", "QUALIFIED"].includes(input.status) && input.status !== "READY_FOR_OUTREACH") {
    return {
      action: "Human review of identity packet, then draft first outreach",
      reason: "Default automation is research + draft. First send requires approval.",
      missing: ["First-outbound approval"],
      risk: "Do not disclose value or account numbers on first touch.",
      confidence: 86,
    };
  }
  if (!input.hasAgreement && ["QUALIFIED", "AGREEMENT_PENDING"].includes(input.status)) {
    return {
      action: "Prepare DFS-UP-309 Unclaimed Property Recovery Agreement",
      reason: "Florida-held accounts require the official recovery agreement. Substitute contingency contracts are void.",
      missing: ["DFS-UP-309 execution"],
      risk: "Fee may not exceed the configured 30% cap.",
      confidence: 88,
    };
  }
  if (input.hasAgreement && input.docsComplete < input.docsRequested) {
    return {
      action: "Request certified death certificate and remaining DFS evidence",
      reason: "DFS requires documentation establishing identity, death, and entitlement before an estate-based claim can proceed.",
      missing: ["Death certificate", "Proof of relationship or letters of administration"],
      risk: "Possible additional heirs not yet interviewed.",
      confidence: 84,
    };
  }
  if (!input.hasRep && ["CLAIM_READY", "DOCUMENTS_COMPLETE"].includes(input.status)) {
    return {
      action: "Attach a valid Florida claimant representative",
      reason: "AI and unqualified staff cannot file as the statutory representative.",
      missing: ["Active DFS-registered representative"],
      risk: "Submission will be blocked until registration is valid.",
      confidence: 92,
    };
  }
  return {
    action: "Continue current stage; re-score after new evidence",
    reason: "No higher-priority blocker from structured case data.",
    missing: [],
    risk: "Eligibility remains unverified.",
    confidence: 60,
  };
}
