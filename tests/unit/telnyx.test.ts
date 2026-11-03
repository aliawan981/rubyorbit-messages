import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/lib/messaging/phone";
import { parseTelnyxEvent } from "@/lib/telnyx/events";
import { verifyTelnyxSignature } from "@/lib/telnyx/signature";

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const publicKeyB64 = publicKey
  .export({ format: "der", type: "spki" })
  .subarray(-32)
  .toString("base64");

function signed(body: string, ts: number) {
  const signature = sign(null, Buffer.from(`${ts}|${body}`), privateKey).toString("base64");
  return {
    rawBody: body,
    signature,
    timestamp: String(ts),
    publicKey: publicKeyB64,
    nowSeconds: ts,
  };
}

describe("verifyTelnyxSignature", () => {
  it("accepts a correctly signed body", () => {
    expect(verifyTelnyxSignature(signed('{"a":1}', 1_700_000_000))).toBe(true);
  });
  it("rejects a tampered body", () => {
    expect(verifyTelnyxSignature({ ...signed('{"a":1}', 1_700_000_000), rawBody: '{"a":2}' })).toBe(
      false,
    );
  });
  it("rejects stale timestamps (replay)", () => {
    const input = signed("{}", 1_700_000_000);
    expect(verifyTelnyxSignature({ ...input, nowSeconds: 1_700_000_000 + 600 })).toBe(false);
  });
  it("rejects missing headers and bad keys", () => {
    const input = signed("{}", 1_700_000_000);
    expect(verifyTelnyxSignature({ ...input, signature: null })).toBe(false);
    expect(verifyTelnyxSignature({ ...input, publicKey: "not-a-key" })).toBe(false);
  });
});

describe("parseTelnyxEvent", () => {
  it("parses an inbound message", () => {
    const event = parseTelnyxEvent({
      data: {
        event_type: "message.received",
        payload: {
          id: "m1",
          from: { phone_number: "+15550001111" },
          to: [{ phone_number: "+15552223333" }],
          text: "hello",
          media: [{ url: "https://x/y.jpg" }],
        },
      },
    });
    expect(event).toEqual({
      kind: "inbound",
      messageId: "m1",
      from: "+15550001111",
      to: "+15552223333",
      text: "hello",
      media: ["https://x/y.jpg"],
    });
  });
  it("parses delivery status and failures", () => {
    const delivered = parseTelnyxEvent({
      data: {
        event_type: "message.finalized",
        payload: { id: "m1", to: [{ phone_number: "+1", status: "delivered" }] },
      },
    });
    expect(delivered).toMatchObject({ kind: "status", status: "delivered", error: null });
    const failed = parseTelnyxEvent({
      data: {
        event_type: "message.finalized",
        payload: {
          id: "m1",
          to: [{ phone_number: "+1", status: "delivery_failed" }],
          errors: [{ detail: "Blocked" }],
        },
      },
    });
    expect(failed).toMatchObject({ kind: "status", status: "failed", error: "Blocked" });
  });
  it("ignores other events and rejects garbage", () => {
    expect(parseTelnyxEvent({ data: { event_type: "message.something", payload: {} } })).toEqual({
      kind: "ignored",
      eventType: "message.something",
    });
    expect(parseTelnyxEvent({ nope: true })).toBeNull();
  });
});

describe("normalizePhone", () => {
  it("normalizes common formats", () => {
    expect(normalizePhone("(555) 123-4567")).toBe("+15551234567");
    expect(normalizePhone("+44 7700 900123")).toBe("+447700900123");
    expect(normalizePhone("0044 7700 900123")).toBe("+447700900123");
    expect(normalizePhone("03001234567", "92")).toBe("+923001234567");
  });
  it("rejects junk", () => {
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("123")).toBeNull();
  });
});
