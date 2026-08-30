import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { StaffShell } from "@/components/staff-shell";
import { PageHeader, Pill } from "@/components/ui";
import { prisma } from "@/lib/db";

export default async function PeoplePage() {
  const user = await requireStaff();
  const people = await prisma.person.findMany({
    where: { organizationId: user.organizationId },
    include: { death: true, contacts: true, aliases: true },
    orderBy: { canonicalFullName: "asc" },
  });

  return (
    <StaffShell user={user}>
      <PageHeader
        eyebrow="Entities"
        title="People"
        description="Resolved identities. Namesakes are not merged automatically."
      />
      <div className="overflow-x-auto border border-line bg-white/70">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper-2 text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">County</th>
              <th className="px-3 py-2">Identity</th>
              <th className="px-3 py-2">Contacts</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="px-3 py-3">
                  <Link className="hover:underline" href={`/people/${p.id}`}>
                    {p.canonicalFullName}
                  </Link>
                </td>
                <td className="px-3 py-3">
                  <Pill tone={p.death ? "warn" : "muted"}>{p.livingStatus}</Pill>
                </td>
                <td className="px-3 py-3">{p.county || "—"}</td>
                <td className="px-3 py-3">{p.identityConfidence}</td>
                <td className="px-3 py-3">{p.contacts.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StaffShell>
  );
}
