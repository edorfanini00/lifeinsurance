import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import type { UserKind, UserRole } from "@prisma/client";

const COOKIE = "lifey_session";

function secret() {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET || "dev-only-auth-secret-do-not-use-in-production-32",
  );
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  kind: UserKind;
  role: UserRole;
  organizationId: string;
};

export async function signSession(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function readSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function requireStaff(roles?: UserRole[]) {
  const user = await readSession();
  if (!user || user.kind !== "STAFF") redirect("/login");
  if (roles && !roles.includes(user.role) && user.role !== "OWNER" && user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return user;
}

export async function requireClaimant() {
  const user = await readSession();
  if (!user || user.kind !== "CLAIMANT") redirect("/portal/login");
  return user;
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function authenticate(email: string, password: string, kind: UserKind) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || user.disabled || user.kind !== kind || !user.passwordHash) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  return user;
}

export function sessionCookieName() {
  return COOKIE;
}
