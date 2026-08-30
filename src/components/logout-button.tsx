"use client";

export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button className="text-sm text-ink-soft underline-offset-2 hover:underline" type="submit">
        Sign out
      </button>
    </form>
  );
}
