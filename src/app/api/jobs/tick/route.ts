import { NextResponse } from "next/server";
import { tick } from "@/server/jobs/runner";

/**
 * External cron target (Vercel Cron, GitHub Actions, etc.) for environments
 * where a long-lived in-process scheduler is not appropriate.
 */
export async function POST(request: Request) {
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
