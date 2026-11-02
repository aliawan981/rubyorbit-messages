// Session-gated: opt out of instant-navigation validation (see Next docs: authentication-with-cache-components).
export const instant = false;

import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { NotActivated } from "@/components/auth/not-activated";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent } from "@/components/ui/card";
import { getSessionState } from "@/lib/auth/session";

export const metadata = { title: "Set a new password · RubyOrbit Messages" };

async function Gate() {
  const state = await getSessionState();
  if (state.status === "anonymous") redirect("/login");
  if (state.status === "inactive") return <NotActivated email={state.email} />;
  if (!state.member.mustChangePassword) redirect("/inbox");
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <Logo size={48} />
          <h1 className="text-lg font-semibold">Set a new password</h1>
          <p className="text-muted-foreground text-sm">
            Your admin gave you a temporary password. Choose your own to continue.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Gate />
    </Suspense>
  );
}
