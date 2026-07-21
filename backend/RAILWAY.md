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
   - **Do not** use Railway Postgres/Redis plugins for Chief — use **Supabase** + **Upstash**
   - Set `DATABASE_URL` to your **Supabase** connection string (session pooler is fine for the API)
   - Set `REDIS_URL` to your **Upstash** Redis URL (`rediss://…`)
     - BullMQ needs the **TCP Redis URL**, not Upstash REST
4. Set variables (see checklist below)
5. Generate domain: Settings → Networking → Public Networking
6. After first deploy, set OAuth redirect URIs once to:
   `https://<railway-domain>/v1/integrations/oauth/<provider>/callback`
7. Run a **worker** service (same Dockerfile, `APP_ROLE=worker`) so BullMQ
   processors + scheduled jobs are active.
   - Create: `railway add --service worker`
   - Copy API env vars onto `worker`, then set `APP_ROLE=worker`
   - **Root Directory must be `backend`** (same as API). If left at repo root,
     Railway builds the Expo web app with Caddy and sync never runs.
   - **GitHub / dashboard deploys:** Root Directory = `backend`, Dockerfile =
     `Dockerfile` (picked up via `backend/railway.toml`).
   - **CLI deploys (`railway up`):** run from **`backend/`**, not the monorepo
     root — `railway up` uploads the current directory, so a root upload builds
     Expo/Caddy even when Root Directory is set to `backend`:
     `cd backend && railway up --service worker` (same for `api`)
   - Worker listens on `PORT` only for `/health/live` (same healthcheck as API)
   - API alone runs `prisma migrate deploy` on boot; worker skips migrate
   - Manual / Home sync also runs **in-process on the API** so brief data can
     fill even if the worker service is misconfigured

## Required variables

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Supabase Postgres (pooler OK for API; direct for migrate if needed) |
| `REDIS_URL` | Upstash Redis TCP URL (`rediss://` preferred) |
| `APP_ROLE` | `api` (default) or `worker` — set on the worker service only |
| `BETTER_AUTH_SECRET` | 32+ random chars |
| `ENCRYPTION_KEY` | 32+ random chars |
| `BETTER_AUTH_URL` | Optional if `RAILWAY_PUBLIC_DOMAIN` is present |
| `CORS_ORIGINS` | Expo / web origins — include `chief://` for the mobile app |
| Provider `*_CLIENT_ID` / `*_CLIENT_SECRET` | As needed (Microsoft optional) |

## Google OAuth (Gmail / Calendar / Tasks / Drive)

Redirect URI to register on the Google Cloud OAuth client:

`https://<railway-domain>/v1/integrations/oauth/google/callback`

(Use the same host as `OAUTH_REDIRECT_BASE_URL` / `BETTER_AUTH_URL`.)

### Allow any Google account (not only test users)

While the OAuth consent screen is in **Testing**, only emails listed under **Test users** can connect. Anyone else sees Google’s “app has not completed Google verification” / access blocked screen.

To open connect to any Google account:

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **OAuth consent screen**
2. Set **User type** to **External**
3. Fill App name, support email, developer contact
4. Add scopes Chief requests (see `google.adapter.ts`): Gmail modify, Calendar, Drive readonly, Tasks, plus `openid` / `email` / `profile`
5. Enable APIs: Gmail, Google Calendar, Google Drive, Google Tasks
6. Under **Publishing status**, click **Publish app** (moves from Testing → In production)
7. Because Gmail / Drive / Calendar scopes are **sensitive/restricted**, Google will require a **verification** submission (privacy policy URL, demo video, justification) before unrestricted users can grant those scopes. Until verification completes, keep adding people as **Test users**, or use a Workspace internal app if the project is Internal-only.

Short-term (dev / beta): stay in Testing and add every tester email under **Audience → Test users**.

### Google Tasks

Home task sync uses the Google Tasks API (`https://www.googleapis.com/auth/tasks`).

1. In Google Cloud Console → APIs & Services → enable **Google Tasks API**
2. Existing connected Google accounts must **reconnect** (new scope) before tasks appear
3. After reconnect, Home pull-to-refresh runs email + calendar + tasks inline

`RAILWAY_PUBLIC_DOMAIN` is injected by Railway when a public domain exists.
