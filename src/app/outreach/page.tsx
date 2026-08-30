import { requireStaff } from "@/lib/auth";
import { StaffShell } from "@/components/staff-shell";
import { Card, PageHeader, Pill } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export default async function OutreachPage() {
  const user = await requireStaff();
  const [comms, sequences, suppressions] = await Promise.all([
    prisma.communication.findMany({
      include: { case: { include: { property: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.outreachSequenceTemplate.findMany({ include: { steps: { orderBy: { order: "asc" } } } }),
    prisma.suppressionEntry.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <StaffShell user={user}>
      <PageHeader
        eyebrow="CRM"
        title="Outreach"
        description="Independent private recovery company. First-touch copy never includes amounts or account numbers. Conflicts and suppressions block sends."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-lg">Messages</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {comms.map((c) => (
              <li key={c.id} className="border-b border-line pb-3">
                <div className="flex justify-between">
                  <span>
                    {c.case.property.ownerNameRaw} · {c.channel}
                  </span>
                  <Pill>{c.status}</Pill>
                </div>
                <p className="mt-1 text-ink-soft">{c.body.slice(0, 180)}…</p>
                <p className="text-xs text-ink-soft">{formatDate(c.sentAt || c.createdAt)}</p>
              </li>
            ))}
          </ul>
        </Card>
        <div className="space-y-4">
          <Card>
            <h2 className="text-lg">Cadence</h2>
            {sequences.map((s) => (
              <ul key={s.id} className="mt-3 space-y-1 text-sm">
                {s.steps.map((st) => (
                  <li key={st.id}>
                    Day {st.dayOffset} · {st.channel}
                  </li>
                ))}
              </ul>
            ))}
          </Card>
          <Card>
            <h2 className="text-lg">Suppressions</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {suppressions.map((s) => (
                <li key={s.id}>
                  {s.channel} · {s.reason}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </StaffShell>
  );
}
