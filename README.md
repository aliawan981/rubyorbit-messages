# RubyOrbit Messages

Two-way SMS inbox (installable PWA) for RubyOrbit teams. Agents reply manually from the app; there are no AI features.

Stack: Next.js (App Router, TypeScript strict), Tailwind + shadcn/ui, Supabase Free plan (Postgres, Auth, Realtime, Storage), Twilio, Vercel.

## Quick start

1. **Create a free Supabase project** at https://supabase.com (Free plan). Under _Project Settings -> API_ copy the Project URL, `anon` key and `service_role` key.
2. `cp .env.example .env.local` and paste the Supabase values. Set `APP_URL=http://localhost:3000`. Leave the Twilio values empty: the app runs in **mock mode**.
3. `npm install`
4. Apply migrations to your Supabase project: `npx supabase link --project-ref <ref>` then `npm run db:push`.
5. In Supabase _Authentication -> Providers -> Email_, turn **off** "Allow new users to sign up".
6. `npm run seed:admin -- --email you@example.com --password '...'` creates the first org and admin so you can sign in on day one.
7. `npm run dev` and open http://localhost:3000.

## Local development with a local Supabase (optional)

Needs Docker. `npm run db:start` boots Postgres, Auth and Realtime locally and applies `supabase/migrations`. Run `npx supabase status -o env` and copy `API_URL`, `ANON_KEY` and `SERVICE_ROLE_KEY` into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. Sign-ups are disabled in `supabase/config.toml`.

## Sign-in and team

- Opening the app always lands on `/login`; every other page needs a session (checked in `proxy.ts` and again in the protected layout).
- There are no emails. An admin adds an agent in **Settings** with a temporary password; the agent must choose their own at first sign-in. Admins can also deactivate agents, change roles and reset passwords there.
- "Forgot password?" tells people to ask their admin.

## Node version

Node 22+ is recommended (Vercel uses it). Node 20 also works: `lib/supabase/ws-polyfill.ts` supplies the WebSocket that supabase-js expects.

## Tests

- `npm test`: unit tests plus RLS policy tests. The RLS tests need a running Supabase configured in `.env.local` and are skipped otherwise.
- `npm run test:e2e`: Playwright (needs a running Supabase; starts the dev server itself). First time: `npx playwright install chromium`.

## Scripts

| Command                                         | Purpose           |
| ----------------------------------------------- | ----------------- |
| `npm run dev`                                   | Dev server        |
| `npm run typecheck` / `lint` / `test` / `build` | Phase gate checks |
| `npm run test:e2e`                              | Playwright e2e    |
| `npm run db:push`                               | Apply migrations  |

## Twilio

Keys are added last. See `docs/TWILIO_SETUP.md` (written in Phase 2).

## TODO

- If a custom SMTP is added to Supabase later, enable invite/reset emails. Until then, admins create agents with a temporary password and reset passwords from Settings.
