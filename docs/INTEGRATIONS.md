# lifey — Integrations

No private or unofficial API is assumed. Uncertain sources are interfaces with `REQUIRED_PROVIDER`.

| Capability | Interface | Implemented adapters | Required to go live |
|---|---|---|---|
| Staff / portal auth | `AuthProvider` | `LocalStaffAuth`, `LocalClaimantAuth` | Clerk or Auth0 keys if those adapters are selected |
| Florida property | `SourceAdapter` | `florida-dfs-import`, `manual-entry` | Legal file extract or official UPMIS access |
| Obituaries | `SourceAdapter` | `fixture-public-records` (demo) | Licensed news/obituary API |
| Probate | `SourceAdapter` | fixture + interface | County clerk feed or manual import |
| People enrichment | `SourceAdapter` | interface | Contracted permitted vendor |
| Web search | `SearchProvider` | interface | Approved search API |
| NAIC locator | `LostPolicyProvider` | checklist only | Authorized claimant + official process |
| LLM | `AiProvider` | Heuristic, OpenAI, Anthropic | `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` |
| Email | `EmailProvider` | Console/log | Resend/SES/Postmark |
| SMS | `SmsProvider` | Console/log | Twilio |
| Voice | `VoiceProvider` | Scripted agent module | Twilio + policy review |
| Jobs | `JobRunner` | In-process | Inngest or Trigger.dev |
| Files | `ObjectStore` | Encrypted local disk | S3-compatible bucket + KMS |
| E-sign | `SignatureProvider` | Manual/wet-ink tracker | DFS-authorized eSignature product |

## What will never be built

- CAPTCHA solving or DFS/UPMIS credential stuffing
- Scrapers that ignore robots, rate limits, or login walls
- Automatic NAIC locator filing
- Purchase of breach/leak data
