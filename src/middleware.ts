import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC = new Set([
  "/login",
  "/portal/login",
  "/api/auth/login",
  "/api/auth/portal-login",
]);

function secret() {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET || "dev-only-auth-secret-do-not-use-in-production-32",
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/" ||
    PUBLIC.has(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("lifey_session")?.value;
  if (!token) {
    const dest = pathname.startsWith("/portal") ? "/portal/login" : "/login";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret());
    const kind = payload.kind as string;
    if (pathname.startsWith("/portal") && kind !== "CLAIMANT") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (!pathname.startsWith("/portal") && !pathname.startsWith("/api") && kind !== "STAFF") {
      return NextResponse.redirect(new URL("/portal/login", request.url));
    }
    return NextResponse.next();
  } catch {
    const dest = pathname.startsWith("/portal") ? "/portal/login" : "/login";
    return NextResponse.redirect(new URL(dest, request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|css|js)$).*)"],
};
