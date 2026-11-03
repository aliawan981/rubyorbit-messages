import { getEnv } from "@/lib/env";
import { applyStatus, ingestInbound } from "@/lib/messaging/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseTelnyxEvent } from "@/lib/telnyx/events";
import { verifyTelnyxSignature } from "@/lib/telnyx/signature";

/** Telnyx webhook: inbound messages and delivery status. Public path; authenticated by signature. */
export async function POST(request: Request) {
  const env = getEnv();
  const rawBody = await request.text();

  // With a public key configured the signature is mandatory. Without one (local mock mode) we accept
  // unsigned requests only outside production so you can curl the endpoint during development.
  if (env.TELNYX_PUBLIC_KEY) {
    const valid = verifyTelnyxSignature({
      rawBody,
      signature: request.headers.get("telnyx-signature-ed25519"),
      timestamp: request.headers.get("telnyx-timestamp"),
      publicKey: env.TELNYX_PUBLIC_KEY,
    });
    if (!valid) return new Response("Invalid signature", { status: 401 });
  } else if (process.env.NODE_ENV === "production") {
    return new Response("Webhook is not configured", { status: 503 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const event = parseTelnyxEvent(json);
  if (!event) return new Response("Unrecognised event", { status: 400 });

  // Process before replying: on failure we return 500 so Telnyx retries instead of losing the message.
  // (Inbound handling is idempotent per Telnyx message id, so retries are safe.)
  const admin = createAdminClient();
  try {
    if (event.kind === "inbound") {
      const outcome = await ingestInbound(admin, event);
      if (outcome === "unknown-number") console.warn("Telnyx inbound for unknown number", event.to);
    } else if (event.kind === "status") {
      await applyStatus(admin, event);
    }
  } catch (error) {
    console.error("Telnyx webhook processing failed", error);
    return new Response("Processing failed", { status: 500 });
  }
  return new Response(null, { status: 200 });
}
