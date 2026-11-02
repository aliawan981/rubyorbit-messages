import "../../lib/supabase/ws-polyfill";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** RLS tests need a running Supabase (local `supabase start` is fine); they skip otherwise. */
export const hasSupabase = Boolean(url && anonKey && serviceKey);

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
export const serviceClient = () => createClient(url!, serviceKey!, opts);
export const anonClient = () => createClient(url!, anonKey!, opts);

export interface TestOrg {
  orgId: string;
  admin: { userId: string; client: SupabaseClient };
  agent: { userId: string; client: SupabaseClient };
}

const PASSWORD = "rls-test-password-1";

async function makeUser(svc: SupabaseClient, email: string) {
  const { data, error } = await svc.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (signInError) throw new Error(`signIn failed: ${signInError.message}`);
  return { userId: data.user.id, client };
}

/** Creates an org with one admin and one agent, both signed in with RLS-bound clients. */
export async function createTestOrg(svc: SupabaseClient, label: string): Promise<TestOrg> {
  const run = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const { data: org, error } = await svc
    .from("orgs")
    .insert({ name: `Org ${run}` })
    .select("id")
    .single();
  if (error || !org) throw new Error(`org insert failed: ${error?.message}`);
  const admin = await makeUser(svc, `admin-${run}@example.test`);
  const agent = await makeUser(svc, `agent-${run}@example.test`);
  const { error: mErr } = await svc.from("org_members").insert([
    { org_id: org.id, user_id: admin.userId, role: "admin", display_name: "Admin" },
    { org_id: org.id, user_id: agent.userId, role: "agent", display_name: "Agent" },
  ]);
  if (mErr) throw new Error(`members insert failed: ${mErr.message}`);
  return { orgId: org.id, admin, agent };
}

export async function destroyTestOrg(svc: SupabaseClient, org: TestOrg) {
  await svc.from("orgs").delete().eq("id", org.orgId);
  await svc.auth.admin.deleteUser(org.admin.userId);
  await svc.auth.admin.deleteUser(org.agent.userId);
}
