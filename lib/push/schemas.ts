import { z } from "zod";

export const pushSubscriptionSchema = z.object({
  endpoint: z.url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(256),
    auth: z.string().min(1).max(256),
  }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export const unsubscribeSchema = z.object({ endpoint: z.url().max(2048) });

export interface PushPayload {
  title: string;
  body: string;
  /** Path opened when the notification is tapped. */
  url?: string;
}
