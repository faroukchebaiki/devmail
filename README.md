# Devmail

Minimal full-stack personal email dashboard and outreach tool built with:

- `Next.js` App Router
- `Resend` for outbound email and inbound reply handling
- `Neon` Postgres for storage
- `Drizzle ORM` for schema and queries
- Vercel-style serverless route handlers under `src/app/api`

## What it does

- Send emails from a simple compose panel
- Receive inbound replies through a Resend webhook
- Store sent and received emails in Postgres
- Display stored emails in a lightweight dashboard UI

The structure is intentionally small, with room to add campaigns, threading, and automation later.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required:

- `DATABASE_URL`
- `RESEND_API_KEY`
- `MAIL_FROM`

Recommended:

- `RESEND_WEBHOOK_SECRET`
- `REPLY_TO_EMAIL`
- `RESEND_INBOUND_ADDRESS`

## Local development

Install dependencies and run the app:

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Database setup

Push the Drizzle schema to Neon:

```bash
pnpm db:push
```

The schema lives in [src/lib/db/schema.ts](/home/farouk/Documents/devmail/src/lib/db/schema.ts) and currently creates:

- `emails`
- `webhook_events`

The schema already includes nullable fields such as `thread_key`, `campaign_id`, and `metadata` so the app can grow without a major rewrite.

## Resend setup

### Sending

1. Create a Resend API key.
2. Verify your sending domain in Resend.
3. Set `MAIL_FROM` to a verified sender, for example `Devmail <hello@yourdomain.com>`.

### Receiving replies

1. Configure a receiving address in Resend.
2. Point it to either:
   - a Resend-managed `*.resend.app` inbound domain, or
   - your own domain with the required `MX` record
3. Set your webhook endpoint to:

```text
https://your-app.vercel.app/api/webhooks/resend
```

4. Subscribe the webhook to at least:
   - `email.received`
   - `email.sent`
   - `email.delivered`
   - `email.bounced`

5. Copy the webhook signing secret into `RESEND_WEBHOOK_SECRET`.

When Resend sends an `email.received` event, the app verifies the webhook, fetches the full inbound email body from Resend, and stores it in Neon.

## API routes

- `GET /api/health`
- `GET /api/emails`
- `POST /api/emails/send`
- `POST /api/webhooks/resend`

## Project structure

```text
src/
  app/
    api/
      emails/
      health/
      webhooks/
    dashboard/
  components/
    email-dashboard.tsx
  lib/
    db/
      client.ts
      schema.ts
    env.ts
    mail-store.ts
    resend.ts
```

## Notes for future features

- `thread_key` and `in_reply_to` leave room for conversation threading.
- `campaign_id` leaves room for outbound campaign grouping.
- `metadata` can hold automation state or provider-specific details without schema churn.
