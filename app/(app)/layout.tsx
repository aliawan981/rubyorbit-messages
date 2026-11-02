// Session-gated: opt out of instant-navigation validation (see Next docs: authentication-with-cache-components).
export const instant = false;

import { redirect } from "next/navigation";
import { Suspense } from "react";
import { NotActivated } from "@/components/auth/not-activated";
import { AppShell } from "@/components/layout/app-shell";
import { getSessionState } from "@/lib/auth/session";

// Second line of defence behind proxy.ts: re-check the session on the server.
async function AuthGate({ children }: { children: React.ReactNode }) {
  const state = await getSessionState();
  if (state.status === "anonymous") redirect("/login");
  if (state.status === "inactive") return <NotActivated email={state.email} />;
  if (state.member.mustChangePassword) redirect("/change-password");
  return <AppShell member={state.member}>{children}</AppShell>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <AuthGate>{children}</AuthGate>
    </Suspense>
  );
}
