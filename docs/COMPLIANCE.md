# lifey — Compliance architecture (operational)

Engineering controls. Not legal advice. A licensed Florida claimant representative must review before production use.

## Florida Chapter 717 (as designed)

References:

- [Fla. Stat. § 717.135 (2025)](https://flsenate.gov/laws/statutes/2025/717.135) — recovery/purchase agreements, 30% cap, exclusive official forms, fee only after approval.
- Fla. Admin. Code r. 69G-20.0021 — claim filing procedures; DFS-UP-108 (claim by representative); DFS-UP-309 (Unclaimed Property Recovery Agreement); DFS-UP-310 (purchase agreement). Official forms live on [fltreasurehunt.gov](https://www.fltreasurehunt.gov).

## Hard product rules

1. Florida-held abandoned property uses only the DFS recovery or purchase agreement. The app will not generate a substitute contingency contract for those accounts.
2. `MAX_FEE_PERCENT` defaults to 30. Changing it requires a compliance officer approval record. The previous version remains in force until approved.
3. Fees cannot be invoiced or marked received before claim approval on Florida-held property.
4. Only a stored, valid representative (FL attorney, FL CPA, or FL Class C PI) with current DFS registration may be attached to a claim-processing account.
5. AI and unqualified staff cannot be the statutory claimant representative.
6. First outreach never includes account numbers, dollar amounts, or SSN-related data.
7. No affiliation language with DFS, the State of Florida, NAIC, or a carrier.
8. NAIC Life Insurance Policy Locator is a human-authorized step after the appropriate person supplies required information. No scraping, no impersonation, no auto-submit.
9. Do not mark a person deceased without a `DeathRecord` backed by evidence.
10. Do not tell a contact they inherited life insurance.

## Suppression

STOP, unsubscribe, DNC, wrong person, attorney-represented, deceased recipient, hostile, duplicate household, active dispute — all block automated outreach.

## Audit

Every gated action writes `AuditLog` + optional `ApprovalRequest`. AI runs store model, prompt version, source IDs, result, confidence, and approval if any. Full SSNs, ID-document bytes, and auth secrets are never written to application logs.
