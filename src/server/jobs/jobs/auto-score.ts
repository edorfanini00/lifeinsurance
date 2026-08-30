import type { JobDefinition } from "../types";
import { prisma } from "@/lib/db";
import { recomputeCase } from "@/server/services/case-recompute";

export const autoScoreJob: JobDefinition = {
  id: "auto-score",
  name: "Rescore and requeue",
  description:
    "Recomputes identity, death, family, contact confidence and the recovery score from evidence on file, then moves each case into HOT / GOOD / RESEARCH / LOW.",
  everySeconds: 120,
  requires: ["autoScore"],
  async run(ctx) {
    const cases = await prisma.case.findMany({
      where: { organizationId: ctx.organizationId },
      select: { id: true, opportunityScore: true, queue: true, caseNumber: true },
    });

    let changed = 0;
    const moves: string[] = [];
    for (const kase of cases) {
      const updated = await recomputeCase(kase.id);
      if (!updated) continue;
      if (updated.opportunityScore !== kase.opportunityScore || updated.queue !== kase.queue) {
        changed += 1;
        moves.push(`${kase.caseNumber} ${kase.opportunityScore}→${updated.opportunityScore} ${updated.queue}`);
      }
    }

    return {
      processed: cases.length,
      created: changed,
      detail: moves.length ? moves.slice(0, 8).join("; ") : "No score changes.",
      skipped: changed === 0,
    };
  },
};
