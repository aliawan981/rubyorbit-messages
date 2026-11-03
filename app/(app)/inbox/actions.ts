"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionState } from "@/lib/auth/session";
import { sendMessage } from "@/lib/messaging/service";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SendState {
  error?: string;
  body?: string;
  phone?: string;
}

const formSchema = z.object({
  phone: z.string().trim().min(1, "Enter a phone number."),
  body: z.string(),
});

export async function sendMessageAction(_prev: SendState, formData: FormData): Promise<SendState> {
  const state = await getSessionState();
  if (state.status !== "active") return { error: "Please sign in again." };

  const parsed = formSchema.safeParse({
    phone: formData.get("phone"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form.",
      body: String(formData.get("body") ?? ""),
    };
  }

  const result = await sendMessage(createAdminClient(), {
    orgId: state.member.orgId,
    userId: state.member.userId,
    phone: parsed.data.phone,
    body: parsed.data.body,
  });
  if (!result.ok) return { error: result.error, body: parsed.data.body, phone: parsed.data.phone };

  redirect(`/inbox/${result.conversationId}`);
}
