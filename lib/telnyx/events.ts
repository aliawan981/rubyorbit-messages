import { z } from "zod";

const phone = z.object({ phone_number: z.string() }).loose();

const messagePayload = z
  .object({
    id: z.string(),
    direction: z.string().optional(),
    from: phone.optional(),
    to: z.array(phone.extend({ status: z.string().optional() })).optional(),
    text: z.string().nullish(),
    media: z.array(z.object({ url: z.string() }).loose()).nullish(),
    errors: z
      .array(z.object({ title: z.string().optional(), detail: z.string().optional() }).loose())
      .nullish(),
  })
  .loose();

export const webhookSchema = z.object({
  data: z.object({
    event_type: z.string(),
    id: z.string().optional(),
    payload: z.unknown(),
  }),
});

export type TelnyxEvent =
  | { kind: "inbound"; messageId: string; from: string; to: string; text: string; media: string[] }
  | {
      kind: "status";
      messageId: string;
      status: "sent" | "delivered" | "failed";
      error: string | null;
    }
  | { kind: "ignored"; eventType: string };

/** Turns a raw webhook body into a typed event. Returns null if it is not a valid Telnyx event. */
export function parseTelnyxEvent(body: unknown): TelnyxEvent | null {
  const envelope = webhookSchema.safeParse(body);
  if (!envelope.success) return null;
  const { event_type: eventType, payload } = envelope.data.data;

  if (eventType === "message.received") {
    const p = messagePayload.safeParse(payload);
    const from = p.success ? p.data.from?.phone_number : undefined;
    const to = p.success ? p.data.to?.[0]?.phone_number : undefined;
    if (!p.success || !from || !to) return null;
    return {
      kind: "inbound",
      messageId: p.data.id,
      from,
      to,
      text: p.data.text ?? "",
      media: (p.data.media ?? []).map((m) => m.url),
    };
  }

  if (eventType === "message.sent" || eventType === "message.finalized") {
    const p = messagePayload.safeParse(payload);
    if (!p.success) return null;
    const raw = p.data.to?.[0]?.status ?? (eventType === "message.sent" ? "sent" : "");
    const status =
      raw === "delivered"
        ? "delivered"
        : raw === "sent" || raw === "sending"
          ? "sent"
          : raw
            ? "failed"
            : null;
    if (!status) return { kind: "ignored", eventType };
    const e = p.data.errors?.[0];
    return {
      kind: "status",
      messageId: p.data.id,
      status,
      error: status === "failed" ? (e?.detail ?? e?.title ?? raw) : null,
    };
  }

  return { kind: "ignored", eventType };
}
