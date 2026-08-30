export type JobContext = {
  organizationId: string;
  actorUserId: string;
  triggeredBy: string;
};

export type JobResult = {
  processed: number;
  created: number;
  detail: string;
  skipped?: boolean;
};

export type JobDefinition = {
  id: string;
  name: string;
  description: string;
  everySeconds: number;
  /** Automation flags that must be enabled for this job to run. */
  requires?: (
    | "inboxEnabled"
    | "feedEnabled"
    | "autoResearch"
    | "autoScore"
    | "autoConflicts"
    | "autoDraftOutreach"
  )[];
  run(ctx: JobContext): Promise<JobResult>;
};
