import { prisma } from "@/lib/db";
import { CaseStatus } from "@prisma/client";

const RESEARCHED: CaseStatus[] = [
  "IDENTITY_CONFIRMED",
  "DECEASED_VERIFIED",
  "RELATIVES_FOUND",
  "READY_FOR_OUTREACH",
  "CONTACTED",
  "RESPONDED",
  "QUALIFIED",
  "AGREEMENT_PENDING",
  "AGREEMENT_SIGNED",
  "DOCUMENTS_REQUESTED",
  "DOCUMENTS_PARTIAL",
  "DOCUMENTS_COMPLETE",
  "CLAIM_READY",
  "CLAIM_SUBMITTED",
  "DFS_REVIEW",
  "ADDITIONAL_DOCUMENTATION_REQUESTED",
  "APPROVED",
  "PAYMENT_PENDING",
  "PAID",
  "FEE_RECEIVED",
  "CLOSED",
];

const CONTACTED: CaseStatus[] = [
  "CONTACTED",
  "RESPONDED",
  "QUALIFIED",
  "AGREEMENT_PENDING",
  "AGREEMENT_SIGNED",
  "DOCUMENTS_REQUESTED",
  "DOCUMENTS_PARTIAL",
  "DOCUMENTS_COMPLETE",
  "CLAIM_READY",
  "CLAIM_SUBMITTED",
  "DFS_REVIEW",
  "ADDITIONAL_DOCUMENTATION_REQUESTED",
  "APPROVED",
  "PAYMENT_PENDING",
  "PAID",
  "FEE_RECEIVED",
  "CLOSED",
];

const CONTRACTED: CaseStatus[] = [
  "AGREEMENT_SIGNED",
  "DOCUMENTS_REQUESTED",
  "DOCUMENTS_PARTIAL",
  "DOCUMENTS_COMPLETE",
  "CLAIM_READY",
  "CLAIM_SUBMITTED",
  "DFS_REVIEW",
  "ADDITIONAL_DOCUMENTATION_REQUESTED",
  "APPROVED",
  "PAYMENT_PENDING",
  "PAID",
  "FEE_RECEIVED",
  "CLOSED",
];

const SUBMITTED: CaseStatus[] = [
  "CLAIM_SUBMITTED",
  "DFS_REVIEW",
  "ADDITIONAL_DOCUMENTATION_REQUESTED",
  "APPROVED",
  "PAYMENT_PENDING",
  "PAID",
  "FEE_RECEIVED",
  "CLOSED",
];

const APPROVED: CaseStatus[] = ["APPROVED", "PAYMENT_PENDING", "PAID", "FEE_RECEIVED", "CLOSED"];

export async function dashboardMetrics(organizationId: string) {
  const cases = await prisma.case.findMany({
    where: { organizationId },
    include: {
      property: { include: { holder: true } },
      people: { include: { person: { include: { death: true, contacts: true } } } },
      communications: true,
      agreements: true,
      claims: { include: { payments: { include: { fees: true } } } },
    },
  });

  const sum = (list: typeof cases) =>
    list.reduce((acc, c) => acc + (c.property.estimatedValueCents || 0), 0);

  const identified = sum(cases);
  const researched = sum(cases.filter((c) => RESEARCHED.includes(c.status)));
  const contacted = sum(cases.filter((c) => CONTACTED.includes(c.status)));
  const contracted = sum(cases.filter((c) => CONTRACTED.includes(c.status)));
  const submitted = sum(cases.filter((c) => SUBMITTED.includes(c.status)));
  const approved = sum(cases.filter((c) => APPROVED.includes(c.status)));
  const feeRevenue = cases.reduce((acc, c) => {
    const fees = c.claims.flatMap((cl) => cl.payments.flatMap((p) => p.fees));
    return acc + fees.reduce((a, f) => a + (f.collectedAt ? f.amountCents : 0), 0);
  }, 0);
  const expectedFees = cases
    .filter((c) => APPROVED.includes(c.status))
    .reduce((acc, c) => acc + Math.round(((c.property.estimatedValueCents || 0) * 30) / 100), 0);

  const outreachSent = cases.reduce((a, c) => a + c.communications.filter((x) => x.status === "SENT").length, 0);
  const responded = cases.filter((c) =>
    ["RESPONDED", "QUALIFIED", "AGREEMENT_PENDING", "AGREEMENT_SIGNED"].includes(c.status) ||
    CONTRACTED.includes(c.status),
  ).length;

  return {
    counts: {
      properties: cases.length,
      insuranceRelated: cases.filter((c) => c.property.insuranceProbability >= 45).length,
      deceased: cases.filter((c) => c.people.some((p) => p.person.death)).length,
      relatives: cases.filter((c) => c.people.some((p) => p.role !== "owner")).length,
      contacts: cases.filter((c) => c.people.some((p) => p.person.contacts.length)).length,
      outreachSent,
      qualified: cases.filter((c) => ["QUALIFIED", ...CONTRACTED].includes(c.status)).length,
      agreements: cases.filter((c) => c.agreements.some((a) => a.executedAt)).length,
      submitted: cases.filter((c) => SUBMITTED.includes(c.status)).length,
      approved: cases.filter((c) => APPROVED.includes(c.status)).length,
    },
    pipeline: {
      identified,
      researched,
      contacted,
      contracted,
      submitted,
      approved,
      feeRevenue: feeRevenue || expectedFees,
    },
    rates: {
      response: outreachSent ? Math.round((responded / outreachSent) * 100) : 0,
      conversion: cases.length ? Math.round((cases.filter((c) => APPROVED.includes(c.status)).length / cases.length) * 100) : 0,
    },
    cases,
  };
}
