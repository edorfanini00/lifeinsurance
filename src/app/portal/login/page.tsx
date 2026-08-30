export default async function PortalLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="font-serif text-4xl">lifey portal</p>
      <p className="mt-2 text-sm text-ink-soft">
        Secure claimant access. A matching record does not mean you are entitled to funds.
      </p>
      <form action="/api/auth/portal-login" method="post" className="mt-8 space-y-4">
        <label className="block text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            defaultValue="michael.smith@example.com"
            className="mt-1 w-full border border-line bg-white px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            name="password"
            type="password"
            required
            defaultValue="portal-demo"
            className="mt-1 w-full border border-line bg-white px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-danger">Sign-in failed.</p>}
        <button className="w-full bg-forest px-4 py-2 text-paper" type="submit">
          Continue
        </button>
      </form>
    </div>
  );
}
