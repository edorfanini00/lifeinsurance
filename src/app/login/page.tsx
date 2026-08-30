import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await readSession();
  if (session?.kind === "STAFF") redirect("/dashboard");
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="font-serif text-4xl">lifey</p>
      <p className="mt-2 text-sm text-ink-soft">Staff access · independent private recovery company</p>
      <form action="/api/auth/login" method="post" className="mt-8 space-y-4">
        <label className="block text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            defaultValue="maria@lifey.local"
            className="mt-1 w-full border border-line bg-white px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            name="password"
            type="password"
            required
            defaultValue="lifey-demo"
            className="mt-1 w-full border border-line bg-white px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-danger">Sign-in failed. Check the staff credentials.</p>}
        <button className="w-full bg-forest px-4 py-2 text-paper" type="submit">
          Sign in
        </button>
      </form>
      <p className="mt-6 text-xs text-ink-soft">
        Demo: maria@lifey.local, alex@lifey.local, claire@lifey.local · password lifey-demo
      </p>
    </div>
  );
}
