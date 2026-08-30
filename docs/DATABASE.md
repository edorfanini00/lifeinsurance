# lifey — Database ERD and schema notes

Source of truth: `prisma/schema.prisma`.

## Design rules

- UUID primary keys (`uuid()`).
- Every investigatory fact can point at one or more `SourceEvidence` rows.
- `ssnLast4` is the only SSN-shaped field allowed. Full SSN is never stored in application tables.
- `estimatedValueCents` is optional; Florida public search often omits value.
- Append-only: `audit_logs`, `communications`, `claim_events`, `document_access_logs`, `ai_research_runs`.
- Do not merge `Person` rows on name alone. Merges require `IdentityConfidence` ≥ threshold **and** human approval.

## Entity groups

### Identity

`Person` is the resolved entity. `PersonAlias` holds maiden/married/misspelling/suffix variants. `Address` is historic or current, each with evidence. `DeathRecord` is created only when a death source exists.

### Property

`Property` is one DFS (or holder) account. `Holder` is the reporting company. `PropertyOwner` links persons (owner, co-owner) without asserting they are the same human.

### Graph

`Relationship` is a directed edge: `fromPerson` → `type` → `toPerson`, plus source, confidence, discovered-at.  
`CasePerson.claimantCategory` is independent of the graph:

- `KNOWN_RELATIVE`
- `LIKELY_HEIR`
- `POTENTIAL_BENEFICIARY`
- `PERSONAL_REPRESENTATIVE`
- `CONFIRMED_CLAIMANT`

A relative is never auto-promoted to heir or beneficiary.

### Recovery

`Case` is the operational unit (one property, or a grouped estate).  
`Agreement` for Florida unclaimed property stores DFS recovery-agreement metadata only — no substitute contingency contract.  
`Claim` tracks DFS or insurer process. `Fee` cannot be marked collected before `Claim.status = APPROVED` when `jurisdiction = FL` and `propertyHeldByState = true`.

## Opportunity scoring (default weights)

Configurable via `ScoringWeightSet` (must be human-approved to change):

| Factor | Default |
|---|---|
| Estimated value | 30 |
| Identity confidence | 20 |
| Family confidence | 15 |
| Contactability | 10 |
| Documentation | 10 |
| Probate simplicity | 10 |
| Claim probability | 5 |

Queues: HOT 80–100 · GOOD 65–79 · RESEARCH 40–64 · LOW 0–39.

## Indexes (high-traffic)

- `properties.accountNumber`, `properties.externalRecordId`
- `persons.normalizedName`, `persons.county`
- `contact_methods.valueHash` (dedupe / suppression)
- `cases.status`, `cases.opportunityScore`
- `suppression_entries.channel + valueHash`
