import { requireStaff } from "@/lib/auth";
import { StaffShell } from "@/components/staff-shell";
import { Card, PageHeader, Pill } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { DfsImportForm } from "@/components/dfs-import-form";

export default async function CompliancePage() {
  const user = await requireStaff();
  const [reps, rules, logs] = await Promise.all([
    prisma.representative.findMany({ where: { organizationId: user.organizationId } }),
    prisma.complianceRuleSet.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { version: "desc" },
    }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { user: true } }),
  ]);

  return (
    <StaffShell user={user}>
      <PageHeader
        eyebrow="Chapter 717"
        title="Compliance"
        description="Florida-held property uses official DFS recovery agreements only. Fee cap 30% unless a later approved rule set says otherwise. Not legal advice."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg">Claimant representatives</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {reps.map((r) => (
              <li key={r.id}>
                <div className="flex justify-between">
                  <span>{r.name}</span>
                  <Pill tone={r.status === "ACTIVE" && r.dfsRegistered ? "good" : "warn"}>{r.status}</Pill>
                </div>
                <p className="text-ink-soft">
                  {r.type.replaceAll("_", " ")} · {r.licenseNumber} · DFS {r.dfsRegistrationId} · exp{" "}
                  {formatDate(r.registrationExpires)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="text-lg">Rule sets</h2>
          {rules.map((r) => (
            <p key={r.id} className="mt-2 text-sm">
              v{r.version} · max fee {r.maxFeePercent}% · {r.active ? "active" : "inactive"}
              <span className="block text-ink-soft">{r.notes}</span>
            </p>
          ))}
        </Card>
      </div>
      <Card className="mt-4">
        <h2 className="text-lg">Florida DFS import</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Upload a CSV you are legally permitted to hold. Columns: account_number, owner_name, city, state, zip,
          holder, property_type, description, reporting_year, amount, source_url.
        </p>
        <DfsImportForm />
      </Card>
      <Card className="mt-4">
        <h2 className="text-lg">Audit log</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {logs.map((l) => (
            <li key={l.id} className="flex justify-between border-b border-line py-1">
              <span>
                {l.action} · {l.entityType} · {l.user?.name || "system"}
              </span>
              <span className="text-ink-soft">{formatDate(l.createdAt)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </StaffShell>
  );
}
