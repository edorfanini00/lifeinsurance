import { requireStaff } from "@/lib/auth";
import { StaffShell } from "@/components/staff-shell";
import { Card, PageHeader, Pill } from "@/components/ui";
import { prisma } from "@/lib/db";
import { jobs } from "@/server/jobs/registry";
import { schedulerState } from "@/server/jobs/runner";
import { formatDate } from "@/lib/utils";
import { AutomationControls, JobRunButton, ToggleButton } from "@/components/automation-controls";
import { INBOX_DIR } from "@/server/jobs/jobs/ingest-inbox";

export const dynamic = "force-dynamic";

export default async function AutomationPage() {
  const user = await requireStaff();
  const [config, runs, feeds] = await Promise.all([
    prisma.automationConfig.upsert({
      where: { organizationId: user.organizationId },
      update: {},
      create: { organizationId: user.organizationId },
    }),
    prisma.jobRun.findMany({ orderBy: { startedAt: "desc" }, take: 40 }),
    prisma.ingestFeed.findMany({ where: { organizationId: user.organizationId } }),
  ]);
  const state = schedulerState();

  const toggles = [
    ["enabled", "Automation master switch"],
    ["inboxEnabled", "Watched inbox import"],
    ["feedEnabled", "Authorized feed fetch"],
    ["autoResearch", "Autonomous research"],
    ["autoConflicts", "Duplicate & conflict scan"],
    ["autoScore", "Rescore and requeue"],
    ["autoDraftOutreach", "Draft first-touch outreach"],
  ] as const;

  return (
    <StaffShell user={user}>
      <PageHeader
        eyebrow="Background workers"
        title="Automation"
        description="Ingest, research, dedupe, and scoring run on a schedule with no human in the loop. Sending outreach, executing agreements, and filing claims remain human-gated by design."
        actions={<AutomationControls />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="text-lg">Scheduler</h2>
          <p className="mt-2 text-sm">
            <Pill tone={state.active && config.enabled ? "good" : "warn"}>
              {config.enabled ? (state.active ? "running" : "idle") : "paused"}
            </Pill>
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            Tick every {process.env.AUTOMATION_TICK_SECONDS || 30}s · started {formatDate(state.startedAt)}
          </p>
          <p className="mt-2 text-xs text-ink-soft">
            For serverless deploys, point a cron at <code>POST /api/jobs/tick</code> with a{" "}
            <code>CRON_SECRET</code> bearer token instead.
          </p>
        </Card>

        <Card>
          <h2 className="text-lg">Drop folder</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Any authorized CSV extract placed here is imported within 30 seconds and archived to{" "}
            <code>data/processed</code>.
          </p>
          <p className="mt-2 font-mono text-xs break-all">{INBOX_DIR}</p>
        </Card>

        <Card>
          <h2 className="text-lg">Machine ingest</h2>
          <p className="mt-2 text-sm text-ink-soft">
            An upstream system you control can post records directly:
          </p>
          <p className="mt-2 font-mono text-xs">POST /api/ingest/webhook</p>
          <p className="mt-1 text-xs text-ink-soft">
            Header <code>x-api-key</code>. Body: CSV, or JSON <code>{`{ records: [...] }`}</code>.
            {config.webhookKeyHash ? " A key is configured." : " No key set yet."}
          </p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg">Workers</h2>
          <ul className="mt-4 space-y-4 text-sm">
            {jobs.map((job) => {
              const last = runs.find((r) => r.jobId === job.id);
              const gated = (job.requires || []).some(
                (f) => config[f as keyof typeof config] !== true,
              );
              return (
                <li key={job.id} className="border-b border-line pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <span>{job.name}</span>
                    <div className="flex items-center gap-2">
                      <Pill tone={gated ? "muted" : "good"}>{gated ? "off" : `${job.everySeconds}s`}</Pill>
                      <JobRunButton jobId={job.id} />
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">{job.description}</p>
                  {last && (
                    <p className="mt-1 text-xs text-ink-soft">
                      Last {last.status.toLowerCase()} · {last.itemsProcessed} processed ·{" "}
                      {last.itemsCreated} written · {formatDate(last.startedAt)}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="text-lg">Switches</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {toggles.map(([field, label]) => (
                <li key={field} className="flex items-center justify-between border-b border-line py-1">
                  <span>{label}</span>
                  <ToggleButton field={field} value={config[field] as boolean} />
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="text-lg">Authorized feeds</h2>
            {feeds.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {feeds.map((f) => (
                  <li key={f.id}>
                    {f.name} · {f.enabled ? "enabled" : "disabled"} · last {formatDate(f.lastFetchedAt)}
                    <span className="block text-xs text-ink-soft">{f.legalBasis}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ink-soft">
                None configured. A feed must be an extract URL your organization is legally permitted to
                fetch. The platform will not point a scraper at credentialed or CAPTCHA-protected search
                pages.
              </p>
            )}
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <h2 className="text-lg">Run history</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-ink-soft">
              <tr>
                <th className="py-2 pr-3">Job</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Processed</th>
                <th className="py-2 pr-3">Written</th>
                <th className="py-2 pr-3">Trigger</th>
                <th className="py-2 pr-3">Detail</th>
                <th className="py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-t border-line align-top">
                  <td className="py-2 pr-3">{r.jobId}</td>
                  <td className="py-2 pr-3">
                    <Pill
                      tone={
                        r.status === "SUCCEEDED" ? "good" : r.status === "FAILED" ? "warn" : "muted"
                      }
                    >
                      {r.status}
                    </Pill>
                  </td>
                  <td className="py-2 pr-3 tabular">{r.itemsProcessed}</td>
                  <td className="py-2 pr-3 tabular">{r.itemsCreated}</td>
                  <td className="py-2 pr-3 text-xs text-ink-soft">{r.triggeredBy}</td>
                  <td className="max-w-md py-2 pr-3 text-xs text-ink-soft">{r.error || r.detail}</td>
                  <td className="py-2 text-xs text-ink-soft">{formatDate(r.startedAt)}</td>
                </tr>
              ))}
              {!runs.length && (
                <tr>
                  <td className="py-3 text-ink-soft" colSpan={7}>
                    No runs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </StaffShell>
  );
}
