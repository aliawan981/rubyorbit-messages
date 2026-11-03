import { z } from "zod";

/** Treat empty strings (as in a fresh .env.example copy) as "not set". */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

const e164 = z.string().regex(/^\+[1-9]\d{6,14}$/, "must be E.164, e.g. +15551234567");

export const serverEnvSchema = z.object({
  APP_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Telnyx is optional: without it the app runs in mock mode (messages stored, nothing sent).
  TELNYX_API_KEY: optional(z.string().min(1)),
  TELNYX_PUBLIC_KEY: optional(z.string().min(1)),
  TELNYX_PHONE_NUMBER: optional(e164),
  TELNYX_MESSAGING_PROFILE_ID: optional(z.string().min(1)),
  DEFAULT_COUNTRY_CODE: z.preprocess(
    (v) => (v === "" || v === undefined ? "1" : v),
    z.string().regex(/^\d{1,3}$/),
  ),

  CRON_SECRET: optional(z.string().min(16)),

  NEXT_PUBLIC_VAPID_PUBLIC_KEY: optional(z.string()),
  VAPID_PRIVATE_KEY: optional(z.string()),
  VAPID_SUBJECT: optional(z.string()),

  RUBYORBIT_API_KEYS: optional(z.string()),
});

export const publicEnvSchema = serverEnvSchema.pick({
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: true,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${problems}`);
  }
  return result.data;
}

let cached: ServerEnv | undefined;

/** Validated server env. Call lazily (inside handlers), never at module load, so `next build` works without secrets. */
export function getEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}

/** Public (browser-safe) env. NEXT_PUBLIC_* must be referenced literally so Next inlines them. */
export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || undefined,
  });
}
