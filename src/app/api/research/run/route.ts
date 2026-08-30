import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { runResearchAgent } from "@/server/services/research-agent";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const user = await requireStaff();
  const body = await request.json();
  const kase = await prisma.case.findFirst({
    where: { id: body.caseId, organizationId: user.organizationId },
    include: { property: true },
  });
  if (!kase) return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });
  const run = await runResearchAgent({
    objective: body.objective,
    caseId: kase.id,
    organizationId: user.organizationId,
    actorUserId: user.id,
    name: kase.property.ownerNameRaw,
    city: kase.property.city || undefined,
    state: kase.property.state || "FL",
  });
  return NextResponse.json({ ok: true, id: run.id, confidence: run.confidence });
}
