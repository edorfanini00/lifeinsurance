import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("border border-line bg-white/70 p-5", className)}>{children}</section>;
}

export function Pill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "hot" | "good" | "warn" | "muted";
}) {
  const tones = {
    default: "border-line text-ink-soft",
    hot: "border-forest/40 bg-forest/8 text-forest-2",
    good: "border-ok/30 bg-ok/8 text-ok",
    warn: "border-danger/30 bg-danger/8 text-danger",
    muted: "border-line text-ink-soft",
  };
  return (
    <span className={cn("inline-flex border px-2 py-0.5 text-[11px] uppercase tracking-wide", tones[tone])}>
      {children}
    </span>
  );
}

export function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-[0.14em] text-ink-soft">{label}</p>
      <p className="mt-2 font-serif text-3xl tabular">{value}</p>
      {hint && <p className="mt-2 text-xs text-ink-soft">{hint}</p>}
    </Card>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-xs uppercase tracking-[0.16em] text-gold">{eyebrow}</p>}
        <h1 className="text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-ink-soft">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
