import { requireStaff } from "@/lib/auth";
import { StaffShell } from "@/components/staff-shell";
import { Card, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";

export default async function SettingsPage() {
  const user = await requireStaff();
  const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });
  const weights = await prisma.scoringWeightSet.findFirst({
    where: { organizationId: user.organizationId, active: true },
  });

  return (
    <StaffShell user={user}>
      <PageHeader eyebrow="Organization" title="Settings" description="Automation defaults to research + draft outreach. Changing the fee cap requires a new approved compliance rule set." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg">Company disclosure</h2>
          <p className="mt-3 text-sm">{org?.publicDisclosure}</p>
          <p className="mt-3 text-sm text-ink-soft">
            Automation: {org?.automationLevel.replaceAll("_", " ")} · Identity threshold {org?.identityThreshold} · Max
            fee {org?.maxFeePercent}%
          </p>
        </Card>
        <Card>
          <h2 className="text-lg">Scoring weights</h2>
          {weights && (
            <ul className="mt-3 space-y-1 text-sm">
              <li>Value {weights.valueWeight}</li>
              <li>Identity {weights.identityWeight}</li>
              <li>Family {weights.familyWeight}</li>
              <li>Contact {weights.contactWeight}</li>
              <li>Documentation {weights.documentationWeight}</li>
              <li>Probate {weights.probateWeight}</li>
              <li>Claim {weights.claimWeight}</li>
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="text-lg">Auth providers</h2>
          <p className="mt-3 text-sm">
            Active: local staff + claimant sessions. Clerk / Auth0 adapters can replace LocalStaffAuth when keys are
            present.
          </p>
        </Card>
        <Card>
          <h2 className="text-lg">Voice agent (Phase 4)</h2>
          <p className="mt-3 text-sm">
            Optional module is defined. It may confirm identity, explain why we called, and schedule a licensed
            representative. It must not impersonate government, give legal advice, guarantee recovery, request full SSN,
            or pressure elderly people. Live dialing is disabled until a VoiceProvider is configured.
          </p>
        </Card>
      </div>
    </StaffShell>
  );
}
