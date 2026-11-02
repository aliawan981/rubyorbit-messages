import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  anonClient,
  createTestOrg,
  destroyTestOrg,
  hasSupabase,
  serviceClient,
  type TestOrg,
} from "./helpers";

describe.skipIf(!hasSupabase)("RLS: orgs and org_members", () => {
  const svc = hasSupabase ? serviceClient() : (null as never);
  let a: TestOrg;
  let b: TestOrg;

  beforeAll(async () => {
    a = await createTestOrg(svc, "a");
    b = await createTestOrg(svc, "b");
  });
  afterAll(async () => {
    await destroyTestOrg(svc, a);
    await destroyTestOrg(svc, b);
  });

  it("org A members see only org A", async () => {
    const { data } = await a.admin.client.from("orgs").select("id");
    expect(data?.map((o) => o.id)).toEqual([a.orgId]);
    const { data: agentView } = await a.agent.client.from("orgs").select("id");
    expect(agentView?.map((o) => o.id)).toEqual([a.orgId]);
  });

  it("org A can never read org B's org row or members", async () => {
    const { data: org } = await a.admin.client.from("orgs").select("id").eq("id", b.orgId);
    expect(org).toEqual([]);
    const { data: members } = await a.admin.client
      .from("org_members")
      .select("user_id")
      .eq("org_id", b.orgId);
    expect(members).toEqual([]);
  });

  it("teammates can see each other within the org", async () => {
    const { data } = await a.agent.client
      .from("org_members")
      .select("user_id")
      .eq("org_id", a.orgId);
    expect(data).toHaveLength(2);
  });

  it("anonymous visitors see nothing", async () => {
    const anon = anonClient();
    expect((await anon.from("orgs").select("id")).data).toEqual([]);
    expect((await anon.from("org_members").select("user_id")).data).toEqual([]);
  });

  it("browser sessions cannot write, even an admin of their own org", async () => {
    const upd = await a.admin.client
      .from("orgs")
      .update({ name: "hacked" })
      .eq("id", a.orgId)
      .select();
    expect(upd.data ?? []).toEqual([]);
    const role = await a.agent.client
      .from("org_members")
      .update({ role: "admin" })
      .eq("user_id", a.agent.userId)
      .select();
    expect(role.data ?? []).toEqual([]);
    const ins = await a.admin.client
      .from("org_members")
      .insert({ org_id: b.orgId, user_id: a.admin.userId, role: "admin", display_name: "x" });
    expect(ins.error).not.toBeNull();
    const del = await a.admin.client
      .from("org_members")
      .delete()
      .eq("user_id", a.agent.userId)
      .select();
    expect(del.data ?? []).toEqual([]);
  });

  it("a deactivated member loses access to team data but can still read their own row", async () => {
    await svc.from("org_members").update({ is_active: false }).eq("user_id", a.agent.userId);
    expect((await a.agent.client.from("orgs").select("id")).data).toEqual([]);
    const { data: own } = await a.agent.client.from("org_members").select("user_id, is_active");
    expect(own).toEqual([{ user_id: a.agent.userId, is_active: false }]);
  });
});
