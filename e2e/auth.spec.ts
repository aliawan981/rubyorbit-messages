import { expect, test } from "@playwright/test";
import { createTestOrg, destroyTestOrg, serviceClient, type TestOrg } from "../tests/rls/helpers";

const PASSWORD = "rls-test-password-1";
let org: TestOrg;
let adminEmail: string;
const svc = serviceClient();

test.beforeAll(async () => {
  org = await createTestOrg(svc, "e2e");
  const { data } = await svc.auth.admin.getUserById(org.admin.userId);
  adminEmail = data.user!.email!;
});
test.afterAll(async () => destroyTestOrg(svc, org));

async function signIn(
  page: import("@playwright/test").Page,
  email = adminEmail,
  password = PASSWORD,
) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("opening the app lands on the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("every protected page redirects to login", async ({ page }) => {
  for (const path of ["/inbox", "/contacts", "/settings"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("wrong password shows a clear error and stays on login", async ({ page }) => {
  await page.goto("/login");
  await signIn(page, adminEmail, "wrong-password");
  await expect(page.getByText("Incorrect email or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("show/hide password toggles the field", async ({ page }) => {
  await page.goto("/login");
  const input = page.getByLabel("Password", { exact: true });
  await expect(input).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(input).toHaveAttribute("type", "text");
});

test("forgot password tells people to ask their admin", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await expect(page.getByText("Ask your admin to reset your password.")).toBeVisible();
});

test("login -> inbox, /login bounces to inbox, logout -> login", async ({ page }) => {
  await page.goto("/login");
  await signIn(page);
  await expect(page).toHaveURL(/\/inbox$/);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/inbox$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/inbox$/);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/inbox");
  await expect(page).toHaveURL(/\/login$/);
});

test("expired session shows 'Please sign in again'", async ({ page, context }) => {
  await page.goto("/login");
  await signIn(page);
  await expect(page).toHaveURL(/\/inbox$/);
  // Corrupt the session cookie, as if the token expired and could not be refreshed.
  const cookies = await context.cookies();
  await context.clearCookies();
  await context.addCookies(
    cookies.filter((c) => c.name.includes("auth-token")).map((c) => ({ ...c, value: "invalid" })),
  );
  await page.goto("/inbox");
  await expect(page).toHaveURL(/\/login\?reason=expired$/);
  await expect(page.getByText("Please sign in again.")).toBeVisible();
});

test("deactivated user sees 'Account not activated'", async ({ browser }) => {
  const { data } = await svc.auth.admin.getUserById(org.agent.userId);
  await svc.from("org_members").update({ is_active: false }).eq("user_id", org.agent.userId);
  const page = await (await browser.newContext()).newPage();
  await page.goto("/login");
  await signIn(page, data.user!.email!);
  await expect(page.getByText("Account not activated")).toBeVisible();
});

test("admin adds an agent who must set a new password at first login", async ({
  page,
  browser,
}) => {
  await page.goto("/login");
  await signIn(page);
  await expect(page).toHaveURL(/\/inbox$/);
  await page.goto("/settings");
  const email = `new-${Date.now()}@example.test`;
  await page.getByLabel("Name").first().fill("New Agent");
  await page.getByLabel("Email").first().fill(email);
  await page.getByLabel("Temporary password").fill("temp-pass-123");
  await page.getByRole("button", { name: "Add team member" }).click();
  await expect(page.getByText(email)).toBeVisible();

  const agentPage = await (await browser.newContext()).newPage();
  await agentPage.goto("/login");
  await signIn(agentPage, email, "temp-pass-123");
  await expect(agentPage).toHaveURL(/\/change-password$/);
  await agentPage.getByLabel("New password", { exact: true }).fill("brand-new-pass-1");
  await agentPage.getByLabel("Confirm new password").fill("brand-new-pass-1");
  await agentPage.getByRole("button", { name: "Save password" }).click();
  await expect(agentPage).toHaveURL(/\/inbox$/);

  const { data } = await svc.auth.admin.listUsers({ perPage: 1000 });
  const created = data.users.find((u) => u.email === email);
  if (created) await svc.auth.admin.deleteUser(created.id);
});
