# lifey — System Architecture

**Product:** AI recovery investigation engine for Florida unclaimed property and lost life-insurance proceeds  
**Company posture:** Independent private recovery service. Not a government agency, not an insurer, not counsel to the claimant unless a licensed attorney is acting as such.  
**Legal frame:** Florida Chapter 717 and DFS Bureau of Unclaimed Property / UPMIS workflows. This document is an engineering design, not legal advice. Compliance rules are versioned and require human approval before regulatory changes take effect.

The competitive advantage is not a list of unclaimed accounts. The product turns a public property record into a sourced investigation: identity, death, family graph, contactability, opportunity score, compliant outreach, documentation, and claim management.

---

## 1. System architecture

```
                         ┌──────────────────────────────────────────┐
                         │              Ingress / Auth               │
                         │  Clerk adapter  |  Local staff adapter    │
                         │  Claimant portal sessions (separate RBAC) │
                         └───────────────┬──────────────────────────┘
                                         │
         ┌───────────────────────────────┼───────────────────────────────┐
         │                               │                               │
         ▼                               ▼                               ▼
┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐
│  Staff App      │            │  Claimant Portal│            │  Public / Legal │
│  Next.js App    │            │  Next.js App    │            │  notices only   │
│  Router         │            │  Router         │            │  (no PII leak)  │
└────────┬────────┘            └────────┬────────┘            └─────────────────┘
         │                               │
         └───────────────┬───────────────┘
                         ▼
              ┌─────────────────────┐
              │   Application API   │
              │   Route handlers    │
              │   + service layer   │
              └──────────┬──────────┘
                         │
     ┌─────────┬─────────┼──────────┬──────────┬──────────┐
     ▼         ▼         ▼          ▼          ▼          ▼
 Discovery  Research  Outreach   Claims    Documents   Compliance
 Services   Agents    Engine     Engine    Engine      Engine
     │         │         │          │          │          │
     └─────────┴─────────┴──────────┴──────────┴──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  Provider adapters  │
              │  (never hard-wired) │
              └──────────┬──────────┘
                         │
     ┌─────────┬─────────┼──────────┬──────────┐
     ▼         ▼         ▼          ▼          ▼
  Source    Search     AI         Jobs       Object
  adapters  APIs       OpenAI /   Inngest /  storage
                       Anthropic  Trigger    S3 / local
                         │
                         ▼
              ┌─────────────────────┐
              │  PostgreSQL         │
              │  provenance-first   │
              │  PII-aware fields   │
              └─────────────────────┘
```

### Runtime boundaries

| Layer | Responsibility | Must not do |
|---|---|---|
| UI | Display evidence, queues, approvals | Invent entitlement |
| Services | Domain rules, scoring, workflow | Call vendor SDKs directly |
| Adapters | Talk to one external system | Bypass CAPTCHA, auth, rate limits |
| AI layer | Draft, extract, rank, summarize | Become a fact or a legal conclusion |
| Compliance | Gate every outbound/state-changing action | Be skippable by automation |
| Audit | Immutable record of who/what/why | Log SSN, ID images, secrets |

### Tenancy

MVP is single-organization (`Organization`). Multi-state is a later jurisdiction pack, not a rewrite: `Jurisdiction` + `ComplianceRuleSet` versioning.

### Trust model

- Staff and claimants never share sessions.
- Documents are never served from public object URLs.
- Every AI conclusion is stored as `FACT | INFERENCE | UNVERIFIED_POSSIBILITY` with source IDs.
- A matching property record is **not** proof of entitlement.

---

## 2. Database ERD (logical)

```
Organization ─┬─ User
              ├─ Representative
              ├─ ComplianceRuleSet
              ├─ ScoringWeightSet
              └─ OutreachSequenceTemplate

Source ─ SourceEvidence ─┬─ Property
                         ├─ Person
                         ├─ Address
                         ├─ DeathRecord
                         ├─ Relationship
                         ├─ ContactMethod
                         ├─ ProbateCase
                         └─ AiFinding

Person ─┬─ Address
        ├─ ContactMethod
        ├─ DeathRecord
        ├─ PersonAlias
        └─ Relationship (from/to)

Property ─┬─ PropertyOwner (Person)
          ├─ Holder
          └─ Case

Estate ─┬─ ProbateCase
        └─ Case

Case ─┬─ CasePerson
      ├─ Task
      ├─ Communication
      ├─ Document
      ├─ Agreement
      ├─ Claim ─ ClaimEvent
      ├─ Payment ─ Fee
      ├─ ConflictFlag
      ├─ AiResearchRun ─ AiFinding
      └─ AuditLog
```

UUID primary keys on every table. Soft-delete is not used for legal artifacts (`agreements`, `claims`, `communications`, `audit_logs`); those are append-only.

---

## 3. Database schema

Implemented in Prisma (`prisma/schema.prisma`). Core tables:

`organizations`, `users`, `sessions`  
`sources`, `source_evidence`  
`properties`, `holders`, `property_owners`  
`persons`, `person_aliases`, `addresses`  
`deaths`, `relationships`, `contact_methods`  
`probate_cases`, `estates`  
`cases`, `case_people`, `tasks`  
`communications`, `outreach_sequences`, `outreach_steps`  
`documents`, `document_access_logs`  
`representatives`, `agreements`  
`claims`, `claim_events`, `payments`, `fees`  
`ai_research_runs`, `ai_findings`  
`conflict_flags`, `audit_logs`  
`suppression_entries`, `approval_requests`  
`compliance_rule_sets`, `scoring_weight_sets`

See `docs/DATABASE.md` for field-level notes and `prisma/schema.prisma` for the source of truth.

---

## 4. Page map

See `docs/PAGE-MAP.md`.

Staff (authenticated, RBAC):

| Path | Purpose |
|---|---|
| `/login` | Staff sign-in |
| `/dashboard` | Executive metrics + pipeline |
| `/opportunities` | Scored property queue |
| `/opportunities/[id]` | Case intelligence / research view |
| `/research` | Search-agent runs |
| `/people` | Entity index |
| `/people/[id]` | Person dossier + evidence |
| `/outreach` | Sequences, drafts, suppressions |
| `/cases` | Kanban + table |
| `/cases/[id]` | Case workspace |
| `/claims` | DFS / insurer claim tracker |
| `/tasks` | Human work queue |
| `/approvals` | Required human gates |
| `/analytics` | Conversion + aging |
| `/compliance` | Rule sets, representatives, audit |
| `/settings` | Org, automation level, scoring weights |

Claimant portal (separate role):

| Path | Purpose |
|---|---|
| `/portal/login` | Email/phone verification |
| `/portal` | Claimant home |
| `/portal/cases/[id]` | Case + property (non-guaranteeing copy) |
| `/portal/documents` | Upload / missing docs |
| `/portal/messages` | Case-manager thread |

---

## 5. Agent architecture

Agents are **tools with provenance**, not autonomous claim filers.

```
Objective
   → Planner (allowed tools only)
      → Adapter calls (rate-limited, logged)
         → Extractor (entities + quotes)
            → Linker (entity resolution, never name-only merge)
               → Classifier (FACT / INFERENCE / UNVERIFIED)
                  → Scorer
                     → Stop if confidence ≥ threshold OR budget exhausted
                        → Human review packet
```

### Agents

| Agent | Objective | Allowed to change |
|---|---|---|
| `ResearchAgent` | Identity, death, relatives, contacts | Findings + graph drafts |
| `InsuranceClassifier` | InsuranceProbability 0–100 | Property classification |
| `OpportunityScorer` | RecoveryOpportunityScore | Score + queue |
| `CaseManagerAgent` | Next best action | Suggested tasks only |
| `OutreachDrafter` | Compliant message drafts | Draft communications |
| `VoiceAgent` (Phase 4) | Identity confirm + schedule | Never legal advice; escalate |

### Hard rules

- No agent submits a DFS or NAIC request.
- No agent sends first-touch outreach unless automation level allows **and** ComplianceService returns `ALLOWED`.
- Default automation: **Research + draft outreach**.
- Prompt versions are stored on every `AiResearchRun`.
- Model output never becomes a `FACT` without a source adapter result.

### AI provider abstraction

`AiProvider` interface → `OpenAiProvider` | `AnthropicProvider` | `HeuristicProvider`  
If no API key is present, the heuristic provider still produces reviewable next actions from structured evidence so the operation does not halt.

---

## 6. Data-source architecture

`SourceAdapter` is the only way data enters the investigation graph.

```ts
interface SourceAdapter {
  id: string
  displayName: string
  jurisdiction?: string
  capabilities: SourceCapability[]
  legalNotes: string
  search(query: AdapterQuery, ctx: AdapterContext): Promise<AdapterResult>
}
```

### Adapter inventory (MVP)

| Adapter | Status | Access model |
|---|---|---|
| `florida-dfs-import` | **Implemented** | Operator-supplied CSV/JSON from records the business is legally allowed to hold. No CAPTCHA bypass, no UPMIS impersonation. |
| `manual-entry` | **Implemented** | Staff-keyed record with mandatory source note |
| `fixture-public-records` | **Implemented (dev/demo)** | Versioned public-record *fixtures* for obituaries/probate used to exercise the agent. Not a live scrape. |
| `florida-dfs-live` | Interface only | Requires official DFS/UPMIS access the org actually possesses |
| `county-probate` | Interface only | County clerk/portal API or manual import |
| `obituary-provider` | Interface only | Licensed obituary/news API |
| `people-data-provider` | Interface only | Permitted enrichment vendor (e.g. contractually approved) |
| `naic-policy-locator` | Interface only | **Human-authorized only**, after claimant/representative supplies required data. Never auto-submitted. |

Uncertain or restricted sources are interfaces plus `REQUIRED_PROVIDER` markers. The platform does not invent endpoints.

Every ingested field writes `SourceEvidence`: `sourceId`, `rawValue`, `normalizedValue`, `retrievedAt`, `url`, `interpretation`.

---

## 7. Compliance architecture

`ComplianceService.validate(action, case)` runs **before** any outbound or legally significant mutation.

### Decision

`ALLOWED` | `REQUIRES_HUMAN_REVIEW` | `BLOCKED` + machine-readable reasons.

### Checks

- Channel permission and suppression (STOP, unsubscribe, DNC, attorney, hostile, deceased recipient, wrong person)
- Conflict flags (active claim, multiple asserting heirs, represented estate)
- Identity confidence vs. configured threshold
- Sensitive-data disclosure rules (no dollar amounts or account numbers on first touch)
- Representative license + DFS registration validity
- Agreement form type (Florida DFS recovery agreement only for Ch. 717 property; no substitute contingency contracts)
- Fee cap (`MAX_FEE_PERCENT`, default **30**, matching [Fla. Stat. § 717.135(2)(j)](https://flsenate.gov/laws/statutes/2025/717.135))
- Fee timing: no fee collection before claim approval on Florida-held property ([§ 717.135(5)](https://flsenate.gov/laws/statutes/2025/717.135))
- Automation level
- Jurisdiction pack

### Human-required actions (cannot be fully automated)

- First outbound communication
- Claim submission
- Legal-entitlement determination
- Significant personal-data disclosure
- Agreement execution
- Changing claimant or heir relationship
- Closing a disputed case
- Changing `MAX_FEE_PERCENT` or form versions

### Copy rules

Never: “You inherited John’s life insurance.”  
Always: “We identified property associated with [name] that may potentially be claimable by you or the estate. Eligibility must be verified.”

Never claim affiliation with DFS, Florida government, NAIC, or a carrier.

### Representative types stored

Florida attorney · Florida CPA · Florida Class C private investigator  
Submission is blocked if registration is missing, expired, or suspended.

---

## 8. Complete case workflow

```
DISCOVERED
  → RESEARCHING
    → IDENTITY CONFIRMED
      → DECEASED VERIFIED          (or living-owner path)
        → RELATIVES FOUND
          → READY FOR OUTREACH     (human approval)
            → CONTACTED
              → RESPONDED
                → QUALIFIED
                  → AGREEMENT PENDING   (DFS-UP-309 path for FL UP)
                    → AGREEMENT SIGNED
                      → DOCUMENTS REQUESTED
                        → DOCUMENTS PARTIAL
                          → DOCUMENTS COMPLETE
                            → CLAIM READY
                              → CLAIM SUBMITTED
                                → DFS REVIEW | INSURER REVIEW
                                  → ADDITIONAL DOCUMENTATION REQUESTED (loop)
                                    → APPROVED
                                      → PAYMENT PENDING
                                        → PAID
                                          → FEE RECEIVED
                                            → CLOSED
```

Terminal / exception: `DENIED` `DISPUTED` `DUPLICATE` `NOT ELIGIBLE`

Lost-policy path is a **separate** case type (`LOST_POLICY_INVESTIGATION`) and never auto-files NAIC locator requests.

---

## 9. Integrations required

| Need | Provider (pluggable) | MVP behavior |
|---|---|---|
| Auth | Clerk **or** Auth0 **or** local staff | Local staff + claimant sessions work without vendor keys |
| Database | Managed PostgreSQL | Docker Compose locally |
| Object storage | S3-compatible | Encrypted local disk adapter |
| Email | Resend / SES / Postmark | `EmailProvider` — logs + stores if unset |
| SMS | Twilio | `SmsProvider` — logs + stores if unset |
| Voice | Twilio + optional realtime model | Module present; live dial disabled until configured |
| Background jobs | Inngest or Trigger.dev | In-process runner + Inngest adapter |
| LLM | OpenAI / Anthropic | Heuristic fallback |
| Search | Approved web/people APIs | Interface only until keys exist |
| E-sign | DFS-authorized eSignature product for FL agreements | Placeholder + manual wet-ink tracking |
| DFS/UPMIS | Official access only | Import + checklist, no scrape |

---

## 10. MVP development sequence

**Phase 1 (this implementation):** database, auth, Florida import, opportunity dashboard, entity resolution, death/family/contact research, research agent, evidence system.

**Phase 2:** case management, outreach CRM, email/SMS adapters, approval queue, AI summaries.

**Phase 3:** claimant portal, documents, representatives, Florida agreement workflow, claim management.

**Phase 4 (scaffolded):** analytics depth, voice agent, advanced probate adapters, multi-state packs.

Ship order inside this repo: schema → services → staff UI → portal → seed investigation that proves the “John A. Smith” narrative with clickable evidence.
