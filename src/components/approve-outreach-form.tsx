"use client";

export function ApproveOutreachForm({ caseId, approved }: { caseId: string; approved: boolean }) {
  if (approved) return <p className="text-xs text-ok">First-touch approved</p>;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await fetch("/api/approvals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId, type: "FIRST_OUTBOUND" }),
        });
        window.location.reload();
      }}
    >
      <button className="bg-forest px-3 py-2 text-sm text-paper" type="submit">
        Approve first outreach
      </button>
    </form>
  );
}
