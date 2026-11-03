import { Contact, Inbox, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import { Logo } from "@/components/brand/logo";
import { InstallButton } from "@/components/pwa/install-button";
import type { CurrentMember } from "@/lib/auth/session";

const NAV = [
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/contacts", label: "Contacts", icon: Contact },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({
  member,
  children,
}: {
  member: CurrentMember;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="bg-card flex items-center justify-between gap-2 border-b px-3 py-2 md:w-60 md:flex-col md:items-stretch md:justify-start md:border-r md:border-b-0 md:p-4">
        <div className="hidden md:block md:pb-4">
          <Logo size={32} />
        </div>
        <nav className="flex gap-1 md:flex-col" aria-label="Main">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="hover:bg-muted flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium"
            >
              <Icon className="size-4" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="flex items-center md:mt-auto md:flex-col md:items-stretch md:border-t md:pt-3">
          <p className="hidden truncate text-sm font-medium md:block">{member.displayName}</p>
          <p className="text-muted-foreground hidden truncate text-xs md:block">
            {member.orgName} · {member.role}
          </p>
          <InstallButton />
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm md:mt-2 md:w-full"
            >
              <LogOut className="size-4" />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
