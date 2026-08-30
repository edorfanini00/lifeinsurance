import { notFound } from "next/navigation";
import { requireClaimant } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui";
import { propertyMatchNotice } from "@/lib/copy";
import { statusLabel } from "@/lib/utils";
import { LogoutButton } from "@/components/logout-button";

export default async function PortalCase({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireClaimant();
  const { id } = await params;
  const kase = await prisma.case.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
      people: { some: { person: { users: { some: { id: user.id } } } } },
    },
    include: {
      property: true,
      documents: true,
      communications: { where: { channel: "PORTAL" } },
      agreements: true,
    },
  });
  if (!kase) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex justify-between">
        <p className="font-serif text-3xl">lifey</p>
        <LogoutButton />
      </header>
      <h1 className="text-3xl">Case {kase.caseNumber}</h1>
      <p className="mt-3 text-sm">{propertyMatchNotice(kase.property.ownerNameRaw)}</p>
      <div className="mt-6 grid gap-4">
        <Card>
          <h2 className="text-lg">Associated property</h2>
          <p className="mt-2 text-sm">Reported owner: {kase.property.ownerNameRaw}</p>
          <p className="text-sm">Holder: reported on the public record</p>
          <p className="text-sm">Stage: {statusLabel(kase.status)}</p>
          <p className="mt-2 text-xs text-ink-soft">
            We do not display dollar amounts or account numbers here until a licensed representative confirms
            disclosure is appropriate.
          </p>
        </Card>
        <Card>
          <h2 className="text-lg">Documents</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {kase.documents.map((d) => (
              <li key={d.id}>
                {d.type.replaceAll("_", " ")} — {d.status}
              </li>
            ))}
            {!kase.documents.length && <li>No documents requested yet.</li>}
          </ul>
          <p className="mt-3 text-xs text-ink-soft">
            Uploads are accepted through a signed, short-lived URL in production. Public object URLs are never used.
          </p>
        </Card>
        <Card>
          <h2 className="text-lg">Florida recovery agreement</h2>
          {kase.agreements.length ? (
            kase.agreements.map((a) => (
              <p key={a.id} className="mt-2 text-sm">
                {a.type} version {a.version}. Official DFS form only.
              </p>
            ))
          ) : (
            <p className="mt-2 text-sm">
              If this matter proceeds, you would be asked to review the official Florida Unclaimed Property Recovery
              Agreement (DFS-UP-309), not a substitute contingency contract.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
