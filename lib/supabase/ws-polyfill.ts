import WebSocket from "ws";

// supabase-js constructs a Realtime client eagerly and needs a native WebSocket (Node 22+).
// On Node 20 (still supported by Next.js) fall back to `ws`. No-op where WebSocket exists.
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;
}
