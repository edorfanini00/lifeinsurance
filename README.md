# lifey

Operational investigation platform for **potentially recoverable** Florida unclaimed property and lost life-insurance proceeds.

Lifey Recovery LLC is an independent private recovery company. The software must never state that a person is entitled to funds merely because a public record appears to match them.

Architecture, ERD, page map, agents, sources, compliance, workflow, integrations, and MVP sequence: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## What this is

An **AI recovery investigation engine**: ingest lawful Florida DFS extracts → resolve identity → verify death with evidence → build a family graph → score the opportunity → require human review → draft compliant outreach → collect documents → track official DFS/insurer claims → take a contractual fee only after approval.

It is not a government system, not UPMIS, and not the NAIC policy locator.

## Stack

Next.js · TypeScript · Prisma · Tailwind · local staff/claimant auth (Clerk/Auth0-ready) · adapter layer for OpenAI/Anthropic, email/SMS, S3, Inngest.

Local database is **SQLite** so the app runs without Docker. Production target remains **PostgreSQL** (`docker-compose.yml`). Switch `provider` in `prisma/schema.prisma` and `DATABASE_URL` when Postgres is available.

## Run

```bash
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Role | Email | Password |
|---|---|---|
| Licensed representative | maria@lifey.local | lifey-demo |
| Researcher | alex@lifey.local | lifey-demo |
| Compliance | claire@lifey.local | lifey-demo |
| Claimant portal | michael.smith@example.com | portal-demo |

## Automation

Six background workers run on a scheduler (`src/server/jobs/`), visible and controllable at `/automation`.

| Worker | Interval | Does |
|---|---|---|
| Watched inbox import | 30s | Imports any authorized CSV dropped in `data/inbox`, archives it to `data/processed` |
| Authorized feed fetch | 15m | Pulls operator-configured extract URLs, skips unchanged content by hash |
| Autonomous research | 60s | Queries approved adapters and writes sourced findings into the graph |
| Duplicate & conflict scan | 5m | Flags shared contacts, same-name/city collisions, already-claimed property |
| Rescore and requeue | 2m | Recomputes confidence and score, moves cases between HOT / GOOD / RESEARCH / LOW |
| Draft first-touch outreach | 3m | Drafts a compliant email and opens a human approval request — never sends |

Three ways records enter, all automatic once configured:

```bash
# 1. drop a file
cp extract.csv data/inbox/

# 2. machine ingest
curl -X POST localhost:3000/api/ingest/webhook \
  -H "x-api-key: lifey-demo-webhook-key" -H "Content-Type: application/json" \
  -d '{"records":[{"account_number":"...","owner_name":"..."}]}'

# 3. external cron (serverless deploys)
curl -X POST localhost:3000/api/jobs/tick -H "Authorization: Bearer $CRON_SECRET"
```

Tick interval is `AUTOMATION_TICK_SECONDS` (default 30). `AUTOMATION_DISABLED=1` turns the in-process scheduler off.

**What automation will never do:** send outreach, execute an agreement, file a claim, decide legal entitlement, or mark someone deceased without evidence. Those stay behind `ComplianceService` and a human approval at every automation level.

## Florida compliance (engineered, not legal advice)

- Official recovery agreement path only for Florida-held accounts ([Fla. Stat. § 717.135](https://flsenate.gov/laws/statutes/2025/717.135)). No substitute contingency contracts.
- Default `MAX_FEE_PERCENT` = **30**. Changing it requires a new approved rule set.
- Fees cannot be collected before claim approval on Florida-held property.
- Only a stored, valid FL attorney / CPA / Class C PI with current DFS registration may be the claimant representative.
- First outreach never includes amounts or account numbers.
- NAIC locator is human-authorized only. No scrape, no impersonation, no auto-submit.
- No CAPTCHA bypass, no unofficial UPMIS access.

## Data sources

Implemented: Florida DFS **file import**, manual entry, public-record **fixtures** (so the research agent can run without scraping).

Interfaces only (marked `REQUIRED_PROVIDER`): live DFS/UPMIS, county probate, licensed obituaries, people-data vendors, approved web search, NAIC locator.

Sample import file: `data/sample-dfs-import.csv`.

## Seeded investigation

**John A. Smith**, Tampa — MetLife-associated unclaimed record. Fixture obituary (2019), Hillsborough probate `2019-CP-004812`, personal representative **Michael Smith** (Orlando, contactable). Wife Susan predeceased; daughter Jessica Brown is a known relative, not an auto-heir. Score HOT. Eligibility still unverified.
