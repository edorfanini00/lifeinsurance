import type { JobDefinition } from "../types";
import { prisma } from "@/lib/db";
import { applyResearchToCase } from "@/server/services/research-apply";

const BATCH = 5;

export const autoResearchJob: JobDefinition = {
  id: "auto-research",
  name: "Autonomous research",
  description:
    "Picks up newly discovered cases, queries approved research adapters, and writes sourced findings into the investigation graph. Cases with no configured provider are left for a human with the gap recorded.",
  everySeconds: 60,
  requires: ["autoResearch"],
  async run(ctx) {
    const cases = await prisma.case.findMany({
      where: {
        organizationId: ctx.organizationId,
        status: { in: ["DISCOVERED", "RESEARCHING", "IDENTITY_CONFIRMED", "DECEASED_VERIFIED"] },
      },
      orderBy: [{ opportunityScore: "desc" }, { createdAt: "asc" }],
      take: BATCH,
    });
    if (!cases.length) {
      return { processed: 0, created: 0, detail: "No cases awaiting research.", skipped: true };
    }

    let applied = 0;
    const notes: string[] = [];
    for (const kase of cases) {
      const result = await applyResearchToCase({
        caseId: kase.id,
        organizationId: ctx.organizationId,
        actorUserId: ctx.actorUserId,
      });
      applied += result.applied;
      notes.push(`${kase.caseNumber}: ${result.detail}`);
    }

    return { processed: cases.length, created: applied, detail: notes.join("; ") };
  },
};
