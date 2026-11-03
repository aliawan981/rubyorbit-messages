import { describe, expect, it } from "vitest";
import { decideRoute, isPublicPath } from "@/lib/auth/routing";

const anon = { hasUser: false, hadSessionCookie: false };
const authed = { hasUser: true, hadSessionCookie: true };

describe("decideRoute", () => {
  it("sends anonymous visitors of / to /login", () => {
    expect(decideRoute({ pathname: "/", ...anon })).toEqual({ action: "redirect", to: "/login" });
  });
  it("sends logged-in visitors of / to /inbox", () => {
    expect(decideRoute({ pathname: "/", ...authed })).toEqual({ action: "redirect", to: "/inbox" });
  });
  it("protects every non-public page", () => {
    for (const p of ["/inbox", "/inbox/abc", "/contacts", "/settings", "/change-password"]) {
      expect(decideRoute({ pathname: p, ...anon })).toEqual({ action: "redirect", to: "/login" });
    }
  });
  it("flags an expired session when a stale cookie exists", () => {
    expect(decideRoute({ pathname: "/inbox", hasUser: false, hadSessionCookie: true })).toEqual({
      action: "redirect",
      to: "/login",
      search: { reason: "expired" },
    });
  });
  it("lets anonymous users see /login but bounces logged-in users to /inbox", () => {
    expect(decideRoute({ pathname: "/login", ...anon })).toEqual({ action: "next" });
    expect(decideRoute({ pathname: "/login", ...authed })).toEqual({
      action: "redirect",
      to: "/inbox",
    });
  });
  it("leaves webhook, cron and API-key routes to their own auth", () => {
    for (const p of ["/api/webhooks/telnyx", "/api/cron/keepalive", "/api/v1/messages"]) {
      expect(isPublicPath(p)).toBe(true);
      expect(decideRoute({ pathname: p, ...anon })).toEqual({ action: "next" });
    }
  });
  it("does not treat look-alike paths as public", () => {
    expect(isPublicPath("/loginx")).toBe(false);
    expect(isPublicPath("/api/messages/send")).toBe(false);
  });
});
