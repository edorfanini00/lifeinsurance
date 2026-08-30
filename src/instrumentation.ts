export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.AUTOMATION_DISABLED === "1") return;
  // Serverless functions are frozen between requests, so a setInterval loop
  // would never fire reliably. On Vercel, cron drives POST /api/jobs/tick.
  if (process.env.VERCEL) return;
  const { startScheduler } = await import("@/server/jobs/runner");
  startScheduler();
}
