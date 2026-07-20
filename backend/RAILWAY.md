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
   - **Redis** → provides `REDIS_URL` (or set manually)
   - **Postgres** → provides `DATABASE_URL` (or use Supabase `DATABASE_URL`)
4. Set variables (see checklist below)
5. Generate domain: Settings → Networking → Public Networking
6. After first deploy, set OAuth redirect URIs once to:
   `https://<railway-domain>/v1/integrations/oauth/<provider>/callback`

## Required variables

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Railway Postgres or Supabase |
| `REDIS_URL` | Railway Redis |
| `BETTER_AUTH_SECRET` | 32+ random chars |
| `ENCRYPTION_KEY` | 32+ random chars |
| `BETTER_AUTH_URL` | Optional if `RAILWAY_PUBLIC_DOMAIN` is present |
| `CORS_ORIGINS` | Expo / web origins |
| Provider `*_CLIENT_ID` / `*_CLIENT_SECRET` | As needed (Microsoft optional) |

`RAILWAY_PUBLIC_DOMAIN` is injected by Railway when a public domain exists.
