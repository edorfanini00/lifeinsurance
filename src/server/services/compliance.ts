import type {
  AutomationLevel,
  Case,
  CommunicationChannel,
  ComplianceDecision,
  ConflictFlag,
  Representative,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashLookup } from "@/lib/crypto";
import { DEFAULT_FEE_PERCENT } from "@/lib/constants";
import { FORBIDDEN_PHRASES } from "@/lib/copy";

export type ComplianceAction =
  | "FIRST_OUTREACH"
  | "FOLLOW_UP"
  | "DISCLOSE_VALUE"
  | "DISCLOSE_ACCOUNT"
  | "SEND_MESSAGE"
  | "SUBMIT_CLAIM"
  | "COLLECT_FEE"
  | "EXECUTE_AGREEMENT"
  | "CHANGE_CLAIMANT"
  | "MARK_DECEASED"
  | "CLOSE_DISPUTED"
  | "NAIC_LOCATOR";

export type ComplianceResult = {
  decision: ComplianceDecision;
  reasons: string[];
};

const HUMAN_GATED: ComplianceAction[] = [
  "FIRST_OUTREACH",
  "DISCLOSE_VALUE",
  "DISCLOSE_ACCOUNT",
  "SUBMIT_CLAIM",
  "EXECUTE_AGREEMENT",
  "CHANGE_CLAIMANT",
  "CLOSE_DISPUTED",
  "NAIC_LOCATOR",
];

export async function validateAction(input: {
  action: ComplianceAction;
  caseId: string;
  channel?: CommunicationChannel;
  destination?: string;
  body?: string;
  feePercent?: number;
}): Promise<ComplianceResult> {
  const reasons: string[] = [];
  let decision: ComplianceDecision = "ALLOWED";

  const kase = await prisma.case.findUnique({
    where: { id: input.caseId },
    include: {
      conflicts: { where: { open: true } },
      representative: true,
      organization: true,
      property: true,
      claims: true,
    },
  });
  if (!kase) return { decision: "BLOCKED", reasons: ["Case not found."] };

  const orgLevel = kase.organization.automationLevel;
  applyAutomation(orgLevel, input.action, reasons, (d) => (decision = worse(decision, d)));

  if (HUMAN_GATED.includes(input.action) && !kase.outreachApproved && input.action === "FIRST_OUTREACH") {
    decision = worse(decision, "REQUIRES_HUMAN_REVIEW");
    reasons.push("First outbound communication requires human approval.");
  }

  if (input.action === "FIRST_OUTREACH" && kase.identityConfidence < kase.organization.identityThreshold) {
    decision = worse(decision, "REQUIRES_HUMAN_REVIEW");
    reasons.push(
      `Identity confidence ${kase.identityConfidence} is below threshold ${kase.organization.identityThreshold}.`,
    );
  }

  blockConflicts(kase.conflicts, input.action, reasons, (d) => (decision = worse(decision, d)));

  if (input.destination && input.channel) {
    const suppressed = await prisma.suppressionEntry.findUnique({
      where: {
        channel_valueHash: { channel: input.channel, valueHash: hashLookup(input.destination) },
      },
    });
    if (suppressed) {
      decision = worse(decision, "BLOCKED");
      reasons.push(`Suppressed: ${suppressed.reason}.`);
    }
  }

  if (input.body) {
    const lower = input.body.toLowerCase();
    for (const phrase of FORBIDDEN_PHRASES) {
      if (lower.includes(phrase)) {
        decision = worse(decision, "BLOCKED");
        reasons.push(`Copy contains restricted language (“${phrase}”).`);
      }
    }
    if (input.action === "FIRST_OUTREACH") {
      if (/\$\s*\d/.test(input.body) || /\baccount\b/i.test(input.body)) {
        decision = worse(decision, "BLOCKED");
        reasons.push("Initial outreach must not reveal amounts or account identifiers.");
      }
    }
  }

  if (input.action === "SUBMIT_CLAIM") {
    const rep = kase.representative;
    if (!repValid(rep)) {
      decision = worse(decision, "BLOCKED");
      reasons.push("No valid Florida claimant representative (attorney, CPA, or Class C PI) with current DFS registration.");
    }
  }

  if (input.action === "EXECUTE_AGREEMENT") {
    if (kase.property.heldByState && kase.property.jurisdiction === "FL") {
      reasons.push("Florida-held property must use DFS Unclaimed Property Recovery Agreement (DFS-UP-309), not a substitute contract.");
    }
    const fee = input.feePercent ?? kase.organization.maxFeePercent;
    const cap = Math.min(kase.organization.maxFeePercent, DEFAULT_FEE_PERCENT);
    if (fee > cap) {
      decision = worse(decision, "BLOCKED");
      reasons.push(`Fee ${fee}% exceeds configured statutory cap ${cap}%.`);
    }
  }

  if (input.action === "COLLECT_FEE") {
    const approved = kase.claims.some((c) => c.status === "APPROVED");
    if (kase.property.heldByState && kase.property.jurisdiction === "FL" && !approved) {
      decision = worse(decision, "BLOCKED");
      reasons.push("Fla. Stat. § 717.135(5): fees only after a filed claim is approved.");
    }
  }

  if (input.action === "NAIC_LOCATOR") {
    decision = worse(decision, "REQUIRES_HUMAN_REVIEW");
    reasons.push("NAIC locator may run only after an authorized person supplies required information. No auto-submit.");
  }

  if (input.action === "MARK_DECEASED") {
    const death = await prisma.deathRecord.findFirst({
      where: { person: { casePeople: { some: { caseId: kase.id, role: "owner" } } } },
    });
    if (!death) {
      decision = worse(decision, "BLOCKED");
      reasons.push("Cannot mark deceased without a death record backed by evidence.");
    }
  }

  if (!reasons.length) reasons.push("No compliance blockers.");
  return { decision, reasons };
}

function repValid(rep: Representative | null) {
  if (!rep) return false;
  if (rep.status !== "ACTIVE") return false;
  if (!rep.dfsRegistered) return false;
  if (rep.registrationExpires && rep.registrationExpires < new Date()) return false;
  return true;
}

function blockConflicts(
  flags: ConflictFlag[],
  action: ComplianceAction,
  reasons: string[],
  set: (d: ComplianceDecision) => void,
) {
  if (!flags.length) return;
  const outbound = action === "FIRST_OUTREACH" || action === "FOLLOW_UP" || action === "SEND_MESSAGE";
  if (outbound) {
    set("BLOCKED");
    reasons.push(`Open conflict(s) block automated outreach: ${flags.map((f) => f.type).join(", ")}.`);
  }
}

function applyAutomation(
  level: AutomationLevel,
  action: ComplianceAction,
  reasons: string[],
  set: (d: ComplianceDecision) => void,
) {
  if (level === "RESEARCH_ONLY" && action !== "MARK_DECEASED") {
    if (action.includes("OUTREACH") || action === "SEND_MESSAGE" || action === "FOLLOW_UP") {
      set("BLOCKED");
      reasons.push("Automation level is Research only.");
    }
  }
  if (level === "RESEARCH_AND_DRAFT" && (action === "SEND_MESSAGE" || action === "FOLLOW_UP" || action === "FIRST_OUTREACH")) {
    set("REQUIRES_HUMAN_REVIEW");
    reasons.push("Default automation drafts outreach only; sending requires a human.");
  }
}

function worse(current: ComplianceDecision, next: ComplianceDecision): ComplianceDecision {
  const rank = { ALLOWED: 0, REQUIRES_HUMAN_REVIEW: 1, BLOCKED: 2 };
  return rank[next] > rank[current] ? next : current;
}
