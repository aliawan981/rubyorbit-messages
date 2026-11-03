import { Suspense } from "react";
import { NotificationsPanel } from "@/components/settings/notifications-panel";
import { TelnyxPanel } from "@/components/settings/telnyx-panel";
import { TeamPanel } from "@/components/settings/team-panel";
import { getSessionState } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { listTeam } from "@/lib/team/service";

export const metadata = { title: "Settings · RubyOrbit Messages" };

async function Team() {
  const state = await getSessionState();
  if (state.status !== "active") return null;
  if (state.member.role !== "admin") {
    return <p className="text-muted-foreground text-sm">Only admins can manage the team.</p>;
  }
  const members = await listTeam(createAdminClient(), state.member.orgId);
  return <TeamPanel members={members} selfId={state.member.userId} />;
}

async function Notifications() {
  await getSessionState(); // request-time: reads env at runtime
  return <NotificationsPanel publicKey={getEnv().NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />;
}

async function Telnyx() {
  const state = await getSessionState();
  if (state.status !== "active" || state.member.role !== "admin") return null;
  const env = getEnv();
  return (
    <TelnyxPanel
      configured={Boolean(env.TELNYX_API_KEY && env.TELNYX_PHONE_NUMBER)}
      phoneNumber={env.TELNYX_PHONE_NUMBER ?? null}
      webhookUrl={`${env.APP_URL.replace(/\/$/, "")}/api/webhooks/telnyx`}
      hasPublicKey={Boolean(env.TELNYX_PUBLIC_KEY)}
    />
  );
}

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Suspense fallback={<p className="text-muted-foreground text-sm">Loading…</p>}>
        <Notifications />
        <Telnyx />
        <Team />
      </Suspense>
    </div>
  );
}
