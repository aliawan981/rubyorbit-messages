import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";
import { sendPushToUser } from "@/lib/push/service";
import { sendTelnyxMessage } from "@/lib/telnyx/client";
import type { TelnyxEvent } from "@/lib/telnyx/events";
import { normalizePhone } from "./phone";

type Admin = SupabaseClient;
type Inbound = Extract<TelnyxEvent, { kind: "inbound" }>;
type Status = Extract<TelnyxEvent, { kind: "status" }>;

export const MAX_MESSAGE_LENGTH = 1600;

/** Finds the org that owns the number a message was sent to. */
async function resolveOrgId(admin: Admin, toNumber: string): Promise<string | null> {
  const { data: byNumber } = await admin
    .from("orgs")
    .select("id")
    .eq("telnyx_phone_number", toNumber)
    .maybeSingle();
  if (byNumber) return byNumber.id;

  // Single-tenant fallback: the number configured in .env belongs to the (only) org.
  if (getEnv().TELNYX_PHONE_NUMBER === toNumber) {
    const { data } = await admin.from("orgs").select("id").order("created_at").limit(1);
    return data?.[0]?.id ?? null;
  }
  return null;
}

/** Stores an inbound message and notifies the team. Idempotent per Telnyx message id. */
export async function ingestInbound(
  admin: Admin,
  event: Inbound,
): Promise<"stored" | "duplicate" | "unknown-number"> {
  const orgId = await resolveOrgId(admin, event.to);
  if (!orgId) return "unknown-number";

  const phone = normalizePhone(event.from, getEnv().DEFAULT_COUNTRY_CODE);
  if (!phone) return "unknown-number";

  const { data: messageId, error } = await admin.rpc("record_inbound_message", {
    p_org: orgId,
    p_phone: phone,
    p_body: event.text,
    p_media: event.media,
    p_telnyx_id: event.messageId,
  });
  if (error) throw new Error(`record_inbound_message failed: ${error.message}`);
  if (!messageId) return "duplicate";

  await notifyTeam(admin, orgId, phone, event.text);
  return "stored";
}

async function notifyTeam(admin: Admin, orgId: string, phone: string, text: string) {
  const { data: members } = await admin
    .from("org_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("is_active", true);
  await Promise.all(
    (members ?? []).map((m) =>
      sendPushToUser(admin, m.user_id, {
        title: phone,
        body: text.slice(0, 140) || "New media message",
        url: "/inbox",
      }).catch(() => 0),
    ),
  );
}

/** Applies a delivery-status webhook to the matching outbound message. */
export async function applyStatus(admin: Admin, event: Status): Promise<void> {
  await admin
    .from("messages")
    .update({ status: event.status, error: event.error })
    .eq("telnyx_message_id", event.messageId)
    .eq("direction", "outbound");
}

export type SendOutcome = { ok: true; conversationId: string } | { ok: false; error: string };

/** Sends a message to `phone` (creating the contact/conversation if needed) and records it. */
export async function sendMessage(
  admin: Admin,
  input: { orgId: string; userId: string; phone: string; body: string },
): Promise<SendOutcome> {
  const phone = normalizePhone(input.phone, getEnv().DEFAULT_COUNTRY_CODE);
  if (!phone) return { ok: false, error: "Enter a valid phone number, e.g. +15551234567." };
  const body = input.body.trim();
  if (!body) return { ok: false, error: "Write a message first." };
  if (body.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Messages are limited to ${MAX_MESSAGE_LENGTH} characters.` };
  }

  const { data: contact, error: contactError } = await admin
    .from("contacts")
    .upsert({ org_id: input.orgId, phone }, { onConflict: "org_id,phone" })
    .select("id")
    .single();
  if (contactError || !contact) return { ok: false, error: "Could not save the contact." };

  const { data: conversation, error: convError } = await admin
    .from("conversations")
    .upsert({ org_id: input.orgId, contact_id: contact.id }, { onConflict: "org_id,contact_id" })
    .select("id")
    .single();
  if (convError || !conversation) return { ok: false, error: "Could not open the conversation." };

  const { data: row, error: insertError } = await admin
    .from("messages")
    .insert({
      org_id: input.orgId,
      conversation_id: conversation.id,
      direction: "outbound",
      body,
      status: "queued",
      sent_by: input.userId,
    })
    .select("id")
    .single();
  if (insertError || !row) return { ok: false, error: "Could not save the message." };

  const result = await sendTelnyxMessage({ to: phone, text: body });
  await admin
    .from("messages")
    .update(
      result.ok
        ? { status: "sent", telnyx_message_id: result.messageId }
        : { status: "failed", error: result.error },
    )
    .eq("id", row.id);

  await admin
    .from("conversations")
    .update({ last_message_at: new Date().toISOString(), last_message_preview: body.slice(0, 120) })
    .eq("id", conversation.id);

  return result.ok
    ? { ok: true, conversationId: conversation.id }
    : { ok: false, error: result.error };
}

export async function markConversationRead(admin: Admin, orgId: string, conversationId: string) {
  await admin
    .from("conversations")
    .update({ unread_count: 0 })
    .eq("id", conversationId)
    .eq("org_id", orgId);
}
