import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/server/audit";

export async function POST(request: Request) {
  const user = await requireStaff(["LICENSED_REPRESENTATIVE", "COMPLIANCE", "CASE_MANAGER", "ADMIN", "OWNER"]);
  const body = await request.json();
  if (body.decisionId) {
    const updated = await prisma.approvalRequest.update({
      where: { id: body.decisionId },
      data: {
        status: body.reject ? "REJECTED" : "APPROVED",
        deciderId: user.id,
        decidedAt: new Date(),
      },
    });
    if (updated.caseId && updated.type === "FIRST_OUTBOUND" && !body.reject) {
      await prisma.case.update({ where: { id: updated.caseId }, data: { outreachApproved: true } });
    }
    await writeAudit({
      userId: user.id,
      action: body.reject ? "APPROVAL_REJECTED" : "APPROVAL_GRANTED",
      entityType: "ApprovalRequest",
      entityId: updated.id,
    });
    return NextResponse.json({ ok: true });
  }

  if (body.caseId && body.type === "FIRST_OUTBOUND") {
    await prisma.case.update({
      where: { id: body.caseId },
      data: { outreachApproved: true, status: "CONTACTED" },
    });
    await prisma.approvalRequest.updateMany({
      where: { caseId: body.caseId, type: "FIRST_OUTBOUND", status: "PENDING" },
      data: { status: "APPROVED", deciderId: user.id, decidedAt: new Date() },
    });
    await writeAudit({
      userId: user.id,
      action: "APPROVAL_GRANTED",
      entityType: "Case",
      entityId: body.caseId,
      metadata: { type: "FIRST_OUTBOUND" },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false }, { status: 400 });
}
