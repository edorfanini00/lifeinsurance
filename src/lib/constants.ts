export const COMPANY_NAME =
  process.env.NEXT_PUBLIC_COMPANY_NAME || "Lifey Recovery LLC";

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "lifey";

export const DEFAULT_FEE_PERCENT = Number(process.env.MAX_FEE_PERCENT || 30);

export const STAFF_HOME = "/dashboard";
export const PORTAL_HOME = "/portal";

export const INSURER_HOLDERS = [
  "METLIFE",
  "METROPOLITAN LIFE",
  "PRUDENTIAL",
  "NEW YORK LIFE",
  "NORTHWESTERN MUTUAL",
  "MASSMUTUAL",
  "MASS MUTUAL",
  "LINCOLN FINANCIAL",
  "LINCOLN NATIONAL",
  "GUARDIAN",
  "TRANSAMERICA",
  "JOHN HANCOCK",
  "AIG",
  "COREBRIDGE",
  "NATIONWIDE",
];

export const INSURANCE_KEYWORDS = [
  "life insurance",
  "death benefit",
  "annuity",
  "insurance proceeds",
  "policy",
  "beneficiary",
  "settlement",
  "premium refund",
];

export const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/research", label: "Research" },
  { href: "/people", label: "People" },
  { href: "/outreach", label: "Outreach" },
  { href: "/automation", label: "Automation" },
  { href: "/cases", label: "Cases" },
  { href: "/claims", label: "Claims" },
  { href: "/tasks", label: "Tasks" },
  { href: "/analytics", label: "Analytics" },
  { href: "/compliance", label: "Compliance" },
  { href: "/settings", label: "Settings" },
] as const;

export const CASE_COLUMNS: { status: string; label: string }[] = [
  { status: "DISCOVERED", label: "Discovered" },
  { status: "RESEARCHING", label: "Researching" },
  { status: "READY_FOR_OUTREACH", label: "Ready" },
  { status: "CONTACTED", label: "Contacted" },
  { status: "AGREEMENT_SIGNED", label: "Contracted" },
  { status: "CLAIM_SUBMITTED", label: "Submitted" },
  { status: "APPROVED", label: "Approved" },
];
