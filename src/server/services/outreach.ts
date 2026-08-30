import { prisma } from "@/lib/db";
import { initialOutreach } from "@/lib/copy";
import { COMPANY_NAME } from "@/lib/constants";
import { validateAction } from "./compliance";
import { writeAudit } from "@/server/audit";

export async function draftInitialOutreach(input: {
  caseId: string;
  firstName: string;
  agentName: string;
  actorUserId: string;
}) {
  const body = initialOutreach(input.firstName, input.agentName);
  const gate = await validateAction({
    action: "FIRST_OUTREACH",
    caseId: input.caseId,
    channel: "EMAIL",
    body,
  });
  const comm = await prisma.communication.create({
    data: {
      caseId: input.caseId,
      userId: input.actorUserId,
      channel: "EMAIL",
      direction: "OUTBOUND",
      status: gate.decision === "ALLOWED" ? "PENDING_APPROVAL" : "DRAFT",
      subject: `A public-records matter — ${COMPANY_NAME}`,
      body,
      dayOffset: 1,
    },
  });
  await writeAudit({
    userId: input.actorUserId,
    action: "OUTREACH_DRAFT",
    entityType: "Communication",
    entityId: comm.id,
    metadata: { decision: gate.decision, reasons: gate.reasons },
  });
  return { communication: comm, compliance: gate };
}

export async function sendCommunication(input: { communicationId: string; actorUserId: string }) {
  const comm = await prisma.communication.findUnique({ where: { id: input.communicationId } });
  if (!comm) throw new Error("Communication not found");
  const gate = await validateAction({
    action: comm.dayOffset === 1 ? "FIRST_OUTREACH" : "SEND_MESSAGE",
    caseId: comm.caseId,
    channel: comm.channel,
    body: comm.body,
  });
  if (gate.decision !== "ALLOWED") {
    return { ok: false as const, compliance: gate };
  }
  const updated = await prisma.communication.update({
    where: { id: comm.id },
    data: { status: "SENT", sentAt: new Date() },
  });
  await writeAudit({
    userId: input.actorUserId,
    action: "OUTREACH_SEND",
    entityType: "Communication",
    entityId: comm.id,
    metadata: { channel: comm.channel, provider: process.env.RESEND_API_KEY ? "resend" : "console" },
  });
  return { ok: true as const, communication: updated, compliance: gate };
}
