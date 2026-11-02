import { describe, expect, it } from "vitest";
import { friendlyAuthError } from "@/lib/auth/errors";
import { guardAdminChange, type MemberLite } from "@/lib/team/rules";
import { addAgentSchema, changePasswordSchema, loginSchema } from "@/lib/team/schemas";

const members: MemberLite[] = [
  { user_id: "a", role: "admin", is_active: true },
  { user_id: "b", role: "agent", is_active: true },
];

describe("guardAdminChange", () => {
  it("blocks removing your own admin access", () => {
    expect(guardAdminChange(members, "a", "a", { role: "agent" })).toMatch(/own admin/);
    expect(guardAdminChange(members, "a", "a", { is_active: false })).toMatch(/own admin/);
  });
  it("blocks removing the last admin", () => {
    expect(guardAdminChange(members, "b", "a", { is_active: false })).toMatch(/at least one/);
  });
  it("allows demoting an admin when another remains", () => {
    const two = [...members, { user_id: "c", role: "admin" as const, is_active: true }];
    expect(guardAdminChange(two, "a", "c", { role: "agent" })).toBeNull();
  });
  it("allows ordinary agent changes", () => {
    expect(guardAdminChange(members, "a", "b", { is_active: false })).toBeNull();
    expect(guardAdminChange(members, "a", "b", { role: "admin" })).toBeNull();
  });
  it("reports unknown members", () => {
    expect(guardAdminChange(members, "a", "zzz", { role: "agent" })).toMatch(/not found/);
  });
});

describe("schemas", () => {
  it("normalizes login email", () => {
    expect(loginSchema.parse({ email: " Me@Example.COM ", password: "x" }).email).toBe(
      "me@example.com",
    );
  });
  it("rejects short passwords for new agents", () => {
    expect(
      addAgentSchema.safeParse({ email: "a@b.co", displayName: "A", password: "short" }).success,
    ).toBe(false);
  });
  it("defaults new members to the agent role", () => {
    expect(
      addAgentSchema.parse({ email: "a@b.co", displayName: "A", password: "longenough" }).role,
    ).toBe("agent");
  });
  it("requires matching passwords", () => {
    const r = changePasswordSchema.safeParse({ password: "longenough", confirm: "different1" });
    expect(r.success).toBe(false);
  });
});

describe("friendlyAuthError", () => {
  it("is plain English", () => {
    expect(friendlyAuthError({ code: "invalid_credentials" })).toBe("Incorrect email or password.");
    expect(friendlyAuthError({ status: 429 })).toMatch(/Too many/);
    expect(friendlyAuthError({ message: "boom" })).toMatch(/try again/);
  });
});
