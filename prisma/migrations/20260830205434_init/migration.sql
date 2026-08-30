-- CreateEnum
CREATE TYPE "UserKind" AS ENUM ('STAFF', 'CLAIMANT');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'RESEARCHER', 'OUTREACH', 'CASE_MANAGER', 'LICENSED_REPRESENTATIVE', 'COMPLIANCE', 'VIEWER', 'CLAIMANT');

-- CreateEnum
CREATE TYPE "CaseType" AS ENUM ('UNCLAIMED_PROPERTY', 'LOST_POLICY_INVESTIGATION');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('DISCOVERED', 'RESEARCHING', 'IDENTITY_CONFIRMED', 'DECEASED_VERIFIED', 'RELATIVES_FOUND', 'READY_FOR_OUTREACH', 'CONTACTED', 'RESPONDED', 'QUALIFIED', 'AGREEMENT_PENDING', 'AGREEMENT_SIGNED', 'DOCUMENTS_REQUESTED', 'DOCUMENTS_PARTIAL', 'DOCUMENTS_COMPLETE', 'CLAIM_READY', 'CLAIM_SUBMITTED', 'DFS_REVIEW', 'ADDITIONAL_DOCUMENTATION_REQUESTED', 'APPROVED', 'PAYMENT_PENDING', 'PAID', 'FEE_RECEIVED', 'CLOSED', 'DENIED', 'DISPUTED', 'DUPLICATE', 'NOT_ELIGIBLE');

-- CreateEnum
CREATE TYPE "ClaimantCategory" AS ENUM ('KNOWN_RELATIVE', 'LIKELY_HEIR', 'POTENTIAL_BENEFICIARY', 'PERSONAL_REPRESENTATIVE', 'CONFIRMED_CLAIMANT');

-- CreateEnum
CREATE TYPE "OpportunityQueue" AS ENUM ('HOT', 'GOOD', 'RESEARCH', 'LOW_PRIORITY');

-- CreateEnum
CREATE TYPE "InsuranceCategory" AS ENUM ('LIFE_INSURANCE_PROCEEDS', 'DEATH_BENEFITS', 'ANNUITY_PROCEEDS', 'INSURANCE_REFUNDS', 'INSURANCE_SETTLEMENT', 'INSURANCE_RELATED_CHECKS', 'UNKNOWN_INSURANCE_PROPERTY', 'UNLIKELY_INSURANCE');

-- CreateEnum
CREATE TYPE "FindingKind" AS ENUM ('FACT', 'INFERENCE', 'UNVERIFIED_POSSIBILITY');

-- CreateEnum
CREATE TYPE "ComplianceDecision" AS ENUM ('ALLOWED', 'REQUIRES_HUMAN_REVIEW', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AutomationLevel" AS ENUM ('RESEARCH_ONLY', 'RESEARCH_AND_DRAFT', 'SEMI_AUTOMATED', 'FULL_PERMITTED');

-- CreateEnum
CREATE TYPE "RepresentativeType" AS ENUM ('FLORIDA_ATTORNEY', 'FLORIDA_CPA', 'FLORIDA_CLASS_C_PI');

-- CreateEnum
CREATE TYPE "RepresentativeStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'PENDING');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('SPOUSE', 'FORMER_SPOUSE', 'CHILD', 'ADOPTED_CHILD', 'PARENT', 'SIBLING', 'GRANDCHILD', 'NIECE_NEPHEW', 'EXECUTOR', 'PERSONAL_REPRESENTATIVE', 'TRUSTEE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('EMAIL', 'SMS', 'PHONE', 'LETTER', 'VOICEMAIL_TASK', 'PORTAL', 'INTERNAL');

-- CreateEnum
CREATE TYPE "CommunicationDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "CommunicationStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'SCHEDULED', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('GOVERNMENT_ID', 'DEATH_CERTIFICATE', 'BIRTH_CERTIFICATE', 'MARRIAGE_CERTIFICATE', 'PROBATE_DOCUMENTS', 'LETTERS_OF_ADMINISTRATION', 'LETTERS_TESTAMENTARY', 'TRUST_DOCUMENTS', 'PROOF_OF_ADDRESS', 'NAME_CHANGE', 'DFS_AGREEMENT', 'DFS_CLAIM_FORM', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('REQUESTED', 'UPLOADED', 'IN_REVIEW', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('DRAFT', 'READY', 'SUBMITTED', 'IN_REVIEW', 'ADDITIONAL_DOCS', 'APPROVED', 'DENIED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('FIRST_OUTBOUND', 'CLAIM_SUBMISSION', 'LEGAL_ENTITLEMENT', 'SENSITIVE_DISCLOSURE', 'AGREEMENT_EXECUTION', 'CLAIMANT_CHANGE', 'HEIR_RELATIONSHIP_CHANGE', 'CLOSE_DISPUTED', 'COMPLIANCE_RULE_CHANGE');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ConflictType" AS ENUM ('EXISTING_CLAIM', 'MULTIPLE_ASSERTING_HEIRS', 'ACTIVE_PROBATE', 'ATTORNEY_REPRESENTED', 'ALREADY_CLAIMED', 'AMBIGUOUS_IDENTITY', 'DUPLICATE_HOUSEHOLD');

-- CreateEnum
CREATE TYPE "OwnerReportedStatus" AS ENUM ('UNKNOWN', 'APPARENT_OWNER', 'REPORTED_DECEASED');

-- CreateEnum
CREATE TYPE "PropertyClaimStatus" AS ENUM ('UNCLAIMED', 'CLAIM_PENDING', 'CLAIMED', 'PAID', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SuppressionReason" AS ENUM ('STOP', 'UNSUBSCRIBE', 'DNC', 'WRONG_PERSON', 'ATTORNEY_REPRESENTED', 'DECEASED_RECIPIENT', 'HOSTILE', 'DUPLICATE_FAMILY', 'ACTIVE_DISPUTE');

-- CreateEnum
CREATE TYPE "AgreementType" AS ENUM ('DFS_UP_309_RECOVERY', 'DFS_UP_310_PURCHASE', 'LOST_POLICY_AUTHORIZATION');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "publicDisclosure" TEXT NOT NULL,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "addressLine1" TEXT,
    "city" TEXT,
    "state" TEXT NOT NULL DEFAULT 'FL',
    "zip" TEXT,
    "automationLevel" "AutomationLevel" NOT NULL DEFAULT 'RESEARCH_AND_DRAFT',
    "maxFeePercent" INTEGER NOT NULL DEFAULT 30,
    "identityThreshold" INTEGER NOT NULL DEFAULT 70,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "UserKind" NOT NULL,
    "role" "UserRole" NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "personId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "adapterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "jurisdiction" TEXT,
    "legalNotes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceEvidence" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "rawValue" TEXT NOT NULL,
    "normalizedValue" TEXT,
    "url" TEXT,
    "retrievedAt" TIMESTAMP(3) NOT NULL,
    "interpretation" TEXT,
    "findingKind" "FindingKind" NOT NULL DEFAULT 'FACT',
    "externalRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "knownInsurer" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Holder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "externalRecordId" TEXT,
    "holderId" TEXT,
    "ownerNameRaw" TEXT NOT NULL,
    "coOwnerNameRaw" TEXT,
    "reportedAddress" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "categoryRaw" TEXT,
    "description" TEXT,
    "reportingYear" INTEGER,
    "reportedOwnerStatus" "OwnerReportedStatus" NOT NULL DEFAULT 'UNKNOWN',
    "claimStatus" "PropertyClaimStatus" NOT NULL DEFAULT 'UNCLAIMED',
    "estimatedValueCents" INTEGER,
    "valueKnown" BOOLEAN NOT NULL DEFAULT false,
    "sourceUrl" TEXT,
    "retrievedAt" TIMESTAMP(3) NOT NULL,
    "jurisdiction" TEXT NOT NULL DEFAULT 'FL',
    "heldByState" BOOLEAN NOT NULL DEFAULT true,
    "insuranceCategory" "InsuranceCategory" NOT NULL DEFAULT 'UNLIKELY_INSURANCE',
    "insuranceProbability" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyOwner" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "confidence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PropertyOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "canonicalFullName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "estimatedAge" INTEGER,
    "ssnLast4Encrypted" TEXT,
    "lastKnownAddress" TEXT,
    "county" TEXT,
    "identityConfidence" INTEGER NOT NULL DEFAULT 0,
    "livingStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonAlias" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,

    CONSTRAINT "PersonAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT,
    "county" TEXT,
    "historic" BOOLEAN NOT NULL DEFAULT false,
    "current" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeathRecord" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "dateOfDeath" TIMESTAMP(3),
    "location" TEXT,
    "obituaryUrl" TEXT,
    "probateCounty" TEXT,
    "probateCaseNumber" TEXT,
    "personalRepresentative" TEXT,
    "probateStatus" TEXT,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeathRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "fromPersonId" TEXT NOT NULL,
    "toPersonId" TEXT NOT NULL,
    "type" "RelationshipType" NOT NULL,
    "confidence" INTEGER NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMethod" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "valueEnc" TEXT NOT NULL,
    "valueHash" TEXT NOT NULL,
    "label" TEXT,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProbateCase" (
    "id" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "decedentId" TEXT,
    "personalRepId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProbateCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estate" (
    "id" TEXT NOT NULL,
    "decedentId" TEXT NOT NULL,
    "probateCaseId" TEXT,

    CONSTRAINT "Estate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "type" "CaseType" NOT NULL DEFAULT 'UNCLAIMED_PROPERTY',
    "status" "CaseStatus" NOT NULL DEFAULT 'DISCOVERED',
    "propertyId" TEXT NOT NULL,
    "estateId" TEXT,
    "assigneeId" TEXT,
    "representativeId" TEXT,
    "opportunityScore" INTEGER NOT NULL DEFAULT 0,
    "queue" "OpportunityQueue" NOT NULL DEFAULT 'LOW_PRIORITY',
    "nextAction" TEXT,
    "nextActionReason" TEXT,
    "riskFlags" TEXT,
    "aiConfidence" INTEGER,
    "identityConfidence" INTEGER NOT NULL DEFAULT 0,
    "deathConfidence" INTEGER NOT NULL DEFAULT 0,
    "familyConfidence" INTEGER NOT NULL DEFAULT 0,
    "contactConfidence" INTEGER NOT NULL DEFAULT 0,
    "outreachApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasePerson" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "claimantCategory" "ClaimantCategory",
    "isPrimaryContact" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CasePerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringWeightSet" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "valueWeight" INTEGER NOT NULL DEFAULT 30,
    "identityWeight" INTEGER NOT NULL DEFAULT 20,
    "familyWeight" INTEGER NOT NULL DEFAULT 15,
    "contactWeight" INTEGER NOT NULL DEFAULT 10,
    "documentationWeight" INTEGER NOT NULL DEFAULT 10,
    "probateWeight" INTEGER NOT NULL DEFAULT 10,
    "claimWeight" INTEGER NOT NULL DEFAULT 5,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoringWeightSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRuleSet" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "maxFeePercent" INTEGER NOT NULL DEFAULT 30,
    "notes" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Representative" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RepresentativeType" NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "dfsRegistered" BOOLEAN NOT NULL DEFAULT false,
    "dfsRegistrationId" TEXT,
    "registrationExpires" TIMESTAMP(3),
    "employingOrg" TEXT NOT NULL,
    "status" "RepresentativeStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Representative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachSequenceTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "OutreachSequenceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachStepTemplate" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "dayOffset" INTEGER NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "templateBody" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "OutreachStepTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Communication" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT,
    "channel" "CommunicationChannel" NOT NULL,
    "direction" "CommunicationDirection" NOT NULL,
    "status" "CommunicationStatus" NOT NULL DEFAULT 'DRAFT',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "toHash" TEXT,
    "dayOffset" INTEGER,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuppressionEntry" (
    "id" TEXT NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "valueHash" TEXT NOT NULL,
    "reason" "SuppressionReason" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuppressionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'REQUESTED',
    "fileName" TEXT,
    "storageKey" TEXT,
    "mimeType" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAccessLog" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agreement" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" "AgreementType" NOT NULL,
    "version" TEXT NOT NULL,
    "propertyAccount" TEXT NOT NULL,
    "grossAmountCents" INTEGER,
    "feePercent" INTEGER NOT NULL,
    "feeCents" INTEGER,
    "claimantAmountCents" INTEGER,
    "representativeId" TEXT,
    "executedAt" TIMESTAMP(3),
    "claimantSignedAt" TIMESTAMP(3),
    "representativeSignedAt" TIMESTAMP(3),
    "irrevocable" BOOLEAN NOT NULL DEFAULT false,
    "substituteContract" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "representativeId" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "formCode" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "deniedAt" TIMESTAMP(3),
    "approvedCents" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimEvent" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "receivedAt" TIMESTAMP(3),
    "claimantPaidAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fee" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "collectedAt" TIMESTAMP(3),
    "blockedReason" TEXT,

    CONSTRAINT "Fee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "type" "ApprovalType" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "payload" JSONB,
    "requesterId" TEXT NOT NULL,
    "deciderId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConflictFlag" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" "ConflictType" NOT NULL,
    "detail" TEXT NOT NULL,
    "open" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConflictFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiResearchRun" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "objective" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "stopReason" TEXT,
    "resultSummary" TEXT,
    "confidence" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AiResearchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiFinding" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "kind" "FindingKind" NOT NULL,
    "statement" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,

    CONSTRAINT "AiFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'RUNNING',
    "triggeredBy" TEXT NOT NULL DEFAULT 'schedule',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "itemsCreated" INTEGER NOT NULL DEFAULT 0,
    "detail" TEXT,
    "error" TEXT,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestFeed" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "adapterId" TEXT NOT NULL DEFAULT 'florida-dfs-import',
    "authHeaderEnc" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "legalBasis" TEXT NOT NULL,
    "lastFetchedAt" TIMESTAMP(3),
    "lastHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IngestFeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "tickSeconds" INTEGER NOT NULL DEFAULT 60,
    "inboxEnabled" BOOLEAN NOT NULL DEFAULT true,
    "feedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoResearch" BOOLEAN NOT NULL DEFAULT true,
    "autoScore" BOOLEAN NOT NULL DEFAULT true,
    "autoConflicts" BOOLEAN NOT NULL DEFAULT true,
    "autoDraftOutreach" BOOLEAN NOT NULL DEFAULT true,
    "webhookKeyHash" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "ip" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PropertyEvidence" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PropertyEvidence_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PersonEvidence" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PersonEvidence_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AddressEvidence" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AddressEvidence_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DeathEvidence" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DeathEvidence_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_RelationshipEvidence" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RelationshipEvidence_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ContactEvidence" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ContactEvidence_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProbateEvidence" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProbateEvidence_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_FindingEvidence" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FindingEvidence_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Property_ownerNameRaw_idx" ON "Property"("ownerNameRaw");

-- CreateIndex
CREATE INDEX "Property_insuranceProbability_idx" ON "Property"("insuranceProbability");

-- CreateIndex
CREATE UNIQUE INDEX "Property_organizationId_accountNumber_key" ON "Property"("organizationId", "accountNumber");

-- CreateIndex
CREATE INDEX "Person_normalizedName_idx" ON "Person"("normalizedName");

-- CreateIndex
CREATE INDEX "Person_county_idx" ON "Person"("county");

-- CreateIndex
CREATE UNIQUE INDEX "DeathRecord_personId_key" ON "DeathRecord"("personId");

-- CreateIndex
CREATE INDEX "ContactMethod_valueHash_idx" ON "ContactMethod"("valueHash");

-- CreateIndex
CREATE UNIQUE INDEX "ProbateCase_county_caseNumber_key" ON "ProbateCase"("county", "caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Case_caseNumber_key" ON "Case"("caseNumber");

-- CreateIndex
CREATE INDEX "Case_status_idx" ON "Case"("status");

-- CreateIndex
CREATE INDEX "Case_opportunityScore_idx" ON "Case"("opportunityScore");

-- CreateIndex
CREATE INDEX "Case_queue_idx" ON "Case"("queue");

-- CreateIndex
CREATE UNIQUE INDEX "SuppressionEntry_channel_valueHash_key" ON "SuppressionEntry"("channel", "valueHash");

-- CreateIndex
CREATE INDEX "JobRun_jobId_startedAt_idx" ON "JobRun"("jobId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationConfig_organizationId_key" ON "AutomationConfig"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "_PropertyEvidence_B_index" ON "_PropertyEvidence"("B");

-- CreateIndex
CREATE INDEX "_PersonEvidence_B_index" ON "_PersonEvidence"("B");

-- CreateIndex
CREATE INDEX "_AddressEvidence_B_index" ON "_AddressEvidence"("B");

-- CreateIndex
CREATE INDEX "_DeathEvidence_B_index" ON "_DeathEvidence"("B");

-- CreateIndex
CREATE INDEX "_RelationshipEvidence_B_index" ON "_RelationshipEvidence"("B");

-- CreateIndex
CREATE INDEX "_ContactEvidence_B_index" ON "_ContactEvidence"("B");

-- CreateIndex
CREATE INDEX "_ProbateEvidence_B_index" ON "_ProbateEvidence"("B");

-- CreateIndex
CREATE INDEX "_FindingEvidence_B_index" ON "_FindingEvidence"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceEvidence" ADD CONSTRAINT "SourceEvidence_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_holderId_fkey" FOREIGN KEY ("holderId") REFERENCES "Holder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyOwner" ADD CONSTRAINT "PropertyOwner_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyOwner" ADD CONSTRAINT "PropertyOwner_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonAlias" ADD CONSTRAINT "PersonAlias_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeathRecord" ADD CONSTRAINT "DeathRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_fromPersonId_fkey" FOREIGN KEY ("fromPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_toPersonId_fkey" FOREIGN KEY ("toPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactMethod" ADD CONSTRAINT "ContactMethod_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProbateCase" ADD CONSTRAINT "ProbateCase_personalRepId_fkey" FOREIGN KEY ("personalRepId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estate" ADD CONSTRAINT "Estate_decedentId_fkey" FOREIGN KEY ("decedentId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estate" ADD CONSTRAINT "Estate_probateCaseId_fkey" FOREIGN KEY ("probateCaseId") REFERENCES "ProbateCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "Estate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_representativeId_fkey" FOREIGN KEY ("representativeId") REFERENCES "Representative"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePerson" ADD CONSTRAINT "CasePerson_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePerson" ADD CONSTRAINT "CasePerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringWeightSet" ADD CONSTRAINT "ScoringWeightSet_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRuleSet" ADD CONSTRAINT "ComplianceRuleSet_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Representative" ADD CONSTRAINT "Representative_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachSequenceTemplate" ADD CONSTRAINT "OutreachSequenceTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachStepTemplate" ADD CONSTRAINT "OutreachStepTemplate_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "OutreachSequenceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccessLog" ADD CONSTRAINT "DocumentAccessLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_representativeId_fkey" FOREIGN KEY ("representativeId") REFERENCES "Representative"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_representativeId_fkey" FOREIGN KEY ("representativeId") REFERENCES "Representative"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimEvent" ADD CONSTRAINT "ClaimEvent_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fee" ADD CONSTRAINT "Fee_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_deciderId_fkey" FOREIGN KEY ("deciderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConflictFlag" ADD CONSTRAINT "ConflictFlag_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiResearchRun" ADD CONSTRAINT "AiResearchRun_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiFinding" ADD CONSTRAINT "AiFinding_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AiResearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PropertyEvidence" ADD CONSTRAINT "_PropertyEvidence_A_fkey" FOREIGN KEY ("A") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PropertyEvidence" ADD CONSTRAINT "_PropertyEvidence_B_fkey" FOREIGN KEY ("B") REFERENCES "SourceEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PersonEvidence" ADD CONSTRAINT "_PersonEvidence_A_fkey" FOREIGN KEY ("A") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PersonEvidence" ADD CONSTRAINT "_PersonEvidence_B_fkey" FOREIGN KEY ("B") REFERENCES "SourceEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AddressEvidence" ADD CONSTRAINT "_AddressEvidence_A_fkey" FOREIGN KEY ("A") REFERENCES "Address"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AddressEvidence" ADD CONSTRAINT "_AddressEvidence_B_fkey" FOREIGN KEY ("B") REFERENCES "SourceEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DeathEvidence" ADD CONSTRAINT "_DeathEvidence_A_fkey" FOREIGN KEY ("A") REFERENCES "DeathRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DeathEvidence" ADD CONSTRAINT "_DeathEvidence_B_fkey" FOREIGN KEY ("B") REFERENCES "SourceEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RelationshipEvidence" ADD CONSTRAINT "_RelationshipEvidence_A_fkey" FOREIGN KEY ("A") REFERENCES "Relationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RelationshipEvidence" ADD CONSTRAINT "_RelationshipEvidence_B_fkey" FOREIGN KEY ("B") REFERENCES "SourceEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactEvidence" ADD CONSTRAINT "_ContactEvidence_A_fkey" FOREIGN KEY ("A") REFERENCES "ContactMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactEvidence" ADD CONSTRAINT "_ContactEvidence_B_fkey" FOREIGN KEY ("B") REFERENCES "SourceEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProbateEvidence" ADD CONSTRAINT "_ProbateEvidence_A_fkey" FOREIGN KEY ("A") REFERENCES "ProbateCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProbateEvidence" ADD CONSTRAINT "_ProbateEvidence_B_fkey" FOREIGN KEY ("B") REFERENCES "SourceEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FindingEvidence" ADD CONSTRAINT "_FindingEvidence_A_fkey" FOREIGN KEY ("A") REFERENCES "AiFinding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FindingEvidence" ADD CONSTRAINT "_FindingEvidence_B_fkey" FOREIGN KEY ("B") REFERENCES "SourceEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
