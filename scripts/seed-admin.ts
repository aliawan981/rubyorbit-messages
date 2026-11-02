import "../lib/supabase/ws-polyfill";
/* Usage: npm run seed:admin -- --email you@example.com --password '...' [--name "Your Name"] [--org "RubyOrbit"] */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { parseArgs } from "node:util";

config({ path: ".env.local" });

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    password: { type: "string" },
    name: { type: "string", default: "Admin" },
    org: { type: "string", default: "RubyOrbit" },
  },
});

function need(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name}. Fill in .env.local first (see README).`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const { email, password, name, org } = values;
  if (!email || !password || password.length < 8) {
    console.error("Usage: npm run seed:admin -- --email you@example.com --password '<8+ chars>'");
    process.exit(1);
  }
  const admin = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !created.user) {
    console.error(`Could not create user: ${error?.message ?? "unknown error"}`);
    process.exit(1);
  }

  const { data: orgRow, error: orgError } = await admin
    .from("orgs")
    .insert({ name: org })
    .select("id")
    .single();
  if (orgError || !orgRow) {
    await admin.auth.admin.deleteUser(created.user.id);
    console.error(`Could not create org: ${orgError?.message}`);
    process.exit(1);
  }

  const { error: memberError } = await admin.from("org_members").insert({
    org_id: orgRow.id,
    user_id: created.user.id,
    role: "admin",
    display_name: name,
    must_change_password: false,
  });
  if (memberError) {
    await admin.from("orgs").delete().eq("id", orgRow.id);
    await admin.auth.admin.deleteUser(created.user.id);
    console.error(`Could not create membership: ${memberError.message}`);
    process.exit(1);
  }
  console.log(`Created org "${org}" and admin ${email}. You can sign in now.`);
}

void main();
