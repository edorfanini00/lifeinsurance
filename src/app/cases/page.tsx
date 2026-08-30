import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { StaffShell } from "@/components/staff-shell";
import { Card, PageHeader, Pill } from "@/components/ui";
import { prisma } from "@/lib/db";
import { CASE_COLUMNS } from "@/lib/constants";
import { dollars, statusLabel } from "@/lib/utils";

export default async function CasesPage() {
  const user = await requireStaff();
  const cases = await prisma.case.findMany({
    where: { organizationId: user.organizationId },
    include: { property: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <StaffShell user={user}>
      <PageHeader eyebrow="Operations" title="Cases" description="Kanban of investigation stages. Disputed and conflicted cases stay out of automated outreach." />
      <div className="flex gap-3 overflow-x-auto pb-4">
        {CASE_COLUMNS.map((col) => (
          <Card key={col.status} className="min-w-[220px] flex-1">
            <h2 className="text-sm uppercase tracking-wide text-ink-soft">{col.label}</h2>
            <ul className="mt-3 space-y-2">
              {cases
                .filter((c) => c.status === col.status || (col.status === "CLAIM_SUBMITTED" && c.status === "DFS_REVIEW"))
                .map((c) => (
                  <li key={c.id} className="border border-line bg-paper p-3 text-sm">
                    <Link href={`/cases/${c.id}`}>{c.property.ownerNameRaw}</Link>
                    <p className="text-xs text-ink-soft">{dollars(c.property.estimatedValueCents)}</p>
                  </li>
                ))}
            </ul>
          </Card>
        ))}
      </div>
      <div className="mt-8 overflow-x-auto border border-line bg-white/70">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper-2 text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-3 py-2">Case</th>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Score</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="px-3 py-2">
                  <Link href={`/cases/${c.id}`}>{c.caseNumber}</Link>
                </td>
                <td className="px-3 py-2">{c.property.ownerNameRaw}</td>
                <td className="px-3 py-2">
                  <Pill>{statusLabel(c.status)}</Pill>
                </td>
                <td className="px-3 py-2">{c.opportunityScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StaffShell>
  );
}
