import Link from "next/link";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/messaging/auto-refresh";
import { MessageForm } from "@/components/messaging/message-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionState } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Inbox · RubyOrbit Messages" };

async function Conversations() {
  const state = await getSessionState();
  if (state.status !== "active") return null;

  // Browser-session client: RLS limits this to the member's own org.
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("id, last_message_at, last_message_preview, unread_count, contacts(phone, name)")
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (!data?.length) {
    return (
      <p className="text-muted-foreground text-sm">
        No conversations yet. Incoming texts appear here, or start one above.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {data.map((c) => {
        const contact = Array.isArray(c.contacts) ? c.contacts[0] : c.contacts;
        return (
          <li key={c.id}>
            <Link href={`/inbox/${c.id}`} className="hover:bg-muted flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{contact?.name ?? contact?.phone}</p>
                <p className="text-muted-foreground truncate text-sm">{c.last_message_preview}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <time className="text-muted-foreground text-xs" dateTime={c.last_message_at}>
                  {new Date(c.last_message_at).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </time>
                {c.unread_count > 0 ? (
                  <span className="bg-primary text-primary-foreground rounded-full px-2 text-xs">
                    {c.unread_count}
                  </span>
                ) : null}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function InboxPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <h1 className="text-xl font-semibold">Inbox</h1>
      <Card>
        <CardHeader>
          <CardTitle>New message</CardTitle>
        </CardHeader>
        <CardContent>
          <MessageForm />
        </CardContent>
      </Card>
      <Suspense fallback={<p className="text-muted-foreground text-sm">Loading…</p>}>
        <Conversations />
      </Suspense>
      <AutoRefresh />
    </div>
  );
}
