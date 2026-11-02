"use server";

import { redirect } from "next/navigation";
import { friendlyAuthError } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/server";
import { firstIssue, loginSchema } from "@/lib/team/schemas";

export interface LoginState {
  error?: string;
  email?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const rawEmail = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: firstIssue(parsed.error), email: rawEmail };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: friendlyAuthError(error), email: rawEmail };

  redirect("/inbox");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
