import { createPublicKey, verify } from "node:crypto";

// DER prefix for a raw 32-byte Ed25519 public key (SPKI).
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

/** Telnyx rejects replays outside this window; so do we. */
export const MAX_WEBHOOK_AGE_SECONDS = 5 * 60;

export interface SignatureInput {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  /** Base64 public key from Telnyx Mission Control. */
  publicKey: string;
  /** Injectable for tests. */
  nowSeconds?: number;
}

/** Verifies a Telnyx webhook: Ed25519 over `${timestamp}|${rawBody}`. */
export function verifyTelnyxSignature(input: SignatureInput): boolean {
  const { rawBody, signature, timestamp, publicKey } = input;
  if (!signature || !timestamp) return false;

  const ts = Number(timestamp);
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > MAX_WEBHOOK_AGE_SECONDS) return false;

  try {
    const raw = Buffer.from(publicKey, "base64");
    if (raw.length !== 32) return false;
    const key = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, raw]),
      format: "der",
      type: "spki",
    });
    return verify(
      null,
      Buffer.from(`${timestamp}|${rawBody}`),
      key,
      Buffer.from(signature, "base64"),
    );
  } catch {
    return false;
  }
}
