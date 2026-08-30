import { NextResponse } from "next/server";
import { authenticate, setSessionCookie, signSession } from "@/lib/auth";
import { writeAudit } from "@/server/audit";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") || "");
  const password = String(form.get("password") || "");
  const user = await authenticate(email, password, "STAFF");
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=1", request.url));
  }
  const token = await signSession({
    id: user.id,
    email: user.email,
    name: user.name,
    kind: user.kind,
    role: user.role,
    organizationId: user.organizationId,
  });
  await setSessionCookie(token);
  await writeAudit({
    userId: user.id,
    action: "LOGIN",
    entityType: "User",
    entityId: user.id,
    ip: request.headers.get("x-forwarded-for") || undefined,
  });
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
