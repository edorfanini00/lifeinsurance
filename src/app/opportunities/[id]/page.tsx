import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { StaffShell } from "@/components/staff-shell";
import { Card, PageHeader, Pill } from "@/components/ui";
import { prisma } from "@/lib/db";
import { dollars, formatDate, statusLabel } from "@/lib/utils";
import { decryptPii } from "@/lib/crypto";
import { propertyMatchNotice } from "@/lib/copy";
import { RunResearchForm } from "@/components/run-research-form";
import { ApproveOutreachForm } from "@/components/approve-outreach-form";

export default async function OpportunityDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireStaff();
  const { id } = await params;
  const kase = await prisma.case.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      property: { include: { holder: true, evidence: { include: { source: true } } } },
      people: {
        include: {
          person: {
            include: {
              death: { include: { evidence: { include: { source: true } } } },
              contacts: { include: { evidence: { include: { source: true } } } },
              fromRelationships: { include: { toPerson: true, evidence: { include: { source: true } } } },
            },
          },
        },
      },
      estate: { include: { probateCase: true } },
      researchRuns: { include: { findings: { include: { evidence: { include: { source: true } } } } } },
      communications: true,
      conflicts: true,
      tasks: true,
    },
  });
  if (!kase) notFound();

  const owner = kase.people.find((p) => p.role === "owner")?.person;
  const relatives = kase.people.filter((p) => p.role !== "owner");

  return (
    <StaffShell user={user}>
      <PageHeader
        eyebrow={kase.caseNumber}
        title={owner?.canonicalFullName || kase.property.ownerNameRaw}
        description={propertyMatchNotice(kase.property.ownerNameRaw)}
        actions={
          <div className="flex gap-2">
            <ApproveOutreachForm caseId={kase.id} approved={kase.outreachApproved} />
            <RunResearchForm
              caseId={kase.id}
              defaultObjective={`Determine whether ${kase.property.ownerNameRaw}, previously of ${kase.property.city}, Florida, is deceased and identify the strongest living relatives.`}
            />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="text-lg">Property</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row k="Account" v={kase.property.accountNumber} />
            <Row k="Holder" v={kase.property.holder?.name || "—"} />
            <Row k="Type" v={kase.property.categoryRaw || "—"} />
            <Row k="Est. value" v={dollars(kase.property.estimatedValueCents)} />
            <Row k="Insurance p." v={`${kase.property.insuranceProbability} · ${kase.property.insuranceCategory}`} />
            <Row k="Year" v={String(kase.property.reportingYear || "—")} />
            <Row k="Source" v="Florida DFS file import" />
          </dl>
        </Card>
        <Card>
          <h2 className="text-lg">Owner / decedent</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row k="Canonical name" v={owner?.canonicalFullName || "—"} />
            <Row k="Death status" v={owner?.death ? "Sourced deceased" : "Not marked deceased"} />
            <Row k="Death date" v={formatDate(owner?.death?.dateOfDeath)} />
            <Row k="Obituary" v={owner?.death?.obituaryUrl || "—"} />
            <Row k="Probate" v={kase.estate?.probateCase ? `${kase.estate.probateCase.county} ${kase.estate.probateCase.caseNumber}` : owner?.death?.probateCaseNumber || "—"} />
            <Row k="Identity" v={`${kase.identityConfidence}`} />
          </dl>
        </Card>
        <Card>
          <h2 className="text-lg">Scores</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row k="Recovery score" v={`${kase.opportunityScore} (${kase.queue})`} />
            <Row k="Death confidence" v={`${kase.deathConfidence}`} />
            <Row k="Family" v={`${kase.familyConfidence}`} />
            <Row k="Contact" v={`${kase.contactConfidence}`} />
            <Row k="Stage" v={statusLabel(kase.status)} />
          </dl>
          <p className="mt-4 text-sm">
            <strong>Next action.</strong> {kase.nextAction}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{kase.nextActionReason}</p>
          {kase.riskFlags && <p className="mt-2 text-sm text-danger">Risk: {kase.riskFlags}</p>}
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg">Family graph</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Relationship ≠ heir ≠ beneficiary ≠ confirmed claimant.
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            {relatives.map((r) => (
              <li key={r.id} className="border-b border-line pb-3">
                <div className="flex items-center justify-between">
                  <span>{r.person.canonicalFullName}</span>
                  <Pill>{r.claimantCategory?.replaceAll("_", " ") || r.role}</Pill>
                </div>
                <p className="text-ink-soft">{r.person.lastKnownAddress || "Address unknown"}</p>
                {r.person.contacts.map((c) => (
                  <p key={c.id} className="tabular text-ink-soft">
                    {c.channel.toLowerCase()} · {decryptPii(c.valueEnc)} · conf {c.confidence}
                  </p>
                ))}
              </li>
            ))}
          </ul>
          {owner?.fromRelationships.map((rel) => (
            <p key={rel.id} className="mt-2 text-xs text-ink-soft">
              {owner.canonicalFullName} — {rel.type.toLowerCase()} → {rel.toPerson.canonicalFullName} ({rel.confidence})
            </p>
          ))}
        </Card>
        <Card>
          <h2 className="text-lg">AI findings</h2>
          {kase.researchRuns.map((run) => (
            <div key={run.id} className="mt-3">
              <p className="text-xs text-ink-soft">
                {run.model} · {run.promptVersion} · {run.confidence}% · {run.stopReason}
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {run.findings.map((f) => (
                  <li key={f.id}>
                    <Pill tone={f.kind === "FACT" ? "good" : f.kind === "INFERENCE" ? "hot" : "warn"}>{f.kind}</Pill>{" "}
                    {f.statement}
                    {f.evidence[0] && (
                      <span className="block text-xs text-ink-soft">
                        Source: {f.evidence[0].source.name} · {formatDate(f.evidence[0].retrievedAt)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="text-lg">Source evidence</h2>
        <p className="mt-1 text-xs text-ink-soft">Every conclusion should be clickable back to raw material.</p>
        <ul className="mt-4 space-y-3 text-sm">
          {kase.property.evidence.map((e) => (
            <li key={e.id} className="border-b border-line pb-3">
              <p>
                <strong>{e.field}</strong> · {e.source.name}
              </p>
              <p className="text-ink-soft">{e.interpretation}</p>
              <p className="mt-1 font-mono text-xs">{e.rawValue.slice(0, 240)}</p>
              <p className="text-xs text-ink-soft">{formatDate(e.retrievedAt)} · {e.findingKind}</p>
            </li>
          ))}
        </ul>
      </Card>
    </StaffShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-soft">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
