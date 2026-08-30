import { prisma } from "@/lib/db";

export async function writeAudit(input: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}) {
  const meta = { ...(input.metadata || {}) };
  delete meta.ssn;
  delete meta.password;
  delete meta.fullSsn;
  delete meta.documentBytes;
  await prisma.auditLog.create({
    data: {
      userId: input.userId || undefined,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      ip: input.ip,
      metadata: meta,
    },
  });
}
