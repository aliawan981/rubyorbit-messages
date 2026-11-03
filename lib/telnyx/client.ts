import "server-only";
import { getEnv } from "@/lib/env";

const API_URL = "https://api.telnyx.com/v2/messages";

export interface TelnyxConfig {
  apiKey: string;
  fromNumber: string;
  messagingProfileId?: string;
}

/** Returns the sending config, or null when Telnyx is not configured (mock mode). */
export function getTelnyxConfig(): TelnyxConfig | null {
  const env = getEnv();
  if (!env.TELNYX_API_KEY || !env.TELNYX_PHONE_NUMBER) return null;
  return {
    apiKey: env.TELNYX_API_KEY,
    fromNumber: env.TELNYX_PHONE_NUMBER,
    messagingProfileId: env.TELNYX_MESSAGING_PROFILE_ID,
  };
}

export type SendResult = { ok: true; messageId: string | null } | { ok: false; error: string };

/** Sends one SMS/MMS. In mock mode (no config) nothing leaves the machine and the send "succeeds". */
export async function sendTelnyxMessage(input: {
  to: string;
  text: string;
  mediaUrls?: string[];
}): Promise<SendResult> {
  const config = getTelnyxConfig();
  if (!config) return { ok: true, messageId: null };

  const body: Record<string, unknown> = { from: config.fromNumber, to: input.to, text: input.text };
  if (config.messagingProfileId) body.messaging_profile_id = config.messagingProfileId;
  if (input.mediaUrls?.length) body.media_urls = input.mediaUrls;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as {
      data?: { id?: string };
      errors?: { detail?: string; title?: string }[];
    };
    if (!res.ok) {
      const e = json.errors?.[0];
      return { ok: false, error: e?.detail ?? e?.title ?? `Telnyx returned ${res.status}` };
    }
    return { ok: true, messageId: json.data?.id ?? null };
  } catch {
    return { ok: false, error: "Could not reach Telnyx. Check your connection." };
  }
}
