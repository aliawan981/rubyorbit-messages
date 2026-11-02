import "./ws-polyfill";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { decideRoute } from "@/lib/auth/routing";
import { getPublicEnv } from "@/lib/env";

/** Refreshes the Supabase session cookies and applies the login-first routing rules. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = getPublicEnv();

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const hadSessionCookie = request.cookies.getAll().some((c) => /^sb-.*-auth-token/.test(c.name));
  let hasUser = false;
  try {
    const { data } = await supabase.auth.getUser();
    hasUser = Boolean(data.user);
  } catch {
    hasUser = false;
  }

  const decision = decideRoute({ pathname: request.nextUrl.pathname, hasUser, hadSessionCookie });
  if (decision.action === "next") return response;

  const url = request.nextUrl.clone();
  url.pathname = decision.to;
  url.search = new URLSearchParams(decision.search).toString();
  const redirect = NextResponse.redirect(url);
  // Carry over any refreshed/cleared auth cookies.
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}
