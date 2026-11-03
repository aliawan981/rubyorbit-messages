/** Pure routing rules for the request proxy, kept separate so they can be unit tested. */

const PUBLIC_PREFIXES = ["/login", "/api/webhooks/", "/api/cron/", "/api/v1/"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`),
  );
}

export type RouteDecision =
  { action: "next" } | { action: "redirect"; to: string; search?: Record<string, string> };

export function decideRoute(input: {
  pathname: string;
  hasUser: boolean;
  hadSessionCookie: boolean;
}): RouteDecision {
  const { pathname, hasUser, hadSessionCookie } = input;

  if (pathname === "/") {
    return { action: "redirect", to: hasUser ? "/inbox" : "/login" };
  }
  if (pathname === "/login") {
    return hasUser ? { action: "redirect", to: "/inbox" } : { action: "next" };
  }
  if (isPublicPath(pathname)) return { action: "next" };

  if (!hasUser) {
    return hadSessionCookie
      ? { action: "redirect", to: "/login", search: { reason: "expired" } }
      : { action: "redirect", to: "/login" };
  }
  return { action: "next" };
}
