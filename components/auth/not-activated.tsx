import { logoutAction } from "@/app/login/actions";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export function NotActivated({ email }: { email: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="max-w-sm space-y-4 text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="text-xl font-semibold">Account not activated</h1>
        <p className="text-muted-foreground text-sm">
          {email ? `${email} doesn't` : "This account doesn't"} have access to a team yet. Ask your
          admin to activate it.
        </p>
        <form action={logoutAction}>
          <Button variant="outline" type="submit">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  );
}
