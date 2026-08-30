"use client";

export function ApprovalButtons({ id }: { id: string }) {
  async function decide(reject: boolean) {
    await fetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decisionId: id, reject }),
    });
    window.location.reload();
  }
  return (
    <div className="mt-2 flex gap-2">
      <button className="bg-forest px-2 py-1 text-xs text-paper" onClick={() => decide(false)} type="button">
        Approve
      </button>
      <button className="border border-line px-2 py-1 text-xs" onClick={() => decide(true)} type="button">
        Reject
      </button>
    </div>
  );
}
