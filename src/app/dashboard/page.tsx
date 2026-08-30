import { requireStaff } from "@/lib/auth";
import { StaffShell } from "@/components/staff-shell";
import { Card, Metric, PageHeader } from "@/components/ui";
import { dashboardMetrics } from "@/server/services/metrics";
import { dollars } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireStaff();
  const m = await dashboardMetrics(user.organizationId);
  const p = m.pipeline;

  return (
    <StaffShell user={user}>
      <PageHeader
        eyebrow="Executive"
        title="Recovery pipeline"
        description="Identified dollars are public-record estimates, not confirmed entitlements. Fees are recognized only after a Florida-held claim is approved."
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Identified" value={dollars(p.identified)} />
        <Metric label="Researched" value={dollars(p.researched)} />
        <Metric label="Contacted" value={dollars(p.contacted)} />
        <Metric label="Contracted" value={dollars(p.contracted)} />
        <Metric label="Submitted" value={dollars(p.submitted)} />
        <Metric label="Approved" value={dollars(p.approved)} />
        <Metric label="Fee revenue" value={dollars(p.feeRevenue)} hint="After approved claims only" />
        <Metric label="Conversion" value={`${m.rates.conversion}%`} hint="Approved / all cases" />
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-ink-soft">Properties</p>
          <p className="mt-2 font-serif text-3xl">{m.counts.properties}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-ink-soft">Insurance-related</p>
          <p className="mt-2 font-serif text-3xl">{m.counts.insuranceRelated}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-ink-soft">Deceased owners</p>
          <p className="mt-2 font-serif text-3xl">{m.counts.deceased}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-ink-soft">Outreach sent</p>
          <p className="mt-2 font-serif text-3xl">{m.counts.outreachSent}</p>
        </Card>
      </div>
      <Card className="mt-8">
        <h2 className="text-xl">Stage funnel</h2>
        <ol className="mt-4 space-y-2 text-sm">
          {[
            ["Identified", p.identified],
            ["Researched", p.researched],
            ["Contacted", p.contacted],
            ["Contracted", p.contracted],
            ["Submitted", p.submitted],
            ["Approved", p.approved],
          ].map(([label, cents]) => (
            <li key={String(label)} className="flex justify-between border-b border-line py-2">
              <span>{label}</span>
              <span className="tabular">{dollars(Number(cents))}</span>
            </li>
          ))}
        </ol>
      </Card>
    </StaffShell>
  );
}
