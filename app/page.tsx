import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSessionState } from "@/lib/auth/session";

async function Redirector() {
  const state = await getSessionState();
  return redirect(state.status === "anonymous" ? "/login" : "/inbox");
}

// The proxy already redirects "/", this is the server-side fallback.
export default function Home() {
  return (
    <Suspense fallback={null}>
      <Redirector />
    </Suspense>
  );
}
