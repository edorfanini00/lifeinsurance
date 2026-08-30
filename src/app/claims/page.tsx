import { requireStaff } from "@/lib/auth";
import { StaffShell } from "@/components/staff-shell";
import { PageHeader, Pill } from "@/components/ui";
import { prisma } from "@/lib/db";
import { dollars, formatDate } from "@/lib/utils";

export default async function ClaimsPage() {
  const user = await requireStaff();
  const claims = await prisma.claim.findMany({
    include: { case: { include: { property: true, representative: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <StaffShell user={user}>
      <PageHeader
        eyebrow="DFS / insurer"
        title="Claims"
        description="Submission is blocked without a valid Florida claimant representative. This system does not file electronically with UPMIS unless official access is configured."
      />
      <div className="overflow-x-auto border border-line bg-white/70">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper-2 text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-3 py-2">Account</th>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Form</th>
              <th className="px-3 py-2">Rep</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Approved</th>
              <th className="px-3 py-2">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="px-3 py-2">{c.case.property.accountNumber}</td>
                <td className="px-3 py-2">{c.case.property.ownerNameRaw}</td>
                <td className="px-3 py-2">{c.formCode}</td>
                <td className="px-3 py-2">{c.case.representative?.name || "—"}</td>
                <td className="px-3 py-2">
                  <Pill tone={c.status === "APPROVED" ? "good" : "muted"}>{c.status}</Pill>
                </td>
                <td className="px-3 py-2">{dollars(c.approvedCents)}</td>
                <td className="px-3 py-2">{formatDate(c.submittedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StaffShell>
  );
}
