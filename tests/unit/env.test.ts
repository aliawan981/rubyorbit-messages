import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env";

const base = {
  APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
};

describe("parseServerEnv", () => {
  it("accepts empty Telnyx vars (mock mode)", () => {
    const env = parseServerEnv({
      ...base,
      TELNYX_API_KEY: "",
      TELNYX_PUBLIC_KEY: "",
      TELNYX_PHONE_NUMBER: "",
      TELNYX_MESSAGING_PROFILE_ID: "",
    });
    expect(env.TELNYX_API_KEY).toBeUndefined();
    expect(env.DEFAULT_COUNTRY_CODE).toBe("1");
  });

  it("rejects missing Supabase config with a readable message", () => {
    expect(() => parseServerEnv({ APP_URL: "http://localhost:3000" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  it("rejects a malformed phone number", () => {
    expect(() => parseServerEnv({ ...base, TELNYX_PHONE_NUMBER: "555" })).toThrow(/E\.164/);
  });
});
