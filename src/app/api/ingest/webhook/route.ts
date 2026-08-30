import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashLookup } from "@/lib/crypto";
import { importDfsCsv } from "@/server/services/property-discovery";

/**
 * Machine ingest for an authorized upstream system. Accepts a CSV body or a
 * JSON array of records. Authenticated by a hashed API key stored per org.
 */
export async function POST(request: Request) {
  const key = request.headers.get("x-api-key");
  if (!key) return NextResponse.json({ ok: false, error: "Missing x-api-key" }, { status: 401 });

  const config = await prisma.automationConfig.findFirst({
    where: { webhookKeyHash: hashLookup(key) },
  });
  if (!config) return NextResponse.json({ ok: false, error: "Invalid key" }, { status: 401 });

  const actor = await prisma.user.findFirst({
    where: { organizationId: config.organizationId, kind: "STAFF" },
  });
  if (!actor) return NextResponse.json({ ok: false, error: "No staff actor" }, { status: 500 });

  const contentType = request.headers.get("content-type") || "";
  let csv: string;

  if (contentType.includes("application/json")) {
    const body = await request.json();
    const rows: Record<string, string>[] = Array.isArray(body) ? body : body.records;
    if (!Array.isArray(rows) || !rows.length) {
      return NextResponse.json({ ok: false, error: "Expected records array" }, { status: 400 });
    }
    const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => quote(r[h] ?? "")).join(",")),
    ].join("\n");
  } else {
    csv = await request.text();
  }

  const result = await importDfsCsv({
    organizationId: config.organizationId,
    csv,
    actorUserId: actor.id,
  });

  return NextResponse.json({ ok: true, ...result });
}

function quote(value: string) {
  const v = String(value);
  return /[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
}
