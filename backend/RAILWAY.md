# Chief API — Railway deploy notes (monorepo)

## Repo strategy

Keep **one repo** (`Clarke-ro/Chief`) with:
- Expo app at repo root
- Nest API in `/backend`

Railway service **Root Directory** = `backend`. Do not split repos unless the teams/deploy pipelines diverge later.

## Railway setup

1. New Project → Deploy from GitHub → `Clarke-ro/Chief`
2. Service settings:
   - Root Directory: `backend`
   - Builder: Dockerfile (`backend/Dockerfile`)
3. Add plugins (or variables):
   - **Postgres** → set `DATABASE_URL` to your **Supabase** connection string
   - **Redis** → set `REDIS_URL` to your **Upstash** Redis URL (`rediss://…`)
     - BullMQ needs the **TCP Redis URL**, not Upstash REST
4. Set variables (see checklist below)
5. Generate domain: Settings → Networking → Public Networking
6. After first deploy, set OAuth redirect URIs once to:
   `https://<railway-domain>/v1/integrations/oauth/<provider>/callback`
7. Run a **worker** process (same image, `npm run start:worker:prod`) so BullMQ
   processors + scheduled jobs are active.

## Required variables

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Supabase Postgres (pooler OK for API; direct for migrate if needed) |
| `REDIS_URL` | Upstash Redis TCP URL (`rediss://` preferred) |
| `BETTER_AUTH_SECRET` | 32+ random chars |
| `ENCRYPTION_KEY` | 32+ random chars |
| `BETTER_AUTH_URL` | Optional if `RAILWAY_PUBLIC_DOMAIN` is present |
| `CORS_ORIGINS` | Expo / web origins — include `chief://` for the mobile app |
| Provider `*_CLIENT_ID` / `*_CLIENT_SECRET` | As needed (Microsoft optional) |

`RAILWAY_PUBLIC_DOMAIN` is injected by Railway when a public domain exists.
