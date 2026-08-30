export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.AUTOMATION_DISABLED === "1") return;
  const { startScheduler } = await import("@/server/jobs/runner");
  startScheduler();
}
