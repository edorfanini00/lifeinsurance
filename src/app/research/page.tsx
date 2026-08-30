import { requireStaff } from "@/lib/auth";
import { StaffShell } from "@/components/staff-shell";
import { Card, PageHeader, Pill } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { adapters } from "@/server/adapters/registry";

export default async function ResearchPage() {
  const user = await requireStaff();
  const runs = await prisma.aiResearchRun.findMany({
    orderBy: { createdAt: "desc" },
    include: { findings: true, case: true },
    take: 25,
  });

  return (
    <StaffShell user={user}>
      <PageHeader
        eyebrow="Investigation"
        title="Research agent"
        description="Approved adapters only. Stub adapters explain which licensed provider is required. Inferences are never stored as facts."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg">Source adapters</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {adapters.map((a) => (
              <li key={a.id} className="border-b border-line pb-3">
                <div className="flex justify-between">
                  <span>{a.displayName}</span>
                  <Pill tone={a.implemented ? "good" : "muted"}>{a.implemented ? "live" : "interface"}</Pill>
                </div>
                <p className="text-xs text-ink-soft">{a.legalNotes}</p>
                {a.requiredProvider && (
                  <p className="text-xs text-gold">REQUIRED_PROVIDER: {a.requiredProvider}</p>
                )}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="text-lg">Recent runs</h2>
          <ul className="mt-4 space-y-4 text-sm">
            {runs.map((r) => (
              <li key={r.id} className="border-b border-line pb-3">
                <p>{r.objective}</p>
                <p className="text-xs text-ink-soft">
                  {r.model} · {r.promptVersion} · {formatDate(r.createdAt)} · {r.confidence ?? "—"}%
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.findings.map((f) => (
                    <Pill key={f.id} tone={f.kind === "FACT" ? "good" : "muted"}>
                      {f.kind}
                    </Pill>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </StaffShell>
  );
}
