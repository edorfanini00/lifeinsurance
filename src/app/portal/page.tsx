import Link from "next/link";
import { requireClaimant } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LogoutButton } from "@/components/logout-button";
import { Card } from "@/components/ui";
import { propertyMatchNotice } from "@/lib/copy";
import { statusLabel } from "@/lib/utils";

export default async function PortalHome() {
  const user = await requireClaimant();
  const cases = await prisma.case.findMany({
    where: {
      organizationId: user.organizationId,
      people: { some: { person: { users: { some: { id: user.id } } } } },
    },
    include: { property: true, documents: true, tasks: true },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <p className="font-serif text-3xl">lifey</p>
        <LogoutButton />
      </header>
      <p className="text-sm text-ink-soft">Signed in as {user.name}</p>
      <h1 className="mt-4 text-3xl">Your cases</h1>
      <div className="mt-6 space-y-4">
        {cases.map((c) => (
          <Card key={c.id}>
            <p className="text-xs uppercase tracking-wide text-gold">{c.caseNumber}</p>
            <h2 className="mt-1 text-xl">{c.property.ownerNameRaw}</h2>
            <p className="mt-2 text-sm">{propertyMatchNotice(c.property.ownerNameRaw)}</p>
            <p className="mt-2 text-sm text-ink-soft">Stage: {statusLabel(c.status)}</p>
            <p className="text-sm text-ink-soft">
              Missing documents: {c.documents.filter((d) => d.status === "REQUESTED").length}
            </p>
            <Link className="mt-3 inline-block text-sm underline" href={`/portal/cases/${c.id}`}>
              Open case
            </Link>
          </Card>
        ))}
        {!cases.length && <p className="text-sm text-ink-soft">No cases are linked to this portal user.</p>}
      </div>
    </div>
  );
}
