"use client";

import { Bell, BellOff, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import {
  sendTestPushAction,
  subscribePushAction,
  unsubscribePushAction,
} from "@/app/(app)/settings/push-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Support = "checking" | "unsupported" | "ready";

function urlBase64ToUint8Array(base64: string) {
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function NotificationsPanel({ publicKey }: { publicKey: string | null }) {
  const [support, setSupport] = useState<Support>("checking");
  const [subscribed, setSubscribed] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    async function init() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setSupport("unsupported");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      setSubscribed(Boolean(await registration.pushManager.getSubscription()));
      setSupport("ready");
    }
    void init();
  }, []);

  function enable() {
    startTransition(async () => {
      setMessage(null);
      if (!publicKey) return setMessage({ text: "Notifications are not configured.", error: true });
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return setMessage({
          text: "Notifications are blocked. Allow them in your browser's site settings.",
          error: true,
        });
      }
      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        const subscription =
          existing ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          }));
        const result = await subscribePushAction(subscription.toJSON());
        if (!result.ok) {
          await subscription.unsubscribe();
          return setMessage({ text: result.error ?? "Something went wrong.", error: true });
        }
        setSubscribed(true);
        setMessage({ text: "Notifications enabled on this device." });
      } catch {
        setMessage({ text: "Could not enable notifications on this device.", error: true });
      }
    });
  }

  function disable() {
    startTransition(async () => {
      setMessage(null);
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribePushAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      setMessage({ text: "Notifications turned off on this device." });
    });
  }

  function sendTest() {
    startTransition(async () => {
      const result = await sendTestPushAction();
      setMessage(
        result.ok
          ? { text: "Test notification sent." }
          : { text: result.error ?? "Could not send.", error: true },
      );
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {support === "checking" && <p className="text-muted-foreground text-sm">Checking…</p>}
        {support === "unsupported" && (
          <p className="text-muted-foreground text-sm">
            This browser doesn&apos;t support notifications. On iPhone, install the app to your Home
            Screen first (Share → Add to Home Screen).
          </p>
        )}
        {support === "ready" && (
          <>
            <p className="text-muted-foreground text-sm">
              Get notified on this device when new messages arrive.
            </p>
            <div className="flex flex-wrap gap-2">
              {subscribed ? (
                <>
                  <Button variant="outline" onClick={disable} disabled={pending}>
                    <BellOff /> Turn off
                  </Button>
                  <Button variant="secondary" onClick={sendTest} disabled={pending}>
                    Send test
                  </Button>
                </>
              ) : (
                <Button onClick={enable} disabled={pending || !publicKey}>
                  {pending ? <Loader2 className="animate-spin" /> : <Bell />} Enable notifications
                </Button>
              )}
            </div>
          </>
        )}
        {message && (
          <p
            role={message.error ? "alert" : "status"}
            className={message.error ? "text-destructive text-sm" : "text-sm"}
          >
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
