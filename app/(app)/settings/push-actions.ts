"use server";

import { headers } from "next/headers";
import { getSessionState } from "@/lib/auth/session";
import { pushSubscriptionSchema, unsubscribeSchema } from "@/lib/push/schemas";
import {
  isPushConfigured,
  removePushSubscription,
  savePushSubscription,
  sendPushToUser,
} from "@/lib/push/service";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PushActionResult {
  ok: boolean;
  error?: string;
}

async function requireMember() {
  const state = await getSessionState();
  return state.status === "active" ? state.member : null;
}

export async function subscribePushAction(subscription: unknown): Promise<PushActionResult> {
  const member = await requireMember();
  if (!member) return { ok: false, error: "Please sign in again." };
  if (!isPushConfigured()) return { ok: false, error: "Notifications are not configured." };
  const parsed = pushSubscriptionSchema.safeParse(subscription);
  if (!parsed.success) return { ok: false, error: "Invalid subscription." };
  const userAgent = (await headers()).get("user-agent");
  return savePushSubscription(
    createAdminClient(),
    member.orgId,
    member.userId,
    parsed.data,
    userAgent,
  );
}

export async function unsubscribePushAction(endpoint: unknown): Promise<PushActionResult> {
  const member = await requireMember();
  if (!member) return { ok: false, error: "Please sign in again." };
  const parsed = unsubscribeSchema.safeParse({ endpoint });
  if (!parsed.success) return { ok: false, error: "Invalid subscription." };
  await removePushSubscription(createAdminClient(), member.userId, parsed.data.endpoint);
  return { ok: true };
}

export async function sendTestPushAction(): Promise<PushActionResult> {
  const member = await requireMember();
  if (!member) return { ok: false, error: "Please sign in again." };
  const delivered = await sendPushToUser(createAdminClient(), member.userId, {
    title: "RubyOrbit Messages",
    body: "Notifications are working.",
    url: "/inbox",
  });
  return delivered > 0
    ? { ok: true }
    : { ok: false, error: "No device received it. Try enabling notifications again." };
}
