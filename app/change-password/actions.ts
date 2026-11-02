"use server";

import { redirect } from "next/navigation";
import { getSessionState } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { changePasswordSchema, firstIssue } from "@/lib/team/schemas";

export interface PasswordState {
  error?: string;
}

export async function changePasswordAction(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const state = await getSessionState();
  if (state.status !== "active") redirect("/login");

  const parsed = changePasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(state.member.userId, {
    password: parsed.data.password,
  });
  if (error) return { error: "Couldn't update your password. Try a different one." };

  await admin
    .from("org_members")
    .update({ must_change_password: false })
    .eq("org_id", state.member.orgId)
    .eq("user_id", state.member.userId);

  redirect("/inbox");
}
