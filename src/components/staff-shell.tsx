import Link from "next/link";
import { NAV } from "@/lib/constants";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

export async function StaffShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pending = await prisma.approvalRequest.count({ where: { status: "PENDING" } });

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-paper-2/70">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3">
          <Link href="/dashboard" className="font-serif text-2xl tracking-tight">
            lifey
          </Link>
          <div className="flex items-center gap-6 text-sm text-ink-soft">
            <span>
              {user.name} · {user.role.replaceAll("_", " ")}
            </span>
            {pending > 0 && (
              <Link href="/tasks" className="text-forest">
                {pending} approval{pending === 1 ? "" : "s"}
              </Link>
            )}
            <LogoutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-[1400px] flex-wrap gap-1 px-4 pb-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-sm px-3 py-1.5 text-sm text-ink-soft hover:bg-paper hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-[1400px] px-6 py-8">{children}</main>
    </div>
  );
}
