import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { getEnv } from "@/lib/env";
import type { PushPayload, PushSubscriptionInput } from "./schemas";

type Admin = SupabaseClient;

export function isPushConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
}

export async function savePushSubscription(
  admin: Admin,
  orgId: string,
  userId: string,
  sub: PushSubscriptionInput,
  userAgent: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Upsert on endpoint: the same browser re-subscribing (or a different user on a shared device) takes over the row.
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      org_id: orgId,
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      user_agent: userAgent,
    },
    { onConflict: "endpoint" },
  );
  return error ? { ok: false, error: "Could not save notification settings." } : { ok: true };
}

export async function removePushSubscription(admin: Admin, userId: string, endpoint: string) {
  await admin.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);
}

/** Sends a notification to every device a user has enabled. Returns how many were delivered. */
export async function sendPushToUser(
  admin: Admin,
  userId: string,
  payload: PushPayload,
): Promise<number> {
  const env = getEnv();
  if (!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return 0;

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (!subs?.length) return 0;

  const body = JSON.stringify(payload);
  const options = {
    vapidDetails: {
      subject: env.VAPID_SUBJECT,
      publicKey: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY,
    },
    TTL: 60 * 60,
  };

  const expired: string[] = [];
  let delivered = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
          options,
        );
        delivered++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // 404/410 mean the browser revoked the subscription: drop it.
        if (status === 404 || status === 410) expired.push(s.id);
        else console.error("Push send failed", status);
      }
    }),
  );

  if (expired.length) await admin.from("push_subscriptions").delete().in("id", expired);
  return delivered;
}
