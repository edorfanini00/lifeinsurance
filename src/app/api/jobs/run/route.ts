import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { runJobById, tick } from "@/server/jobs/runner";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/server/audit";

export async function POST(request: Request) {
  const user = await requireStaff();
  const body = await request.json();

  if (body.toggle) {
    const config = await prisma.automationConfig.findUnique({
      where: { organizationId: user.organizationId },
    });
    if (!config) return NextResponse.json({ ok: false }, { status: 404 });
    const field = body.toggle as keyof typeof config;
    const updated = await prisma.automationConfig.update({
      where: { organizationId: user.organizationId },
      data: { [field]: !config[field] },
    });
    await writeAudit({
      userId: user.id,
      action: "AUTOMATION_TOGGLE",
      entityType: "AutomationConfig",
      entityId: updated.id,
      metadata: { field: body.toggle, value: updated[field] },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.jobId) {
    const run = await runJobById(body.jobId, `manual:${user.email}`);
    return NextResponse.json({ ok: true, run });
  }

  const result = await tick(`manual:${user.email}`);
  return NextResponse.json({ ok: true, ...result });
}
