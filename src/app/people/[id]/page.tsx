import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { StaffShell } from "@/components/staff-shell";
import { Card, PageHeader, Pill } from "@/components/ui";
import { prisma } from "@/lib/db";
import { decryptPii } from "@/lib/crypto";
import { formatDate } from "@/lib/utils";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      death: true,
      addresses: true,
      aliases: true,
      contacts: true,
      fromRelationships: { include: { toPerson: true } },
      toRelationships: { include: { fromPerson: true } },
      casePeople: { include: { case: true } },
    },
  });
  if (!person) notFound();

  return (
    <StaffShell user={user}>
      <PageHeader title={person.canonicalFullName} description={`Identity confidence ${person.identityConfidence}. SSN last-four is stored only if lawfully obtained; none in this record.`} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg">Profile</h2>
          <p className="mt-3 text-sm">Living status: {person.livingStatus}</p>
          <p className="text-sm">County: {person.county || "—"}</p>
          <p className="text-sm">Last address: {person.lastKnownAddress || "—"}</p>
          {person.death && (
            <p className="mt-2 text-sm">
              Death: {formatDate(person.death.dateOfDeath)} · {person.death.location} · source confidence {person.death.confidence}
            </p>
          )}
        </Card>
        <Card>
          <h2 className="text-lg">Contacts</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {person.contacts.map((c) => (
              <li key={c.id}>
                {c.channel} · {decryptPii(c.valueEnc)} · {c.confidence}
              </li>
            ))}
            {!person.contacts.length && <li className="text-ink-soft">None on file.</li>}
          </ul>
        </Card>
        <Card>
          <h2 className="text-lg">Relationships</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {person.fromRelationships.map((r) => (
              <li key={r.id}>
                {r.type} → {r.toPerson.canonicalFullName} <Pill>{r.confidence}</Pill>
              </li>
            ))}
            {person.toRelationships.map((r) => (
              <li key={r.id}>
                {r.fromPerson.canonicalFullName} → {r.type}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="text-lg">Cases</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {person.casePeople.map((cp) => (
              <li key={cp.id}>
                {cp.case.caseNumber} · {cp.role} · {cp.claimantCategory || "uncategorized"}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </StaffShell>
  );
}
