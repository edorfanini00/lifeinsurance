import { prisma } from "@/lib/db";
import { normalizeName } from "@/lib/crypto";
import { classifyInsurance } from "./insurance-classifier";
import { mapDfsRow } from "@/server/adapters/florida-dfs-import";
import { floridaDfsImportAdapter } from "@/server/adapters/florida-dfs-import";
import { writeAudit } from "@/server/audit";
import { scoreOpportunity } from "./opportunity-scoring";

export async function importDfsCsv(input: {
  organizationId: string;
  csv: string;
  actorUserId: string;
}) {
  const parsed = await floridaDfsImportAdapter.search({ raw: input.csv }, { organizationId: input.organizationId });
  const created: string[] = [];

  const source =
    (await prisma.source.findFirst({
      where: { organizationId: input.organizationId, adapterId: "florida-dfs-import" },
    })) ||
    (await prisma.source.create({
      data: {
        organizationId: input.organizationId,
        adapterId: "florida-dfs-import",
        name: "Florida DFS file import",
        jurisdiction: "FL",
        legalNotes: floridaDfsImportAdapter.legalNotes,
      },
    }));

  let seq = await prisma.case.count({ where: { organizationId: input.organizationId } });

  for (const hit of parsed.hits) {
    const row = mapDfsRow(hit.raw);
    if (!row.accountNumber || !row.ownerName) continue;
    const exists = await prisma.property.findUnique({
      where: { organizationId_accountNumber: { organizationId: input.organizationId, accountNumber: row.accountNumber } },
    });
    if (exists) continue;

    let holder = null as Awaited<ReturnType<typeof prisma.holder.findFirst>>;
    if (row.holder) {
      holder = await prisma.holder.findFirst({ where: { normalizedName: normalizeName(row.holder) } });
      if (!holder) {
        holder = await prisma.holder.create({
          data: {
            name: row.holder,
            normalizedName: normalizeName(row.holder),
            knownInsurer: classifyInsurance({ holderName: row.holder }).probability >= 28,
          },
        });
      }
    }

    const classified = classifyInsurance({
      holderName: row.holder,
      categoryRaw: row.category,
      description: row.description,
    });

    const evidence = await prisma.sourceEvidence.create({
      data: {
        sourceId: source.id,
        field: "property_record",
        rawValue: JSON.stringify(hit.raw),
        url: row.sourceUrl,
        retrievedAt: new Date(),
        interpretation: "Imported unclaimed-property record. Not a determination of entitlement.",
        findingKind: "FACT",
        externalRecordId: row.externalRecordId,
      },
    });

    const property = await prisma.property.create({
      data: {
        organizationId: input.organizationId,
        accountNumber: row.accountNumber,
        externalRecordId: row.externalRecordId,
        holderId: holder?.id,
        ownerNameRaw: row.ownerName,
        coOwnerNameRaw: row.coOwnerName,
        reportedAddress: row.address,
        city: row.city,
        state: row.state,
        zip: row.zip,
        categoryRaw: row.category,
        description: row.description,
        reportingYear: row.reportingYear,
        estimatedValueCents: row.estimatedValueCents,
        valueKnown: row.estimatedValueCents != null,
        sourceUrl: row.sourceUrl,
        retrievedAt: new Date(),
        insuranceCategory: classified.category,
        insuranceProbability: classified.probability,
        evidence: { connect: { id: evidence.id } },
      },
    });

    const person = await prisma.person.create({
      data: {
        organizationId: input.organizationId,
        canonicalFullName: row.ownerName,
        normalizedName: normalizeName(row.ownerName),
        lastKnownAddress: [row.address, row.city, row.state].filter(Boolean).join(", "),
        county: row.city ? undefined : undefined,
        identityConfidence: 35,
      },
    });

    await prisma.propertyOwner.create({
      data: { propertyId: property.id, personId: person.id, role: "owner", confidence: 40 },
    });

    seq += 1;
    const scored = scoreOpportunity({
      estimatedValueCents: row.estimatedValueCents,
      identityConfidence: 35,
      deathConfidence: 0,
      familyConfidence: 0,
      contactConfidence: 0,
      documentationScore: 0,
      probateSimplicity: 50,
      claimProbability: 40,
    });

    const kase = await prisma.case.create({
      data: {
        organizationId: input.organizationId,
        caseNumber: `LY-FL-${String(seq).padStart(5, "0")}`,
        propertyId: property.id,
        status: "DISCOVERED",
        opportunityScore: scored.score,
        queue: scored.queue,
        identityConfidence: 35,
        nextAction: "Resolve reported owner identity against approved sources",
        nextActionReason: "A name on a property record is not a unique person and not an entitlement.",
        people: { create: { personId: person.id, role: "owner" } },
      },
    });
    created.push(kase.id);
  }

  await writeAudit({
    userId: input.actorUserId,
    action: "DFS_IMPORT",
    entityType: "Property",
    metadata: { created: created.length, notes: parsed.notes },
  });

  return { created: created.length, notes: parsed.notes };
}
