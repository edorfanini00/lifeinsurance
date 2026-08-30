import { requireStaff } from "@/lib/auth";
import { StaffShell } from "@/components/staff-shell";
import { Card, PageHeader, Pill } from "@/components/ui";
import { prisma } from "@/lib/db";
import { ApprovalButtons } from "@/components/approval-buttons";

export default async function TasksPage() {
  const user = await requireStaff();
  const [tasks, approvals] = await Promise.all([
    prisma.task.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS", "BLOCKED"] } },
      include: { case: { include: { property: true } }, assignee: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.approvalRequest.findMany({
      where: { status: "PENDING" },
      include: { case: { include: { property: true } }, requester: true },
    }),
  ]);

  return (
    <StaffShell user={user}>
      <PageHeader eyebrow="Work queue" title="Tasks & approvals" description="Human gates for first outreach, entitlement, submission, and disputed closures." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg">Approvals</h2>
          <ul className="mt-4 space-y-4 text-sm">
            {approvals.map((a) => (
              <li key={a.id} className="border-b border-line pb-3">
                <p>
                  {a.type.replaceAll("_", " ")} · {a.case?.property.ownerNameRaw}
                </p>
                <p className="text-ink-soft">{a.reason}</p>
                <p className="text-xs text-ink-soft">Requested by {a.requester.name}</p>
                <ApprovalButtons id={a.id} />
              </li>
            ))}
            {!approvals.length && <li className="text-ink-soft">No pending approvals.</li>}
          </ul>
        </Card>
        <Card>
          <h2 className="text-lg">Open tasks</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {tasks.map((t) => (
              <li key={t.id}>
                <Pill>{t.status}</Pill> {t.title}
                <p className="text-ink-soft">{t.case.property.ownerNameRaw}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </StaffShell>
  );
}
