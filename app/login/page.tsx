import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent } from "@/components/ui/card";
import { SIGN_IN_AGAIN_MESSAGE } from "@/lib/auth/errors";

export const metadata = { title: "Sign in · RubyOrbit Messages" };

async function LoginBody({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return <LoginForm notice={reason === "expired" ? SIGN_IN_AGAIN_MESSAGE : undefined} />;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <Logo size={48} />
          <p className="text-muted-foreground text-sm">Sign in to RubyOrbit Messages</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Suspense fallback={<div className="h-64" />}>
              <LoginBody searchParams={searchParams} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
