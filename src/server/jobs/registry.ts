import type { JobDefinition } from "./types";
import { ingestInboxJob } from "./jobs/ingest-inbox";
import { ingestFeedJob } from "./jobs/ingest-feed";
import { autoResearchJob } from "./jobs/auto-research";
import { autoScoreJob } from "./jobs/auto-score";
import { autoConflictsJob } from "./jobs/auto-conflicts";
import { autoDraftOutreachJob } from "./jobs/auto-draft-outreach";

/** Order matters: ingest, then enrich, then dedupe, then score, then draft. */
export const jobs: JobDefinition[] = [
  ingestInboxJob,
  ingestFeedJob,
  autoResearchJob,
  autoConflictsJob,
  autoScoreJob,
  autoDraftOutreachJob,
];

export function getJob(id: string) {
  const job = jobs.find((j) => j.id === id);
  if (!job) throw new Error(`Unknown job: ${id}`);
  return job;
}
