import { requireStaff } from "@/lib/auth";
import { StaffShell } from "@/components/staff-shell";
import { Card, Metric, PageHeader } from "@/components/ui";
import { dashboardMetrics } from "@/server/services/metrics";
import { dollars } from "@/lib/utils";

export default async function AnalyticsPage() {
  const user = await requireStaff();
  const m = await dashboardMetrics(user.organizationId);
  const avg =
    m.counts.approved && m.pipeline.approved
      ? Math.round(m.pipeline.approved / m.counts.approved)
      : 0;

  return (
    <StaffShell user={user}>
      <PageHeader eyebrow="Analytics" title="Yield and aging" description="Operational metrics from live case data. Not a promise of recovery." />
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Avg approved recovery" value={dollars(avg)} />
        <Metric label="Avg fee (30% cap)" value={dollars(Math.round(avg * 0.3))} />
        <Metric label="Response rate" value={`${m.rates.response}%`} />
      </div>
      <Card className="mt-6">
        <h2 className="text-lg">Queue mix</h2>
        <ul className="mt-3 text-sm">
          {["HOT", "GOOD", "RESEARCH", "LOW_PRIORITY"].map((q) => (
            <li key={q} className="flex justify-between border-b border-line py-2">
              <span>{q.replaceAll("_", " ")}</span>
              <span>{m.cases.filter((c) => c.queue === q).length}</span>
            </li>
          ))}
        </ul>
      </Card>
    </StaffShell>
  );
}
