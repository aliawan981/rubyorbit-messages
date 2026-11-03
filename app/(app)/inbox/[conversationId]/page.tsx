import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/messaging/auto-refresh";
import { MessageForm } from "@/components/messaging/message-form";
import { getSessionState } from "@/lib/auth/session";
import { markConversationRead } from "@/lib/messaging/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Conversation · RubyOrbit Messages" };

async function Thread({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const state = await getSessionState();
  if (state.status !== "active") return null;
  if (!/^[0-9a-f-]{36}$/i.test(conversationId)) notFound();

  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, unread_count, contacts(phone, name)")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, direction, body, media_urls, status, error, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(500);

  if (conversation.unread_count > 0) {
    await markConversationRead(createAdminClient(), state.member.orgId, conversationId);
  }

  const contact = Array.isArray(conversation.contacts)
    ? conversation.contacts[0]
    : conversation.contacts;
  const phone = contact?.phone ?? "";

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-3 border-b p-3">
        <Link href="/inbox" aria-label="Back to inbox" className="hover:bg-muted rounded-md p-1">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{contact?.name ?? phone}</p>
          {contact?.name ? <p className="text-muted-foreground text-xs">{phone}</p> : null}
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages?.map((m) => {
          const out = m.direction === "outbound";
          return (
            <div key={m.id} className={out ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm " +
                  (out ? "bg-primary text-primary-foreground" : "bg-muted")
                }
              >
                <p className="break-words whitespace-pre-wrap">{m.body}</p>
                {m.media_urls?.map((url: string) => (
                  <a
                    key={url}
                    href={url}
                    className="block text-xs underline"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Attachment
                  </a>
                ))}
                <p className="mt-1 text-[11px] opacity-70">
                  {new Date(m.created_at).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {out ? ` · ${m.status}` : ""}
                  {m.error ? ` · ${m.error}` : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t p-3">
        <MessageForm phone={phone} />
      </div>
      <AutoRefresh />
    </div>
  );
}

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-6 text-sm">Loading…</div>}>
      <Thread params={params} />
    </Suspense>
  );
}
