# Getting real Florida unclaimed property data

## What I checked, and what I found

| Question | Finding |
|---|---|
| Is there a public API? | No. No documented REST/JSON API exists for public search. |
| Is there a bulk download? | No. The portal offers per-name search only. |
| Does `robots.txt` permit crawling? | There is no `robots.txt` (404). No directive either way. |
| Is automated access blocked? | **Yes.** A WAF returns `Request Rejected` to non-browser clients. A request only succeeds if it presents a full browser User-Agent. |
| Is the underlying data public? | Yes. Owner name, last known address, holder, and amount are public record under Ch. 119. |
| What is exempt? | Social security numbers and property identifiers are confidential and exempt under s. 717.117(2)(b). A lawful extract will not contain SSNs. |

## Why we do not scrape

The site's WAF exists specifically to distinguish browsers from automated clients and reject the latter. Getting a scraper through it requires deliberately impersonating a browser to defeat that control. Three reasons that is the wrong foundation here:

1. **It is circumvention of an access control** on a state government system, which is the fact pattern that creates Computer Fraud and Abuse Act exposure. "The data is public" answers a different question than "was your access authorized."
2. **DFS is our regulator.** Chapter 717 requires claimant representatives to register with the same department that runs this site. Being identified as scraping DFS while holding or seeking a DFS registration is a business-ending risk, not a technical one.
3. **It produces worse data.** Search results are paginated HTML for one name at a time. A records request returns the whole dataset in a structured format.

## The channel that works

A Chapter 119 public records request to DFS for a bulk extract. Florida's public records law is strong, the data is non-exempt, and the department has a standing process for it.

**Portal:** https://myfloridacfo.com/publicrecords
**Mail:** Public Records Unit, Florida Department of Financial Services, 200 East Gaines Street, Tallahassee, FL 32399-0311
**Phone:** 850-413-3149

A request need not be in writing and may be anonymous, but write it anyway so the scope is unambiguous and you have a record.

Expect the agency to quote a cost for extensive clerical or IT time before producing the records; that is permitted under s. 119.07(4).

### Draft request

> **Re: Public records request — Division of Unclaimed Property database extract**
>
> Pursuant to Article I, Section 24 of the Florida Constitution and Chapter 119, Florida Statutes, I request a copy of the following public records held by the Division of Unclaimed Property:
>
> An electronic extract of all unclaimed property accounts currently held by the Department and available to the public through FLTreasureHunt.gov, containing for each account: account or property number, reported owner name, reported co-owner name, last known address, city, state, ZIP, holder name, NAUPA property type code, property description, reporting year, and amount reported.
>
> I request the records in a machine-readable format — CSV, NAUPA 2, or NAUPA 3 — rather than paper or PDF, and delivered electronically.
>
> I am not requesting any social security number or property identifier exempt under s. 717.117(2)(b), or any other confidential or exempt information. Please redact exempt fields and produce the remainder.
>
> If any portion is withheld, please state the statutory basis for each exemption as required by s. 119.07(1)(e).
>
> If fulfilling this request will require extensive clerical or information technology resources, please provide a written estimate of the special service charge under s. 119.07(4) before proceeding.

If a full extract is refused or priced out of reach, narrow it and ask again — for example, limit to NAUPA type codes `IN01`–`IN09` (insurance) above a dollar threshold. That is a much smaller job for their IT staff and is the only slice this business actually works.

## What the platform already does with it

Whatever format comes back drops straight into the pipeline:

- `data/inbox/` — drop the file, the watcher imports it within 30 seconds (local only)
- `POST /api/ingest/webhook` — for a recurring machine feed
- Automation page — configure a recurring authorized feed URL

The importer maps common column names, and the classifier reads NAUPA type codes directly, which is stronger evidence than parsing description text:

| Code | Meaning | Treated as |
|---|---|---|
| IN03 | Death benefits due beneficiaries | Death benefits, 99% |
| IN09 | Matured life policy, limiting age reached | Death benefits, 94% |
| IN04 | Proceeds from matured policy or endowment | Annuity proceeds, 96% |
| IN01 / IN02 | Individual / group policy benefits | Insurance, 92 / 90% |
| IN05 | Premium refunds | Refunds, 88% |
| IN07 | Other amounts due under policy terms | Insurance, 85% |
| IN08 | Agent credit balances | Insurance, 80% — flagged as *not* owner proceeds |
| IN06 | Unidentified remittances | Insurance, 70% |

Codes are from Florida's Unclaimed Property Reporting Instructions Manual.

## Other lawful sources worth pursuing

- **NAUPA / MissingMoney** — the multi-state search consortium; ask about data licensing rather than scraping.
- **Licensed obituary and death-notice APIs** — for the death verification step.
- **County clerk probate feeds** — several Florida counties publish bulk dockets or provide them on request.
- **Compliant people-data vendors** — for contactability only, under a written permissible-use agreement.

Each is a small adapter implementing `search()` in `src/server/adapters/`.
