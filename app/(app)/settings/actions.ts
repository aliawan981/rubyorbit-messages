"use server";

import { revalidatePath } from "next/cache";
import { getSessionState, type CurrentMember } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { addAgent, resetMemberPassword, setMemberActive, setMemberRole } from "@/lib/team/service";
import {
  addAgentSchema,
  firstIssue,
  memberIdSchema,
  resetPasswordSchema,
  setRoleSchema,
} from "@/lib/team/schemas";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

async function requireAdmin(): Promise<CurrentMember | null> {
  const state = await getSessionState();
  return state.status === "active" && state.member.role === "admin" ? state.member : null;
}

const NOT_ALLOWED: ActionState = { error: "Only admins can do that." };

async function run(
  fn: (
    admin: ReturnType<typeof createAdminClient>,
    actor: CurrentMember,
  ) => Promise<{ ok: true } | { ok: false; error: string }>,
): Promise<ActionState> {
  const actor = await requireAdmin();
  if (!actor) return NOT_ALLOWED;
  const result = await fn(createAdminClient(), actor);
  if (!result.ok) return { error: result.error };
  revalidatePath("/settings");
  return { ok: true };
}

export async function addAgentAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = addAgentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  return run((admin, actor) => addAgent(admin, actor.orgId, parsed.data));
}

export async function setRoleAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = setRoleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  return run((admin, actor) =>
    setMemberRole(admin, actor.orgId, actor.userId, parsed.data.userId, parsed.data.role),
  );
}

export async function setActiveAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = memberIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const active = formData.get("active") === "true";
  return run((admin, actor) =>
    setMemberActive(admin, actor.orgId, actor.userId, parsed.data.userId, active),
  );
}

export async function resetPasswordAction(
  _p: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  return run((admin, actor) =>
    resetMemberPassword(admin, actor.orgId, parsed.data.userId, parsed.data.password),
  );
}
