import { NextResponse } from "next/server";
import { tick } from "@/server/jobs/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron target for serverless deploys, where the in-process scheduler cannot
 * run. Vercel Cron sends GET with a bearer CRON_SECRET; POST is accepted so
 * the same endpoint works from any external scheduler.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = request.headers.get("authorization")?.replace("Bearer ", "");
    if (provided !== secret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }
  const result = await tick("cron");
  return NextResponse.json({ ok: true, ...result });
}

export const GET = handle;
export const POST = handle;
