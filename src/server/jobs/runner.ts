import { prisma } from "@/lib/db";
import { jobs, getJob } from "./registry";
import type { JobDefinition } from "./types";

type Runtime = {
  timer?: NodeJS.Timeout;
  lastRunAt: Map<string, number>;
  running: Set<string>;
  startedAt?: Date;
};

const globalForJobs = globalThis as unknown as { lifeyJobs?: Runtime };
const runtime: Runtime =
  globalForJobs.lifeyJobs ?? (globalForJobs.lifeyJobs = { lastRunAt: new Map(), running: new Set() });

export function schedulerState() {
  return {
    active: !!runtime.timer,
    startedAt: runtime.startedAt,
    running: [...runtime.running],
    lastRunAt: Object.fromEntries(runtime.lastRunAt),
  };
}

async function context() {
  const org = await prisma.organization.findFirst();
  if (!org) return null;
  const actor =
    (await prisma.user.findFirst({
      where: { organizationId: org.id, kind: "STAFF", role: { in: ["OWNER", "ADMIN", "RESEARCHER"] } },
    })) || (await prisma.user.findFirst({ where: { organizationId: org.id, kind: "STAFF" } }));
  if (!actor) return null;
  const config =
    (await prisma.automationConfig.findUnique({ where: { organizationId: org.id } })) ||
    (await prisma.automationConfig.create({ data: { organizationId: org.id } }));
  return { org, actor, config };
}

export async function runJob(job: JobDefinition, triggeredBy = "schedule") {
  const ctx = await context();
  if (!ctx) return null;

  if (runtime.running.has(job.id)) return null;
  runtime.running.add(job.id);

  const run = await prisma.jobRun.create({
    data: { jobId: job.id, status: "RUNNING", triggeredBy },
  });

  try {
    const result = await job.run({
      organizationId: ctx.org.id,
      actorUserId: ctx.actor.id,
      triggeredBy,
    });
    const finished = await prisma.jobRun.update({
      where: { id: run.id },
      data: {
        status: result.skipped ? "SKIPPED" : "SUCCEEDED",
        finishedAt: new Date(),
        itemsProcessed: result.processed,
        itemsCreated: result.created,
        detail: result.detail.slice(0, 2000),
      },
    });
    runtime.lastRunAt.set(job.id, Date.now());
    return finished;
  } catch (err) {
    const failed = await prisma.jobRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        error: (err as Error).message.slice(0, 1000),
      },
    });
    runtime.lastRunAt.set(job.id, Date.now());
    return failed;
  } finally {
    runtime.running.delete(job.id);
  }
}

export async function runJobById(id: string, triggeredBy = "manual") {
  return runJob(getJob(id), triggeredBy);
}

/** One pass over every job whose interval has elapsed and whose flag is on. */
export async function tick(triggeredBy = "schedule") {
  const ctx = await context();
  if (!ctx) return { ran: [], reason: "No organization seeded." };
  if (!ctx.config.enabled) return { ran: [], reason: "Automation is paused." };

  const ran: string[] = [];
  const now = Date.now();

  for (const job of jobs) {
    const gatesOpen = (job.requires || []).every(
      (flag) => ctx.config[flag as keyof typeof ctx.config] === true,
    );
    if (!gatesOpen) continue;

    const last = runtime.lastRunAt.get(job.id) ?? 0;
    if (now - last < job.everySeconds * 1000) continue;

    const result = await runJob(job, triggeredBy);
    if (result) ran.push(job.id);
  }

  return { ran, reason: ran.length ? "ok" : "Nothing due." };
}

export function startScheduler() {
  if (runtime.timer) return;
  const seconds = Number(process.env.AUTOMATION_TICK_SECONDS || 30);
  runtime.startedAt = new Date();
  runtime.timer = setInterval(() => {
    tick().catch((err) => console.error("[lifey] scheduler tick failed:", err.message));
  }, seconds * 1000);
  // Do not hold the process open purely for the scheduler.
  runtime.timer.unref?.();
  console.log(`[lifey] automation scheduler started (${seconds}s tick)`);
}

export function stopScheduler() {
  if (!runtime.timer) return;
  clearInterval(runtime.timer);
  runtime.timer = undefined;
  runtime.startedAt = undefined;
}
