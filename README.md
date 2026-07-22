# Chief

**Your AI chief of staff for real work — not another inbox.**

Chief connects to the tools you already use, synthesizes what matters, and surfaces **outcomes and next actions**: Top Priorities, a grouped Daily Brief, Focus detail that explains *what’s going on* and *what to do*, and a grounded Ask Chief chat — without dumping raw email threads.

| Surface | URL |
|---------|-----|
| Web / PWA | [chief-nine-omega.vercel.app](https://chief-nine-omega.vercel.app) |
| API | Railway (`api` + `worker`) |
| Repo | Monorepo — Expo app at root, Nest API in `backend/` |

---

## Problem

Knowledge workers live across Gmail, Calendar, Tasks, Slack, GitHub, and dozens of other apps. Existing “AI briefs” often:

- Mirror the inbox (subject lines, snippets, provider chrome)
- Repeat the same item in multiple places
- Leave the user to invent the next step

That creates **noise**, not **command**. People don’t need another Gmail skin — they need a chief of staff who answers: *What should I do, and why?*

---

## Solution

Chief is a mobile-first chief-of-staff layer on top of a **Workspace Engine**:

1. **Connect** work accounts (Google first; Slack, GitHub, and Notion sync where configured).
2. **Sync** mail, calendar, tasks, and provider signals into a workspace-scoped store.
3. **Score & classify** for relevance (deadlines, billing, security, career, meetings…).
4. **Synthesize** Chief-of-Staff copy — action headlines, brief bullets, Focus narratives, and chat replies — instead of pasting raw bodies.
5. **Present** Home as Top Priorities + a grouped Daily Brief, with Focus detail and Ask Chief grounded in live context.

Design principle: **never expose raw provider data unless necessary.** Every screen should communicate work, priorities, and actions.

---

## Features

### Live today

- **Onboarding** — auth, connect apps, workspace prepare/scan, first brief
- **Provider sync** — Google (Gmail, Calendar, Tasks); Slack, GitHub, and Notion where connected
- **Home / Today’s Brief**
  - **Top Priorities** — action-oriented cards (open for detail)
  - **Focus Score** — day-readiness ring + level label
  - **Today’s Brief** — grouped sections (Needs Attention, Security, Finance, Career, Meetings, Projects, Updates)
  - **No Focus/Brief duplication** — Top Priority items are removed from Brief
  - **Brief tap-to-expand** — short Chief-written summaries (not raw body dump)
- **Focus detail** — context-aware section titles with synthesized narrative
- **Ask Chief** — chat grounded in synced workspace context (brief, calendar, mail, tasks, and more)
- **Today** — day plan / schedule as a first-class tab
- **Contextual actions** — Reply / Pay / Prepare / Review hand off to verified provider links; Ask Chief stays in-app
- **Profile** — connected apps, reconnect, disconnect, theme, logout (wipes local session/workspace cache)
- **Notifications & freshness** — in-app deadline/security alerts, push registration, Home “last synced”
- **Web / PWA** — installable progressive web app (manifest + offline shell)

### Next

- Deeper executable actions into Gmail, Calendar, and billing flows
- Stronger day-plan hardening and provider coverage
- Production hardening (observability, rate limits, store release)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Expo app (iOS / Android / Web · PWA)                       │
│  Expo Router · Zustand · MMKV · SecureStore · repositories  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS + session cookies
┌───────────────────────────▼─────────────────────────────────┐
│  NestJS API (Railway `api`)                                 │
│  Auth · Integrations OAuth · Briefing · Sync · Chief chat   │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
       ┌────────▼────────┐           ┌────────▼────────┐
       │ Postgres        │           │ Redis           │
       │ Prisma models   │           │ BullMQ queues   │
       └─────────────────┘           └────────┬────────┘
                                              │
                                     ┌────────▼────────┐
                                     │ Railway `worker`│
                                     │ Sync + cron jobs│
                                     └─────────────────┘
```

### Monorepo layout

```
chief/
  src/                 # Expo app
    app/               # Routes (tabs, onboarding, focus, deep links)
    features/          # brief, tasks, chief, analytics, profile, actions, onboarding
    components/ui/     # Design-system primitives
    theme/             # Tokens
    stores/            # Zustand
    services/          # API client, repos, sync, security
    config/            # App config + integrations registry
  backend/             # NestJS API + worker
    src/               # Auth, integrations, briefing, sync, reasoning, …
    prisma/            # Schema + migrations
  public/              # PWA manifest, icons, web shell
```

### Workspace Engine (brief path)

1. Sync persists email, calendar, tasks, and related provider rows
2. Briefing ranks candidates with a relevance scorer
3. Narrative synthesis builds headlines, brief bullets, and Focus about/action copy
4. Home brief is cached per workspace/day; stale presentation forces recompose
5. Client paints **cache-first**, then refreshes after sync

### Ask Chief path

1. Client posts to the Chief chat API with the question and recent turns
2. Context Engine builds a size-capped workspace snapshot (not a full mailbox dump)
3. Reasoning layer prompts the model with stable instructions + that structured payload
4. Reply streams back into the conversation thread

---

## Tech stack

| Layer | Stack |
|-------|--------|
| **App** | Expo 57, React Native, Expo Router, TypeScript, Zustand, TanStack Query, NativeWind, MMKV, SecureStore |
| **API** | NestJS, Prisma, Better Auth, BullMQ, Zod, Swagger, Pino |
| **Data** | PostgreSQL (Supabase), Redis (Upstash) |
| **Deploy** | Vercel (web / PWA), Railway (`api` + `worker` Docker) |
| **Integrations** | Google (primary); Slack, GitHub, Notion, Microsoft adapters available |

---

## Setup

### Prerequisites

- Node.js 20+ and npm
- Expo Go or simulators (optional for native)
- Postgres and Redis reachable from the API
- OAuth clients for the providers you want to connect
- Railway + Vercel accounts for production deploys (optional locally)

### Clone

```bash
git clone https://github.com/Clarke-ro/Chief.git
cd Chief
```

### Configure

Copy the example templates at the repo root and under `backend/`, then fill in local credentials for:

- App → API base URL and live brief mode
- API → database, Redis, auth/session secrets, encryption, CORS origins, and provider OAuth credentials
- Public API URL used for OAuth redirects

Use the same values in Railway / Vercel project settings for production.

### Install

```bash
# from repo root
npm install

cd backend
npm install
npx prisma generate
npx prisma migrate deploy   # or `prisma migrate dev` locally
```

Production API notes (Root Directory = `backend`, separate `worker` with worker role) live in `backend/RAILWAY.md`.

---

## Run

### App (Expo)

```bash
# repo root
npm start          # Expo dev server
npm run web        # Web / PWA locally
npm run ios        # iOS simulator
npm run android    # Android
```

### API (local)

```bash
cd backend
npm run start:dev
```

Health: `GET http://localhost:3000/health`  
Swagger (when enabled): `http://localhost:3000/docs`

### Worker (local)

```bash
cd backend
npm run start:worker:dev
```

The API can also run sync in-process so Home still fills when the worker is down; the worker owns scheduled cadence.

### Production deploys

- **Web / PWA:** push to `main` → Vercel (`npm run build:web` exports the SPA + service worker)
- **API:** from `backend/`: `railway up --service api`
- **Worker:** from `backend/`: `railway up --service worker`

---

## Test

### App

```bash
# repo root
npx tsc --noEmit -p tsconfig.json
npm run lint
npm run format:check
```

Manual smoke:

1. Sign up / sign in
2. Connect Google (and optional Slack / GitHub / Notion)
3. Wait for sync / pull to refresh Home
4. Confirm Top Priorities + Brief sections, expand Brief rows, open Focus detail
5. Ask Chief a question in a new chat
6. Log out and confirm local wipe

### API

```bash
cd backend
npx tsc --noEmit -p tsconfig.json
npm run lint
npm test
npm run test:e2e
```

### Verification matrix

| Check | Expect |
|-------|--------|
| `GET /health` | Healthy |
| Connect Google | Account appears; sync enqueues |
| Home brief | Focus + briefing with synthesized copy |
| Brief vs Focus | No duplicate IDs across both |
| Focus detail | Context titles + about/action bodies (not raw mail) |
| Home last synced | Greeting shows recent sync age after sync |
| Bell → Alerts | Deadline/security inbox; unread badge |
| Ask Chief | Grounded reply (not a canned offline script) |
| Worker briefing | Morning / generate jobs compose briefs |

---

## Roadmap

1. **Executable actions** — deeper handoffs into Gmail, Calendar, and billing flows
2. **Tasks & schedule** — continue hardening the live day plan
3. **Provider expansion** — harden Google; deepen Slack / GitHub / Notion where valuable
4. **Production hardening** — reliable migrations, observability, rate limits, E2E CI, App Store / Play + web launch

---

## License

Private / all rights reserved unless otherwise stated.
