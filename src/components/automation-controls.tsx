"use client";

import { useState } from "react";

async function post(body: unknown) {
  await fetch("/api/jobs/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  window.location.reload();
}

export function AutomationControls() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="bg-forest px-4 py-2 text-sm text-paper disabled:opacity-60"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await post({});
      }}
      type="button"
    >
      {busy ? "Running…" : "Run all due jobs now"}
    </button>
  );
}

export function JobRunButton({ jobId }: { jobId: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="border border-line px-2 py-1 text-xs disabled:opacity-60"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await post({ jobId });
      }}
      type="button"
    >
      {busy ? "…" : "Run"}
    </button>
  );
}

export function ToggleButton({ field, value }: { field: string; value: boolean }) {
  return (
    <button
      className={`border px-2 py-0.5 text-[11px] uppercase ${
        value ? "border-ok/40 bg-ok/10 text-ok" : "border-line text-ink-soft"
      }`}
      onClick={() => post({ toggle: field })}
      type="button"
    >
      {value ? "on" : "off"}
    </button>
  );
}
