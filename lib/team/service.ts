import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { guardAdminChange, type MemberLite } from "./rules";
import type { Role } from "./schemas";

export interface TeamMember {
  userId: string;
  email: string;
  displayName: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
}

type Result = { ok: true } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });

export async function listTeam(admin: SupabaseClient, orgId: string): Promise<TeamMember[]> {
  const { data: rows } = await admin
    .from("org_members")
    .select("user_id, role, display_name, is_active, must_change_password")
    .eq("org_id", orgId)
    .order("created_at");
  if (!rows?.length) return [];

  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emails = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  return rows.map((r) => ({
    userId: r.user_id,
    email: emails.get(r.user_id) ?? "",
    displayName: r.display_name,
    role: r.role as Role,
    isActive: r.is_active,
    mustChangePassword: r.must_change_password,
  }));
}

export async function addAgent(
  admin: SupabaseClient,
  orgId: string,
  input: { email: string; displayName: string; password: string; role: Role },
): Promise<Result> {
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (error || !data.user) {
    if (error?.code === "email_exists") return fail("Someone with that email already exists.");
    return fail("Couldn't create the account. Check the details and try again.");
  }
  const { error: insertError } = await admin.from("org_members").insert({
    org_id: orgId,
    user_id: data.user.id,
    role: input.role,
    display_name: input.displayName,
    must_change_password: true,
  });
  if (insertError) {
    await admin.auth.admin.deleteUser(data.user.id); // don't leave an orphan login
    return fail("Couldn't add the team member. Please try again.");
  }
  return { ok: true };
}

async function loadMembers(admin: SupabaseClient, orgId: string): Promise<MemberLite[]> {
  const { data } = await admin
    .from("org_members")
    .select("user_id, role, is_active")
    .eq("org_id", orgId);
  return (data ?? []) as MemberLite[];
}

async function updateMember(
  admin: SupabaseClient,
  orgId: string,
  actorId: string,
  userId: string,
  change: { role?: Role; is_active?: boolean },
): Promise<Result> {
  const problem = guardAdminChange(await loadMembers(admin, orgId), actorId, userId, change);
  if (problem) return fail(problem);
  const { error } = await admin
    .from("org_members")
    .update(change)
    .eq("org_id", orgId)
    .eq("user_id", userId);
  return error ? fail("Couldn't save the change. Please try again.") : { ok: true };
}

export const setMemberRole = (
  a: SupabaseClient,
  org: string,
  actor: string,
  user: string,
  role: Role,
) => updateMember(a, org, actor, user, { role });

export const setMemberActive = (
  a: SupabaseClient,
  org: string,
  actor: string,
  user: string,
  active: boolean,
) => updateMember(a, org, actor, user, { is_active: active });

export async function resetMemberPassword(
  admin: SupabaseClient,
  orgId: string,
  userId: string,
  password: string,
): Promise<Result> {
  const members = await loadMembers(admin, orgId);
  if (!members.some((m) => m.user_id === userId)) return fail("That team member was not found.");
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return fail("Couldn't reset the password. Try a different one.");
  await admin
    .from("org_members")
    .update({ must_change_password: true })
    .eq("org_id", orgId)
    .eq("user_id", userId);
  return { ok: true };
}
