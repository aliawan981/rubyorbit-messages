import { z } from "zod";

export const roleSchema = z.enum(["admin", "agent"]);
export type Role = z.infer<typeof roleSchema>;

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password is too long.");

const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const addAgentSchema = z.object({
  email: emailSchema,
  displayName: z.string().trim().min(1, "Enter a name.").max(80),
  password: passwordSchema,
  role: roleSchema.default("agent"),
});

export const changePasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords don't match.",
  });

export const memberIdSchema = z.object({ userId: z.uuid() });
export const setRoleSchema = memberIdSchema.extend({ role: roleSchema });
export const resetPasswordSchema = memberIdSchema.extend({ password: passwordSchema });

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input.";
}
