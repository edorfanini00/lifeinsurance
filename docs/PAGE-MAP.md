# lifey — Page map

## Staff application

Institutional, financial, minimal. No decorative “AI” chrome.

| Route | Nav | Primary job |
|---|---|---|
| `/login` | — | Staff authentication |
| `/dashboard` | Dashboard | Pipeline dollars, funnel, conversion |
| `/opportunities` | Opportunities | Scored rows: owner, location, type, value, deceased, relative, contact, score, stage |
| `/opportunities/[id]` | — | Research intelligence: owner, property, graph, evidence drawer |
| `/research` | Research | Agent objectives, runs, stop reasons |
| `/people` | People | Resolved persons + aliases |
| `/people/[id]` | — | Dossier, relationships, contacts, death, evidence |
| `/outreach` | Outreach | Sequences, drafts awaiting approval, suppressions |
| `/cases` | Cases | Kanban and table of case statuses |
| `/cases/[id]` | — | Workspace: tasks, comms, docs, next action |
| `/claims` | Claims | Submitted / DFS review / approved / denied |
| `/tasks` | Tasks | Human work queue |
| `/approvals` | (badge on Tasks) | First-touch, submit, entitlement, claimant change |
| `/analytics` | Analytics | Aging, conversion, fee yield |
| `/compliance` | Compliance | Representatives, rule versions, audit search |
| `/settings` | Settings | Automation level, scoring, org identity |

## Claimant portal

Copy is eligibility-neutral. Property match ≠ entitlement.

| Route | Job |
|---|---|
| `/portal/login` | Verify email or phone |
| `/portal` | Open cases and missing documents |
| `/portal/cases/[id]` | Associated property, stage, messages, schedule |
| `/portal/documents` | Encrypted uploads |
| `/portal/agreement` | Florida recovery agreement execution status |

## Evidence drawer (global)

Any fact click opens: source name, retrieval date, raw value, AI interpretation, finding class (`FACT` / `INFERENCE` / `UNVERIFIED_POSSIBILITY`).
