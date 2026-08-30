import { prisma } from "@/lib/db";
import { normalizeName } from "@/lib/crypto";

export async function findCandidatePeople(organizationId: string, rawName: string, city?: string | null, state?: string | null) {
  const normalized = normalizeName(rawName);
  const people = await prisma.person.findMany({
    where: {
      organizationId,
      OR: [
        { normalizedName: normalized },
        { aliases: { some: { name: { contains: rawName.split(" ")[0] || rawName } } } },
      ],
    },
    include: { aliases: true, addresses: true, death: true },
  });

  return people.map((p) => {
    let confidence = 0;
    const reasons: string[] = [];
    if (p.normalizedName === normalized) {
      confidence += 40;
      reasons.push("Normalized legal name matches.");
    }
    const geo =
      city &&
      p.addresses.some(
        (a) => a.city.toLowerCase() === city.toLowerCase() && (!state || a.state === state),
      );
    if (geo) {
      confidence += 25;
      reasons.push("Historic/current city matches the property record.");
    }
    if (p.death) {
      confidence += 10;
      reasons.push("A sourced death record exists (not used as sole merge key).");
    }
    return { person: p, confidence: Math.min(95, confidence), reasons, autoMerge: false };
  });
}

export function shouldAutoMerge(confidence: number, sharedEvidence: number) {
  return false && confidence >= 95 && sharedEvidence >= 3;
}
