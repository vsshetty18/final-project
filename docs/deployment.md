# Deployment Guide

This project is split into two independently deployable pieces
(`backend/` and `frontend/`) plus a managed PostgreSQL database, so any
combination of free/low-cost hosting works for a student project budget.

## 1. Database (PostgreSQL)

Any managed Postgres works. Popular free-tier options:
- **Supabase** — free Postgres, easy connection string
- **Neon** — serverless Postgres, generous free tier
- **Railway** — Postgres + app hosting in one place

Steps:
1. Create a new Postgres instance.
2. Copy its connection string into `DATABASE_URL` (format:
   `postgresql://user:password@host:port/dbname?schema=public`).
3. From your local machine (with `backend/.env` pointed at the remote DB),
   run:
   ```bash
   npm run prisma:migrate   # first time / whenever schema changes
   npm run prisma:seed       # optional demo data
   ```

## 2. Backend (Express API)

Any Node host works. Example with **Render**:
1. Create a new Web Service, connect your GitHub repo.
2. Root directory: `backend`
3. Build command: `npm install && npx prisma generate --schema=../prisma/schema.prisma`
4. Start command: `node src/server.js`
5. Add all variables from `backend/.env.example` in the platform's
   environment settings — at minimum `DATABASE_URL`, `JWT_SECRET`,
   `CLIENT_URL` (set to your deployed frontend's URL once you have it).
6. On each deploy, run `npx prisma migrate deploy --schema=../prisma/schema.prisma`
   as a release/build step so schema changes apply automatically.

Alternative hosts: Railway, Fly.io, a plain VPS with PM2/systemd.

### Health check
Point your platform's health check at `GET /api/health` — it returns `200`
with a JSON status payload and requires no auth.

## 3. Frontend (React + Vite)

Any static host works. Example with **Vercel** or **Netlify**:
1. Root directory: `frontend`
2. Build command: `npm run build`
3. Output directory: `dist`
4. Environment variable: `VITE_API_BASE_URL` = your deployed backend's URL
   + `/api` (e.g. `https://your-backend.onrender.com/api`)

Remember: Vite only exposes env vars prefixed `VITE_` to the browser bundle,
and they're baked in at **build time** — changing `VITE_API_BASE_URL` after
deploy requires a rebuild, not just a restart.

## 4. CORS

The backend's CORS config (`app.js`) allows only `CLIENT_URL` by default.
Make sure `CLIENT_URL` in the backend's environment matches your deployed
frontend's exact origin (including `https://` and no trailing slash), or
API requests from the browser will be blocked.

## 5. Notification channel in production

By default `NOTIFICATION_MODE=console`, which logs alerts to the backend's
server logs — fine for a demo, but you'll want to view your host's log
stream during a live demo to show notifications firing. To use real email,
set `NOTIFICATION_MODE=email` and provide `SMTP_HOST`, `SMTP_PORT`,
`SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL` (e.g. via Gmail SMTP with an
app password, or a transactional email provider like SendGrid/Mailgun's SMTP
relay).

## 6. Environment variable checklist before going live

- [ ] `DATABASE_URL` points at your production database
- [ ] `JWT_SECRET` is a long, random, unique value (not the dev default)
- [ ] `NODE_ENV=production`
- [ ] `CLIENT_URL` matches the deployed frontend's exact origin
- [ ] `VITE_API_BASE_URL` (frontend) matches the deployed backend's `/api` URL
- [ ] Run `npm run prisma:seed` once against production if you want the demo
      admin account and sample stations/hospitals available

## 7. Rolling back

Since migrations are tracked in `prisma/migrations/`, rolling back a bad
schema change is done by reverting the migration folder in git and running
`npx prisma migrate resolve` per Prisma's standard rollback workflow — see
the [Prisma migrate docs](https://www.prisma.io/docs/orm/prisma-migrate) for
specifics, as exact rollback steps depend on how far the bad migration
already propagated.
