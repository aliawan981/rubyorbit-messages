/** Map Supabase Auth errors to plain English. */
export function friendlyAuthError(error: {
  message?: string;
  code?: string;
  status?: number;
}): string {
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();
  if (code === "invalid_credentials" || msg.includes("invalid login")) {
    return "Incorrect email or password.";
  }
  if (code === "over_request_rate_limit" || error.status === 429) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (code === "user_banned") return "This account has been disabled. Ask your admin for help.";
  if (msg.includes("fetch failed") || msg.includes("network")) {
    return "Can't reach the server. Check your connection and try again.";
  }
  return "Something went wrong signing you in. Please try again.";
}

export const SIGN_IN_AGAIN_MESSAGE = "Please sign in again.";
