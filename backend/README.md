# Chief API (NestJS)

Backend for the Chief AI chief-of-staff product.

## Phase status

- **Phase 1:** Foundation (config, Prisma, Redis, BullMQ, health, logging)
- **Phase 2:** Connection & Integration Platform (Better Auth session, workspaces, official OAuth)

## Stack

NestJS · TypeScript · Prisma · Supabase PostgreSQL · Better Auth · Redis · BullMQ · Swagger · Pino · Docker · Railway

## Deploy

Keep this API in the **same GitHub repo** as the Expo app (`backend/` folder). See `RAILWAY.md`.

Local `.env` uses `http://localhost:3000`. Production uses the stable Railway HTTPS domain (no ngrok).

| Surface | URL |
|---------|-----|
| Health | `GET /health` |
| Auth | `/api/auth/*` (Better Auth) |
| Me | `GET /v1/me` |
| Integrations | `/v1/integrations/*` |
| Swagger | `/docs` |

## Integrations

Official OAuth adapters (extend by implementing `ProviderAdapter` + registering in `ProviderRegistry`):

| Provider | Capabilities |
|----------|----------------|
| Google | Gmail, Calendar, Drive |
| Microsoft | Outlook, Calendar, OneDrive |
| Slack | Slack |
| GitHub | GitHub |
| Notion | Notion |

### API

| Method | Path | Notes |
|--------|------|-------|
| GET | `/v1/integrations` | Catalog + connections (`?workspaceId=`) |
| GET | `/v1/integrations/providers` | Provider definitions + scopes |
| POST | `/v1/integrations/:provider/connect` | `{ workspaceId }` → `{ authorizeUrl }` |
| GET | `/v1/integrations/oauth/:provider/callback` | Provider redirect (public) |
| GET | `/v1/integrations/:id/status` | Connection status |
| GET | `/v1/integrations/:id/health` | Live health check |
| POST | `/v1/integrations/:id/reconnect` | Re-auth for expired tokens |
| DELETE | `/v1/integrations/:id` | Disconnect + revoke |

Tokens are encrypted at rest (`ENCRYPTION_KEY`). Refresh is automatic via `AccessTokenService` (exported for sync later). **No data sync in this phase.**

### Adding a provider

1. Implement `ProviderAdapter` under `src/integrations/providers/`
2. Register it in `ProviderRegistry`
3. Add env credentials + `IntegrationProvider` enum value in Prisma

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run start:dev` | API watch mode |
| `npm run start:worker:dev` | Worker context |
| `npm run prisma:migrate` | Dev migrations |
| `npm run build` | Compile |
