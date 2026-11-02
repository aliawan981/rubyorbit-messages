# RubyOrbit Messages

Two-way SMS inbox (installable PWA) for RubyOrbit teams. Agents reply manually from the app; there are no AI features.

Stack: Next.js (App Router, TypeScript strict), Tailwind + shadcn/ui, Supabase Free plan (Postgres, Auth, Realtime, Storage), Twilio, Vercel.

## Quick start

1. **Create a free Supabase project** at https://supabase.com (Free plan). Under _Project Settings -> API_ copy the Project URL, `anon` key and `service_role` key.
2. `cp .env.example .env.local` and paste the Supabase values. Set `APP_URL=http://localhost:3000`. Leave the Twilio values empty: the app runs in **mock mode**.
3. `npm install`
4. Apply migrations to your Supabase project: `npx supabase link --project-ref <ref>` then `npm run db:push`.
5. In Supabase _Authentication -> Providers -> Email_, turn **off** "Allow new users to sign up".
6. `npm run seed:admin -- --email you@example.com --password '...'` (added in Phase 1).
7. `npm run dev` and open http://localhost:3000.

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
