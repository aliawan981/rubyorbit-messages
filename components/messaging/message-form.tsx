"use client";

import { Loader2, Send } from "lucide-react";
import { useActionState } from "react";
import { sendMessageAction, type SendState } from "@/app/(app)/inbox/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Reply form (phone fixed) or new-message form (phone editable). */
export function MessageForm({ phone }: { phone?: string }) {
  const [state, action, pending] = useActionState<SendState, FormData>(sendMessageAction, {});

  return (
    <form action={action} className="space-y-2" key={state.error ? "err" : "ok"}>
      {phone ? (
        <input type="hidden" name="phone" value={phone} />
      ) : (
        <Input
          name="phone"
          type="tel"
          placeholder="Phone number, e.g. +15551234567"
          defaultValue={state.phone}
          required
          aria-label="Phone number"
        />
      )}
      <div className="flex items-end gap-2">
        <textarea
          name="body"
          rows={2}
          maxLength={1600}
          required
          defaultValue={state.body}
          placeholder="Type a message…"
          aria-label="Message"
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-10 w-full resize-none rounded-lg border bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:ring-3"
        />
        <Button type="submit" disabled={pending} aria-label="Send">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          <span className="hidden sm:inline">Send</span>
        </Button>
      </div>
      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
