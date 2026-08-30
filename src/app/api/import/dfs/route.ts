import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { importDfsCsv } from "@/server/services/property-discovery";

export async function POST(request: Request) {
  const user = await requireStaff();
  const { csv } = await request.json();
  if (!csv) return NextResponse.json({ ok: false, error: "CSV required" }, { status: 400 });
  const result = await importDfsCsv({
    organizationId: user.organizationId,
    csv,
    actorUserId: user.id,
  });
  return NextResponse.json({ ok: true, ...result });
}
