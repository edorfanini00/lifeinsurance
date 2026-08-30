import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { StaffShell } from "@/components/staff-shell";
import { PageHeader, Pill } from "@/components/ui";
import { prisma } from "@/lib/db";
import { dollars, statusLabel } from "@/lib/utils";

export default async function OpportunitiesPage() {
  const user = await requireStaff();
  const cases = await prisma.case.findMany({
    where: { organizationId: user.organizationId },
    include: {
      property: true,
      people: { include: { person: { include: { death: true, contacts: true } } } },
    },
    orderBy: { opportunityScore: "desc" },
  });

  return (
    <StaffShell user={user}>
      <PageHeader
        eyebrow="Queue"
        title="Opportunities"
        description="Ranked investigations. A high score is not a determination that anyone is entitled to the property."
      />
      <div className="overflow-x-auto border border-line bg-white/70">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-paper-2 text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Potential value</th>
              <th className="px-3 py-2">Deceased</th>
              <th className="px-3 py-2">Relative</th>
              <th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Stage</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => {
              const owner = c.people.find((p) => p.role === "owner")?.person;
              const relative = c.people.find((p) => p.role === "relative")?.person;
              return (
                <tr key={c.id} className="border-t border-line">
                  <td className="px-3 py-3">
                    <Link className="underline-offset-2 hover:underline" href={`/opportunities/${c.id}`}>
                      {owner?.canonicalFullName || c.property.ownerNameRaw}
                    </Link>
                    <div className="text-xs text-ink-soft">{c.caseNumber}</div>
                  </td>
                  <td className="px-3 py-3">
                    {c.property.city}, {c.property.state}
                  </td>
                  <td className="px-3 py-3">{c.property.categoryRaw}</td>
                  <td className="px-3 py-3 tabular">{dollars(c.property.estimatedValueCents)}</td>
                  <td className="px-3 py-3">{owner?.death ? "Yes" : "Unverified"}</td>
                  <td className="px-3 py-3">{relative ? "Yes" : "—"}</td>
                  <td className="px-3 py-3">{relative?.contacts.length ? "Yes" : "—"}</td>
                  <td className="px-3 py-3">
                    <Pill tone={c.queue === "HOT" ? "hot" : c.queue === "GOOD" ? "good" : "muted"}>
                      {c.opportunityScore} {c.queue}
                    </Pill>
                  </td>
                  <td className="px-3 py-3">{statusLabel(c.status)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </StaffShell>
  );
}
