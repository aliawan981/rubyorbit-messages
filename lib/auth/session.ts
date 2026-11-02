import { connection } from "next/server";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/team/schemas";

export interface CurrentMember {
  orgId: string;
  orgName: string;
  userId: string;
  email: string;
  role: Role;
  displayName: string;
  mustChangePassword: boolean;
}

export type SessionState =
  | { status: "anonymous" }
  | { status: "inactive"; email: string }
  | { status: "active"; member: CurrentMember };

/** Resolves the logged-in user and their active org membership (deduped per request). */
export const getSessionState = cache(async (): Promise<SessionState> => {
  // Supabase checks token expiry with Date.now(); force request-time rendering so Next never prerenders it.
  await connection();
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { status: "anonymous" };

  const { data: row } = await supabase
    .from("org_members")
    .select("org_id, role, display_name, is_active, must_change_password, orgs(name)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row || !row.is_active) return { status: "inactive", email: user.email ?? "" };

  const org = Array.isArray(row.orgs) ? row.orgs[0] : row.orgs;
  return {
    status: "active",
    member: {
      orgId: row.org_id,
      orgName: org?.name ?? "",
      userId: user.id,
      email: user.email ?? "",
      role: row.role as Role,
      displayName: row.display_name,
      mustChangePassword: row.must_change_password,
    },
  };
});
