import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6">
      <p className="font-serif text-5xl">lifey</p>
      <p className="mt-4 max-w-xl text-ink-soft">
        An investigation platform for potentially recoverable Florida unclaimed property and lost
        life-insurance proceeds. A matching record is not proof that anyone is entitled to funds.
      </p>
      <div className="mt-8 flex gap-4 text-sm">
        <Link className="border border-forest bg-forest px-4 py-2 text-paper" href="/login">
          Staff sign in
        </Link>
        <Link className="border border-line px-4 py-2" href="/portal/login">
          Claimant portal
        </Link>
      </div>
    </div>
  );
}
