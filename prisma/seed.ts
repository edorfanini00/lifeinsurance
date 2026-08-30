import {
  PrismaClient,
  CaseStatus,
  OpportunityQueue,
  InsuranceCategory,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { classifyInsurance } from "../src/server/services/insurance-classifier";
import { scoreOpportunity } from "../src/server/services/opportunity-scoring";
import { nextBestAction } from "../src/server/services/case-manager";
import { encryptPii, hashLookup, normalizeName } from "../src/lib/crypto";

const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.aiFinding.deleteMany();
  await prisma.aiResearchRun.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.fee.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.claimEvent.deleteMany();
  await prisma.claim.deleteMany();
  await prisma.agreement.deleteMany();
  await prisma.documentAccessLog.deleteMany();
  await prisma.document.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.task.deleteMany();
  await prisma.conflictFlag.deleteMany();
  await prisma.casePerson.deleteMany();
  await prisma.case.deleteMany();
  await prisma.estate.deleteMany();
  await prisma.probateCase.deleteMany();
  await prisma.contactMethod.deleteMany();
  await prisma.relationship.deleteMany();
  await prisma.deathRecord.deleteMany();
  await prisma.address.deleteMany();
  await prisma.personAlias.deleteMany();
  await prisma.propertyOwner.deleteMany();
  await prisma.property.deleteMany();
  await prisma.holder.deleteMany();
  await prisma.sourceEvidence.deleteMany();
  await prisma.source.deleteMany();
  await prisma.suppressionEntry.deleteMany();
  await prisma.outreachStepTemplate.deleteMany();
  await prisma.outreachSequenceTemplate.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.representative.deleteMany();
  await prisma.scoringWeightSet.deleteMany();
  await prisma.complianceRuleSet.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: {
      name: "lifey",
      legalName: "Lifey Recovery LLC",
      publicDisclosure:
        "Lifey Recovery LLC is an independent private recovery company. We are not a government agency, not the Florida Department of Financial Services, and not affiliated with any insurer unless a specific written appointment exists.",
      website: "https://lifey.example",
      phone: "(850) 555-0100",
      email: "intake@lifey.example",
      addressLine1: "200 E Gaines St, Suite 400",
      city: "Tallahassee",
      state: "FL",
      zip: "32301",
      automationLevel: "RESEARCH_AND_DRAFT",
      maxFeePercent: 30,
      identityThreshold: 70,
    },
  });

  const passwordHash = await bcrypt.hash("lifey-demo", 10);
  const portalHash = await bcrypt.hash("portal-demo", 10);

  const maria = await prisma.user.create({
    data: {
      organizationId: org.id,
      kind: "STAFF",
      role: "LICENSED_REPRESENTATIVE",
      email: "maria@lifey.local",
      name: "Maria Delgado",
      passwordHash,
    },
  });
  const alex = await prisma.user.create({
    data: {
      organizationId: org.id,
      kind: "STAFF",
      role: "RESEARCHER",
      email: "alex@lifey.local",
      name: "Alex Chen",
      passwordHash,
    },
  });
  await prisma.user.create({
    data: {
      organizationId: org.id,
      kind: "STAFF",
      role: "COMPLIANCE",
      email: "claire@lifey.local",
      name: "Claire Nguyen",
      passwordHash,
    },
  });

  const representative = await prisma.representative.create({
    data: {
      organizationId: org.id,
      name: "Maria Delgado",
      type: "FLORIDA_CLASS_C_PI",
      licenseNumber: "C-2600148",
      dfsRegistered: true,
      dfsRegistrationId: "DFS-CR-88421",
      registrationExpires: new Date("2027-03-31"),
      employingOrg: "Lifey Recovery LLC",
      status: "ACTIVE",
    },
  });

  await prisma.scoringWeightSet.create({
    data: { organizationId: org.id, version: 1, active: true, approvedAt: new Date() },
  });
  await prisma.complianceRuleSet.create({
    data: {
      organizationId: org.id,
      version: 1,
      active: true,
      maxFeePercent: 30,
      notes: "Initialized to Fla. Stat. § 717.135(2)(j) 30% cap. Changes require compliance approval.",
      approvedAt: new Date(),
    },
  });

  await prisma.outreachSequenceTemplate.create({
    data: {
      organizationId: org.id,
      name: "Florida first-touch (default)",
      steps: {
        create: [
          { dayOffset: 1, order: 1, channel: "EMAIL", templateBody: "Day 1 email — no amount, no account number." },
          { dayOffset: 2, order: 2, channel: "PHONE", templateBody: "Day 2 licensed-rep call task." },
          { dayOffset: 4, order: 3, channel: "SMS", templateBody: "Day 4 SMS — identity of company only." },
          { dayOffset: 7, order: 4, channel: "EMAIL", templateBody: "Day 7 follow-up email." },
          { dayOffset: 14, order: 5, channel: "LETTER", templateBody: "Day 14 letter." },
          { dayOffset: 21, order: 6, channel: "EMAIL", templateBody: "Day 21 final follow-up." },
        ],
      },
    },
  });

  const dfs = await prisma.source.create({
    data: {
      organizationId: org.id,
      adapterId: "florida-dfs-import",
      name: "Florida DFS file import",
      jurisdiction: "FL",
      legalNotes: "Operator-supplied extract. Not a live UPMIS session.",
    },
  });
  const obit = await prisma.source.create({
    data: {
      organizationId: org.id,
      adapterId: "fixture-public-records",
      name: "Approved public-record fixtures",
      jurisdiction: "FL",
      legalNotes: "Demo fixtures standing in for licensed obituary/probate providers.",
    },
  });

  const holders = await Promise.all(
    [
      ["Metropolitan Life Insurance Company", true],
      ["Prudential Insurance Company of America", true],
      ["Bank of America, N.A.", false],
      ["Duke Energy Florida", false],
      ["New York Life Insurance Company", true],
      ["Lincoln National Life Insurance Company", true],
    ].map(([name, known]) =>
      prisma.holder.create({
        data: { name: String(name), normalizedName: normalizeName(String(name)), knownInsurer: Boolean(known) },
      }),
    ),
  );

  const ev = async (sourceId: string, field: string, raw: string, url: string | null, interpretation: string) =>
    prisma.sourceEvidence.create({
      data: {
        sourceId,
        field,
        rawValue: raw,
        url,
        retrievedAt: new Date("2026-03-12"),
        interpretation,
        findingKind: "FACT",
      },
    });

  type SeedCase = {
    account: string;
    owner: string;
    city: string;
    zip: string;
    holder: (typeof holders)[number];
    category: string;
    description: string;
    year: number;
    value: number | null;
    status: CaseStatus;
    deceased?: boolean;
    relative?: boolean;
    contact?: boolean;
    agreement?: boolean;
    submitted?: boolean;
    approved?: boolean;
    conflict?: boolean;
  };

  const specs: SeedCase[] = [
    {
      account: "FL-UP-4481920",
      owner: "John A. Smith",
      city: "Tampa",
      zip: "33602",
      holder: holders[0],
      category: "Insurance proceeds",
      description: "Life insurance related proceeds reported after inactivity",
      year: 2021,
      value: 4820000,
      status: "READY_FOR_OUTREACH",
      deceased: true,
      relative: true,
      contact: true,
    },
    {
      account: "FL-UP-5510033",
      owner: "Rosa M. Alvarez",
      city: "Miami",
      zip: "33125",
      holder: holders[1],
      category: "Death benefit",
      description: "Death benefit check outstanding",
      year: 2020,
      value: 9100000,
      status: "AGREEMENT_SIGNED",
      deceased: true,
      relative: true,
      contact: true,
      agreement: true,
    },
    {
      account: "FL-UP-2201988",
      owner: "James E. Porter",
      city: "Jacksonville",
      zip: "32202",
      holder: holders[4],
      category: "Annuity proceeds",
      description: "Annuity proceeds — uncashed",
      year: 2018,
      value: 2750000,
      status: "CLAIM_SUBMITTED",
      deceased: true,
      relative: true,
      contact: true,
      agreement: true,
      submitted: true,
    },
    {
      account: "FL-UP-8831001",
      owner: "Helen G. Brooks",
      city: "Orlando",
      zip: "32801",
      holder: holders[5],
      category: "Insurance settlement",
      description: "Settlement payment reported to state",
      year: 2019,
      value: 18800000,
      status: "APPROVED",
      deceased: true,
      relative: true,
      contact: true,
      agreement: true,
      submitted: true,
      approved: true,
    },
    {
      account: "FL-UP-1002204",
      owner: "Robert J. Keene",
      city: "Tallahassee",
      zip: "32301",
      holder: holders[2],
      category: "Checking",
      description: "Dormant checking account",
      year: 2022,
      value: 240000,
      status: "RESEARCHING",
    },
    {
      account: "FL-UP-7732109",
      owner: "Patricia L. Nguyen",
      city: "St. Petersburg",
      zip: "33701",
      holder: holders[3],
      category: "Utility deposit",
      description: "Utility deposit refund",
      year: 2023,
      value: 18000,
      status: "DISCOVERED",
    },
    {
      account: "FL-UP-6621094",
      owner: "Samuel D. Ortiz",
      city: "Fort Lauderdale",
      zip: "33301",
      holder: holders[0],
      category: "Unknown",
      description: "Uncashed check — Metropolitan Life",
      year: 2017,
      value: 1540000,
      status: "CONTACTED",
      deceased: true,
      relative: true,
      contact: true,
    },
    {
      account: "FL-UP-4091288",
      owner: "Evelyn R. Hart",
      city: "Gainesville",
      zip: "32601",
      holder: holders[1],
      category: "Life insurance proceeds",
      description: "Policy proceeds — reported owner deceased",
      year: 2016,
      value: 6100000,
      status: "DISPUTED",
      deceased: true,
      relative: true,
      contact: true,
      conflict: true,
    },
  ];

  let n = 0;
  let featuredCaseId = "";
  let michaelPersonId = "";

  for (const spec of specs) {
    n += 1;
    const classified = classifyInsurance({
      holderName: spec.holder.name,
      categoryRaw: spec.category,
      description: spec.description,
    });
    const evProp = await ev(
      dfs.id,
      "property_record",
      JSON.stringify(spec),
      "https://www.fltreasurehunt.gov",
      "Imported Florida unclaimed-property record. Match ≠ entitlement.",
    );
    const property = await prisma.property.create({
      data: {
        organizationId: org.id,
        accountNumber: spec.account,
        holderId: spec.holder.id,
        ownerNameRaw: spec.owner,
        reportedAddress: `reported address on file, ${spec.city}`,
        city: spec.city,
        state: "FL",
        zip: spec.zip,
        categoryRaw: spec.category,
        description: spec.description,
        reportingYear: spec.year,
        reportedOwnerStatus: spec.deceased ? "REPORTED_DECEASED" : "APPARENT_OWNER",
        estimatedValueCents: spec.value,
        valueKnown: spec.value != null,
        retrievedAt: new Date("2026-03-01"),
        insuranceCategory: classified.category as InsuranceCategory,
        insuranceProbability: classified.probability,
        evidence: { connect: { id: evProp.id } },
      },
    });

    const owner = await prisma.person.create({
      data: {
        organizationId: org.id,
        canonicalFullName: spec.owner,
        normalizedName: normalizeName(spec.owner),
        lastKnownAddress: `${spec.city}, FL ${spec.zip}`,
        county: countyFor(spec.city),
        identityConfidence: spec.deceased ? 92 : 42,
        livingStatus: spec.deceased ? "DECEASED" : "UNKNOWN",
        estimatedAge: spec.deceased ? 71 : 64,
      },
    });
    await prisma.propertyOwner.create({
      data: { propertyId: property.id, personId: owner.id, role: "owner", confidence: spec.deceased ? 88 : 42 },
    });

    if (spec.deceased) {
      const evDeath = await ev(
        obit.id,
        "obituary",
        `Obituary fixture for ${spec.owner}`,
        "https://example.invalid/obituaries/" + spec.account,
        "Published death notice. Not a legal entitlement finding.",
      );
      await prisma.deathRecord.create({
        data: {
          personId: owner.id,
          dateOfDeath: new Date("2019-06-04"),
          location: `${spec.city}, Florida`,
          obituaryUrl: "https://example.invalid/obituaries/" + spec.account,
          probateCounty: countyFor(spec.city),
          confidence: 90,
          evidence: { connect: { id: evDeath.id } },
        },
      });
    }

    let relativeId: string | undefined;
    if (spec.relative) {
      const relName = spec.account === "FL-UP-4481920" ? "Michael Smith" : `${spec.owner.split(" ")[0]} child`;
      const relative = await prisma.person.create({
        data: {
          organizationId: org.id,
          canonicalFullName: relName,
          normalizedName: normalizeName(relName),
          lastKnownAddress: spec.account === "FL-UP-4481920" ? "Orlando, FL" : `${spec.city}, FL`,
          county: spec.account === "FL-UP-4481920" ? "Orange" : countyFor(spec.city),
          identityConfidence: 91,
          livingStatus: "LIKELY_LIVING",
          estimatedAge: 44,
        },
      });
      relativeId = relative.id;
      if (spec.account === "FL-UP-4481920") michaelPersonId = relative.id;

      const evRel = await ev(
        obit.id,
        "relationship",
        `${spec.owner} father_of ${relName}`,
        "https://example.invalid/obituaries/" + spec.account,
        "Obituary lists this person as a child. Category remains KNOWN_RELATIVE until entitlement is verified.",
      );
      await prisma.relationship.create({
        data: {
          fromPersonId: owner.id,
          toPersonId: relative.id,
          type: "CHILD",
          confidence: 94,
          evidence: { connect: { id: evRel.id } },
        },
      });
      if (spec.contact) {
        const phone = spec.account === "FL-UP-4481920" ? "(407) 555-0148" : "(305) 555-0199";
        const email =
          spec.account === "FL-UP-4481920"
            ? "michael.smith@example.com"
            : `${relName.split(" ")[0].toLowerCase()}@example.com`;
        const evC = await ev(obit.id, "phone", phone, null, "Public professional listing. Provenance stored.");
        await prisma.contactMethod.create({
          data: {
            personId: relative.id,
            channel: "PHONE",
            valueEnc: encryptPii(phone),
            valueHash: hashLookup(phone),
            confidence: 91,
            evidence: { connect: { id: evC.id } },
          },
        });
        await prisma.contactMethod.create({
          data: {
            personId: relative.id,
            channel: "EMAIL",
            valueEnc: encryptPii(email),
            valueHash: hashLookup(email),
            confidence: 88,
          },
        });
      }
    }

    const scored = scoreOpportunity({
      estimatedValueCents: spec.value,
      identityConfidence: spec.deceased ? 92 : 42,
      deathConfidence: spec.deceased ? 90 : 0,
      familyConfidence: spec.relative ? 88 : 0,
      contactConfidence: spec.contact ? 86 : 0,
      documentationScore: spec.agreement ? 70 : 15,
      probateSimplicity: spec.conflict ? 20 : 75,
      claimProbability: spec.approved ? 90 : 55,
    });

    const nba = nextBestAction({
      status: spec.status,
      hasDeath: !!spec.deceased,
      hasRelative: !!spec.relative,
      hasContact: !!spec.contact,
      docsRequested: spec.agreement ? 4 : 0,
      docsComplete: spec.submitted ? 4 : spec.agreement ? 1 : 0,
      hasAgreement: !!spec.agreement,
      hasRep: true,
      conflicts: spec.conflict ? ["MULTIPLE_ASSERTING_HEIRS"] : [],
    });

    const kase = await prisma.case.create({
      data: {
        organizationId: org.id,
        caseNumber: `LY-FL-${String(n).padStart(5, "0")}`,
        status: spec.status,
        propertyId: property.id,
        assigneeId: spec.deceased ? maria.id : alex.id,
        representativeId: spec.agreement ? representative.id : null,
        opportunityScore: spec.account === "FL-UP-4481920" ? 91 : scored.score,
        queue: (spec.account === "FL-UP-4481920" ? "HOT" : scored.queue) as OpportunityQueue,
        identityConfidence: spec.deceased ? 92 : 42,
        deathConfidence: spec.deceased ? 90 : 0,
        familyConfidence: spec.relative ? 88 : 0,
        contactConfidence: spec.contact ? 86 : 0,
        nextAction:
          spec.account === "FL-UP-4481920"
            ? "Licensed representative review, then compliant first-touch draft"
            : nba.action,
        nextActionReason:
          spec.account === "FL-UP-4481920"
            ? "High-confidence identity, death, relationship, and contact packet. Eligibility is still unverified."
            : nba.reason,
        riskFlags: spec.conflict ? "Second relative asserting entitlement" : nba.risk,
        aiConfidence: nba.confidence,
        outreachApproved:
          spec.status !== "READY_FOR_OUTREACH" &&
          !!spec.contact &&
          spec.status !== "RESEARCHING" &&
          spec.status !== "DISCOVERED",
      },
    });

    await prisma.casePerson.create({ data: { caseId: kase.id, personId: owner.id, role: "owner" } });
    if (relativeId) {
      await prisma.casePerson.create({
        data: {
          caseId: kase.id,
          personId: relativeId,
          role: "relative",
          claimantCategory:
            spec.approved
              ? "CONFIRMED_CLAIMANT"
              : spec.account === "FL-UP-4481920"
                ? "PERSONAL_REPRESENTATIVE"
                : "KNOWN_RELATIVE",
          isPrimaryContact: true,
        },
      });
    }

    if (spec.account === "FL-UP-4481920") {
      featuredCaseId = kase.id;
      const jessica = await prisma.person.create({
        data: {
          organizationId: org.id,
          canonicalFullName: "Jessica Brown",
          normalizedName: normalizeName("Jessica Brown"),
          lastKnownAddress: "Tampa, FL",
          livingStatus: "LIKELY_LIVING",
          identityConfidence: 80,
        },
      });
      const susan = await prisma.person.create({
        data: {
          organizationId: org.id,
          canonicalFullName: "Susan Smith",
          normalizedName: normalizeName("Susan Smith"),
          livingStatus: "DECEASED",
          identityConfidence: 86,
        },
      });
      await prisma.deathRecord.create({
        data: { personId: susan.id, dateOfDeath: new Date("2017-01-11"), location: "Tampa, Florida", confidence: 82 },
      });
      await prisma.relationship.create({
        data: { fromPersonId: owner.id, toPersonId: susan.id, type: "SPOUSE", confidence: 95 },
      });
      await prisma.relationship.create({
        data: { fromPersonId: owner.id, toPersonId: jessica.id, type: "CHILD", confidence: 94 },
      });
      await prisma.casePerson.create({
        data: { caseId: kase.id, personId: jessica.id, role: "relative", claimantCategory: "KNOWN_RELATIVE" },
      });
      await prisma.casePerson.create({
        data: { caseId: kase.id, personId: susan.id, role: "relative", claimantCategory: "KNOWN_RELATIVE" },
      });
      const probate = await prisma.probateCase.create({
        data: { county: "Hillsborough", caseNumber: "2019-CP-004812", status: "Closed", personalRepId: relativeId },
      });
      await prisma.estate.create({
        data: { decedentId: owner.id, probateCaseId: probate.id, cases: { connect: { id: kase.id } } },
      });
      await prisma.deathRecord.update({
        where: { personId: owner.id },
        data: {
          probateCounty: "Hillsborough",
          probateCaseNumber: "2019-CP-004812",
          personalRepresentative: "Michael Smith",
          probateStatus: "Closed",
        },
      });
    }

    if (spec.contact && spec.status !== "DISCOVERED") {
      await prisma.communication.create({
        data: {
          caseId: kase.id,
          userId: alex.id,
          channel: "EMAIL",
          direction: "OUTBOUND",
          status: spec.status === "READY_FOR_OUTREACH" ? "DRAFT" : "SENT",
          subject: "A public-records matter — Lifey Recovery LLC",
          body: "Hi — this is Alex Chen with Lifey Recovery LLC. During a review of publicly available property records, we identified a record associated with someone who may be related to you. It may involve funds that have not been claimed. We are an independent private recovery company, not a government agency. If you would like, I can provide additional information and explain what we found.",
          sentAt: spec.status === "READY_FOR_OUTREACH" ? null : new Date("2026-04-02"),
          dayOffset: 1,
        },
      });
    }

    if (spec.agreement) {
      await prisma.agreement.create({
        data: {
          caseId: kase.id,
          type: "DFS_UP_309_RECOVERY",
          version: "DFS-UP-309-2024",
          propertyAccount: spec.account,
          grossAmountCents: spec.value,
          feePercent: 30,
          feeCents: spec.value ? Math.round(spec.value * 0.3) : null,
          claimantAmountCents: spec.value ? spec.value - Math.round(spec.value * 0.3) : null,
          representativeId: representative.id,
          executedAt: new Date("2026-05-10"),
          claimantSignedAt: new Date("2026-05-10"),
          representativeSignedAt: new Date("2026-05-10"),
        },
      });
      for (const type of ["DEATH_CERTIFICATE", "GOVERNMENT_ID", "LETTERS_OF_ADMINISTRATION", "DFS_AGREEMENT"] as const) {
        await prisma.document.create({
          data: {
            caseId: kase.id,
            type,
            status: spec.submitted || spec.approved ? "ACCEPTED" : "REQUESTED",
            fileName: spec.submitted ? `${type.toLowerCase()}.pdf` : null,
          },
        });
      }
    }

    if (spec.submitted || spec.approved) {
      const claim = await prisma.claim.create({
        data: {
          caseId: kase.id,
          representativeId: representative.id,
          status: spec.approved ? "APPROVED" : "SUBMITTED",
          formCode: "DFS-UP-108",
          submittedAt: new Date("2026-06-01"),
          approvedAt: spec.approved ? new Date("2026-07-20") : null,
          approvedCents: spec.approved ? spec.value : null,
        },
      });
      await prisma.claimEvent.create({
        data: {
          claimId: claim.id,
          type: "SUBMITTED",
          detail: "Filed via UPMIS checklist by registered representative (manual confirmation).",
        },
      });
      if (spec.approved && spec.value) {
        const payment = await prisma.payment.create({
          data: {
            claimId: claim.id,
            amountCents: spec.value,
            receivedAt: new Date("2026-08-01"),
            claimantPaidAt: new Date("2026-08-04"),
          },
        });
        await prisma.fee.create({
          data: {
            paymentId: payment.id,
            amountCents: Math.round(spec.value * 0.3),
            collectedAt: new Date("2026-08-04"),
          },
        });
      }
    }

    if (spec.conflict) {
      await prisma.conflictFlag.create({
        data: {
          caseId: kase.id,
          type: "MULTIPLE_ASSERTING_HEIRS",
          detail: "A second relative contacted intake asserting entitlement. Automated outreach paused.",
        },
      });
    }

    await prisma.task.create({
      data: {
        caseId: kase.id,
        assigneeId: spec.deceased ? maria.id : alex.id,
        title: nba.action,
        detail: nba.reason,
        status: spec.approved ? "DONE" : "OPEN",
      },
    });
  }

  await prisma.user.create({
    data: {
      organizationId: org.id,
      kind: "CLAIMANT",
      role: "CLAIMANT",
      email: "michael.smith@example.com",
      name: "Michael Smith",
      passwordHash: portalHash,
      personId: michaelPersonId || undefined,
    },
  });

  await prisma.approvalRequest.create({
    data: {
      caseId: featuredCaseId,
      type: "FIRST_OUTBOUND",
      status: "PENDING",
      reason: "Identity packet is above threshold. First email is drafted without amounts or account numbers.",
      requesterId: alex.id,
    },
  });

  await prisma.aiResearchRun.create({
    data: {
      caseId: featuredCaseId,
      objective:
        "Determine whether John A. Smith, previously of Tampa, Florida, is deceased and identify the strongest living relatives.",
      model: "heuristic",
      promptVersion: "research-agent-v1",
      status: "COMPLETED",
      completedAt: new Date("2026-03-12"),
      confidence: 94,
      stopReason: "Confidence threshold reached on fixture-backed facts",
      resultSummary:
        "FACT: Public fixture obituary reports John A. Smith of Tampa died 2019-06-04 and names Susan Smith (predeceased), Michael Smith, and Jessica Brown.\nFACT: Hillsborough probate 2019-CP-004812 lists Michael Smith as personal representative.\nINFERENCE: Michael is a strong outreach candidate, not a confirmed life-insurance beneficiary.\nUNVERIFIED POSSIBILITY: Additional heirs may exist.\nA property match is not a determination of legal entitlement.",
      findings: {
        create: [
          { kind: "FACT", statement: "Obituary reports death of John A. Smith in Tampa on 2019-06-04.", confidence: 95 },
          { kind: "FACT", statement: "Probate docket names Michael Smith as personal representative.", confidence: 94 },
          { kind: "INFERENCE", statement: "Michael is the strongest living contact for compliant outreach review.", confidence: 91 },
          { kind: "UNVERIFIED_POSSIBILITY", statement: "Jessica Brown may also have a claim path; entitlement is unverified.", confidence: 62 },
        ],
      },
    },
  });

  await prisma.suppressionEntry.create({
    data: { channel: "SMS", valueHash: hashLookup("stop-demo"), reason: "STOP", notes: "Example STOP capture." },
  });

  await prisma.auditLog.create({
    data: {
      userId: alex.id,
      action: "SEED",
      entityType: "Organization",
      entityId: org.id,
      metadata: { note: "Initial operational dataset. Synthetic records only." },
    },
  });

  console.log("Seeded lifey operational dataset.");
  console.log("Staff: maria@lifey.local / alex@lifey.local / claire@lifey.local  password: lifey-demo");
  console.log("Portal: michael.smith@example.com  password: portal-demo");
}

function countyFor(city: string) {
  const map: Record<string, string> = {
    Tampa: "Hillsborough",
    Miami: "Miami-Dade",
    Jacksonville: "Duval",
    Orlando: "Orange",
    Tallahassee: "Leon",
    "St. Petersburg": "Pinellas",
    "Fort Lauderdale": "Broward",
    Gainesville: "Alachua",
  };
  return map[city] || "Unknown";
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
