# Telnyx setup

The app sends and receives SMS/MMS through Telnyx. Without Telnyx keys it runs in **mock mode**:
messages you "send" are saved but nothing leaves the machine.

## 1. Add your values to `.env.local`

```
TELNYX_API_KEY=KEY...                 # Mission Control -> API Keys
TELNYX_PUBLIC_KEY=...                 # Mission Control -> Keys & Credentials -> Public Key
TELNYX_PHONE_NUMBER=+15551234567      # your Telnyx number, E.164
TELNYX_MESSAGING_PROFILE_ID=...       # Messaging -> Messaging Profiles -> your profile ID
```

Restart `npm run dev` after editing. Settings -> Telnyx messaging (admins) shows the current status.

## 2. Telnyx portal

1. Create a **Messaging Profile** and assign your phone number to it.
2. In the profile's inbound settings set the **Webhook URL** to
   `https://<your-domain>/api/webhooks/telnyx` (the exact URL is shown in Settings).
   Use the same URL for the failover URL if you want, status events use it too.
3. US numbers need **10DLC** brand + campaign registration before messages are delivered.

## 3. Local testing

Telnyx cannot reach `localhost`. Expose the dev server with a tunnel and use that https URL as the
webhook URL (and set `APP_URL` to it):

```
ngrok http 3000      # or: cloudflared tunnel --url http://localhost:3000
```

## 4. Database

Apply the migration: `npm run db:push` (remote) or `npx supabase migration up` (local).
It renames the org Twilio columns to `telnyx_*` and adds `contacts`, `conversations`, `messages`.

## How it works

- `app/api/webhooks/telnyx/route.ts` verifies the Ed25519 signature (`telnyx-signature-ed25519` +
  `telnyx-timestamp`, 5 minute window), then handles `message.received` and delivery-status events.
  It returns 500 on failure so Telnyx retries; inbound storage is idempotent per Telnyx message id.
- Inbound messages find their org by `orgs.telnyx_phone_number`, falling back to `TELNYX_PHONE_NUMBER`
  for a single-org setup.
- Team members with push notifications enabled get a notification for each inbound message.
- The webhook path is public in `lib/auth/routing.ts`; the signature is its only authentication.
  Outside production, a missing `TELNYX_PUBLIC_KEY` lets you `curl` the endpoint unsigned. In production
  it refuses (503).
