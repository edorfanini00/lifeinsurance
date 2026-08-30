"use client";

import { useState } from "react";

export function DfsImportForm() {
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <form
      className="mt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const file = (e.currentTarget.elements.namedItem("file") as HTMLInputElement).files?.[0];
        if (!file) return;
        const csv = await file.text();
        const res = await fetch("/api/import/dfs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csv }),
        });
        const data = await res.json();
        setMsg(data.ok ? `Imported ${data.created} new properties.` : data.error);
      }}
    >
      <input name="file" type="file" accept=".csv,text/csv" className="text-sm" />
      <button className="ml-3 border border-forest px-3 py-1 text-sm" type="submit">
        Import
      </button>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </form>
  );
}
