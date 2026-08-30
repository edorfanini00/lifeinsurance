"use client";

import { useState } from "react";

export function RunResearchForm({ caseId, defaultObjective }: { caseId: string; defaultObjective: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        const res = await fetch("/api/research/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId, objective: defaultObjective }),
        });
        const data = await res.json();
        setBusy(false);
        setMsg(data.ok ? "Research run recorded." : data.error || "Failed");
        if (data.ok) window.location.reload();
      }}
    >
      <button className="border border-forest px-3 py-2 text-sm" disabled={busy} type="submit">
        {busy ? "Running…" : "Run research agent"}
      </button>
      {msg && <p className="mt-1 text-xs text-ink-soft">{msg}</p>}
    </form>
  );
}
