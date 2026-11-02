import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env";

const base = {
  APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
};

describe("parseServerEnv", () => {
  it("accepts empty Twilio vars (mock mode)", () => {
    const env = parseServerEnv({
      ...base,
      TWILIO_ACCOUNT_SID: "",
      TWILIO_AUTH_TOKEN: "",
      TWILIO_PHONE_NUMBER: "",
      TWILIO_MESSAGING_SERVICE_SID: "",
    });
    expect(env.TWILIO_ACCOUNT_SID).toBeUndefined();
    expect(env.DEFAULT_COUNTRY_CODE).toBe("1");
  });

  it("rejects missing Supabase config with a readable message", () => {
    expect(() => parseServerEnv({ APP_URL: "http://localhost:3000" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  it("rejects a malformed phone number", () => {
    expect(() => parseServerEnv({ ...base, TWILIO_PHONE_NUMBER: "555" })).toThrow(/E\.164/);
  });
});
