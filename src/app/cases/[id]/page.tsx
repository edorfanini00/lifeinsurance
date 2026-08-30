import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { StaffShell } from "@/components/staff-shell";
import { Card, PageHeader, Pill } from "@/components/ui";
import { prisma } from "@/lib/db";
import { dollars, formatDate, statusLabel } from "@/lib/utils";

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  const kase = await prisma.case.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      property: true,
      tasks: true,
      communications: true,
      documents: true,
      agreements: true,
      claims: { include: { events: true } },
      conflicts: true,
      representative: true,
      people: { include: { person: true } },
    },
  });
  if (!kase) notFound();

  return (
    <StaffShell user={user}>
      <PageHeader
        eyebrow={kase.caseNumber}
        title={kase.property.ownerNameRaw}
        description={`${statusLabel(kase.status)} · ${kase.type.replaceAll("_", " ")}`}
        actions={
          <Link className="border border-line px-3 py-2 text-sm" href={`/opportunities/${kase.id}`}>
            Research view
          </Link>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="text-lg">Next action</h2>
          <p className="mt-2 text-sm">{kase.nextAction}</p>
          <p className="mt-1 text-sm text-ink-soft">{kase.nextActionReason}</p>
        </Card>
        <Card>
          <h2 className="text-lg">Representative</h2>
          <p className="mt-2 text-sm">{kase.representative?.name || "Not attached"}</p>
          <p className="text-xs text-ink-soft">
            {kase.representative
              ? `${kase.representative.type} · ${kase.representative.licenseNumber} · DFS ${kase.representative.dfsRegistrationId}`
              : "Submission blocked until a valid FL representative is attached."}
          </p>
        </Card>
        <Card>
          <h2 className="text-lg">Value</h2>
          <p className="mt-2 font-serif text-3xl">{dollars(kase.property.estimatedValueCents)}</p>
        </Card>
      </div>
      {kase.conflicts.length > 0 && (
        <Card className="mt-4">
          <h2 className="text-lg">Conflicts</h2>
          {kase.conflicts.map((c) => (
            <p key={c.id} className="mt-2 text-sm text-danger">
              {c.type}: {c.detail}
            </p>
          ))}
        </Card>
      )}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg">Tasks</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {kase.tasks.map((t) => (
              <li key={t.id}>
                <Pill>{t.status}</Pill> {t.title}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="text-lg">Documents</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {kase.documents.map((d) => (
              <li key={d.id}>
                {d.type.replaceAll("_", " ")} · {d.status}
              </li>
            ))}
            {!kase.documents.length && <li className="text-ink-soft">None requested yet.</li>}
          </ul>
        </Card>
        <Card>
          <h2 className="text-lg">Agreements</h2>
          {kase.agreements.map((a) => (
            <p key={a.id} className="mt-2 text-sm">
              {a.type} v{a.version} · {a.feePercent}% · executed {formatDate(a.executedAt)}
            </p>
          ))}
          {!kase.agreements.length && (
            <p className="mt-2 text-sm text-ink-soft">
              Florida-held accounts must use DFS-UP-309. No substitute contingency contract will be generated.
            </p>
          )}
        </Card>
        <Card>
          <h2 className="text-lg">Claims</h2>
          {kase.claims.map((c) => (
            <div key={c.id} className="mt-2 text-sm">
              <p>
                {c.formCode} · {c.status}
              </p>
              {c.events.map((e) => (
                <p key={e.id} className="text-ink-soft">
                  {e.type}: {e.detail}
                </p>
              ))}
            </div>
          ))}
        </Card>
      </div>
    </StaffShell>
  );
}
