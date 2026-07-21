# Chief

**Your AI chief of staff for real work — not another inbox.**

Chief connects to the tools you already use (starting with Google Workspace), synthesizes what matters, and surfaces **outcomes and next actions**: Top Priorities, a grouped Daily Brief, and Focus detail that explains *what’s going on* and *what to do* — without dumping raw email threads.

| Surface | URL |
|---------|-----|
| Web / PWA | [chief-nine-omega.vercel.app](https://chief-nine-omega.vercel.app) — installable progressive web app |
| API | Railway (`api` + `worker` services) |
| Repo | Monorepo — Expo app at root, Nest API in `backend/` |

---

## Problem

Knowledge workers live across Gmail, Calendar, Tasks, and dozens of other apps. Existing “AI briefs” often:

- Mirror the inbox (subject lines, snippets, provider chrome)
- Repeat the same item in multiple places
- Leave the user to invent the next step

That creates **noise**, not **command**. People don’t need another Gmail skin — they need a chief of staff who answers: *What should I do, and why?*

---

## Solution

Chief is a mobile-first chief-of-staff layer on top of a **Workspace Engine**:

1. **Connect** work accounts (Google first; adapters exist for more providers).
2. **Sync** mail, calendar, and tasks into a workspace-scoped store.
3. **Score & classify** signals for relevance (deadlines, billing, security, career, meetings…).
4. **Synthesize** Chief-of-Staff copy — action headlines, brief bullet lists, and Focus narratives — instead of pasting email bodies.
5. **Present** Home as Top Priorities + a grouped Daily Brief, with Focus detail that explains context and next steps.

Design principle: **never expose raw provider data unless necessary.** Every screen should communicate work, priorities, and actions.

---

## Features

### Live today

- **Onboarding** — auth, connect apps, workspace prepare/scan, first brief
- **Google sync** — Gmail, Calendar, Google Tasks (incremental + scheduled worker jobs)
- **Home / Today’s Brief**
  - **Top Priorities** — action-oriented cards (ellipsis-truncated; open for detail)
  - **Focus Score** — self-explanatory day-readiness ring + level label
  - **Today’s Brief** — grouped sections (Needs Attention, Security, Finance, Career, Meetings, Projects, Updates)
  - **No Focus/Brief duplication** — items in Top Priority are removed from Brief
  - **Brief tap-to-expand** — short Chief-written bullet summaries (not raw body dump)
- **Focus detail** — context-aware section titles (“Failed payment”, “What to do”, …) with synthesized narrative
- **Contextual actions** — Reply / Pay / Prepare / Review open verified Gmail or Calendar links (confirm → handoff); Ask Chief stays in-app
- **Profile** — connected apps, disconnect, logout (wipes local session/workspace cache)
- **Secure session** — Better Auth + SecureStore; MMKV for non-secret workspace cache
- **Notifications & freshness** — in-app deadline/security alerts, Expo push token registration, Home “last synced” label, briefing + notification BullMQ workers

### In progress / next

- Actions that open or perform real provider handoffs
- Chief chat grounded in live workspace context
- Production hardening (migrations, monitoring, store release)

Today’s schedule (Tasks tab) is first-class — not deferred.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Expo app (iOS / Android / Web)                             │
│  Expo Router · Zustand · MMKV · SecureStore · repositories  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS + session cookies
┌───────────────────────────▼─────────────────────────────────┐
│  NestJS API (Railway `api`)                                 │
│  Better Auth · Integrations OAuth · Briefing · Sync enqueue │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
       ┌────────▼────────┐           ┌────────▼────────┐
       │ Supabase Postgres│           │ Upstash Redis   │
       │ Prisma models    │           │ BullMQ queues   │
       └─────────────────┘           └────────┬────────┘
                                              │
                                     ┌────────▼────────┐
                                     │ Railway `worker`│
                                     │ Sync cron + jobs│
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
    config/            # Env + integrations registry
    mock/              # Seeds (repos only; not after live onboarding)
  backend/             # NestJS API + worker
    src/auth|integrations|briefing|sync|…
    prisma/            # Schema + migrations
  AGENTS.md            # Agent conventions for this repo
```

### Workspace Engine (brief path)

1. Sync persists `Email`, `CalendarEvent`, `Task`, …
2. `BriefingService` ranks candidates (relevance scorer)
3. `synthesizeFocusNarrative` builds headlines, brief bullets, and Focus about/action copy
4. Home brief cached per workspace/day; stale or old presentation forces recompose
5. Client paints **cache-first**, then refresh after sync

---

## Tech stack

| Layer | Stack |
|-------|--------|
| **App** | Expo 57, React Native, Expo Router, TypeScript, Zustand, TanStack Query, NativeWind, MMKV, SecureStore, Better Auth Expo client |
| **API** | NestJS 11, Prisma, Better Auth, BullMQ, Zod, Swagger, Pino, Helmet |
| **Data** | Supabase PostgreSQL, Upstash Redis |
| **Deploy** | Vercel (web), Railway (`api` + `worker` Docker), monorepo |
| **Integrations** | Google (live); Microsoft, Slack, GitHub, Notion adapters scaffolded |

---

## Setup instructions

### Prerequisites

- Node.js 20+
- npm
- Expo Go or simulators (optional for native)
- Supabase project (Postgres)
- Upstash Redis (`rediss://` TCP URL for BullMQ)
- Google Cloud OAuth client (Gmail / Calendar / Tasks APIs enabled)
- Railway + Vercel accounts for deploy (optional locally)

### 1. Clone

```bash
git clone https://github.com/Clarke-ro/Chief.git
cd Chief
```

### 2. App env

```bash
cp .env.example .env
```

Set at least:

- `EXPO_PUBLIC_API_BASE_URL` — API origin (no trailing slash)
- `EXPO_PUBLIC_LIVE_HOME_BRIEF=true` — live Home brief when API is configured

### 3. Backend env

```bash
cd backend
cp .env.example .env
```

Fill:

- `DATABASE_URL` — Supabase Postgres
- `REDIS_URL` — Upstash Redis TCP URL
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ENCRYPTION_KEY`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `CORS_ORIGINS` — include local Expo web + production web origin
- OAuth redirect base matching your API public URL

### 4. Install

```bash
# from repo root
npm install

cd backend
npm install
npx prisma generate
npx prisma migrate deploy   # or prisma migrate dev locally
```

See `backend/RAILWAY.md` for production deploy details (Root Directory = `backend`, separate `worker` with `APP_ROLE=worker`).

---

## How to run

### Frontend (Expo)

```bash
# repo root
npm start          # Expo dev server
npm run web        # Web
npm run ios        # iOS simulator
npm run android    # Android
```

### Backend API (local)

```bash
cd backend
npm run start:dev
```

Health: `GET http://localhost:3000/health`  
Swagger (if enabled): `http://localhost:3000/docs`

### Worker (local)

```bash
cd backend
npm run start:worker:dev
```

API can also run sync in-process so Home still fills when the worker is down; the worker owns scheduled cadence.

### Production-style deploys

- **Web / PWA:** push to `main` → Vercel (`npm run build:web` exports the SPA + Workbox service worker)  
- **API:** from monorepo root or as configured: `railway up --service api` (Root Directory `backend`)  
- **Worker:** `cd backend && railway up --service worker`

---

## How to test

### App

```bash
# repo root
npx tsc --noEmit -p tsconfig.json   # frontend (backend excluded)
npm run lint
npm run format:check
```

Manual smoke:

1. Sign up / sign in  
2. Connect Google  
3. Wait for sync / pull to refresh Home  
4. Confirm Top Priorities + Brief sections, expand Brief rows, open Focus detail  
5. Logout and confirm local wipe  

### API

```bash
cd backend
npx tsc --noEmit -p tsconfig.json
npm run lint
npm test                 # Jest unit
npm run test:e2e         # e2e (requires env)
```

### Suggested verification matrix

| Check | Expect |
|-------|--------|
| `GET /health` | Healthy |
| Connect Google | Account appears; sync enqueues |
| `GET /v1/workspace/brief` | Focus + briefing with synthesized copy |
| Brief vs Focus | No duplicate IDs across both |
| Focus detail | Context titles + about/action bodies (not raw mail) |
| Home last synced | Greeting shows “Synced Xm ago” after sync |
| Bell → Alerts | Deadline/security inbox; unread badge |
| Worker briefing.morning | Composes briefs (not no-op logs) |

---

## How Codex was used

[OpenAI Codex](https://openai.com/codex/) (and Codex-class agent workflows in Cursor) drove **implementation velocity** across the monorepo:

- Scaffolding and iterating Nest modules (auth, integrations, sync, briefing)
- Wiring Expo Router screens, stores, and repositories to the live API
- Railway / Vercel deploy loops, worker role fixes, and Prisma/migration edge cases
- Refactors that kept architecture stable while upgrading presentation (dedupe, expand, narrative synthesis)
- Repo hygiene: targeted diffs, typechecks, and commit/deploy when asked

Codex was used as a **coding agent**: read the codebase, apply surgical changes, run shell checks, and ship — not as a substitute for product judgment.

---

## How GPT-5.6 was used

**GPT-5.6** was used for **product reasoning and language design**, including:

- Framing Chief as a chief of staff vs. an email client (outcomes over inbox mirroring)
- Designing Focus / Brief copy patterns (imperative headlines, section grouping, contextual CTAs)
- Turning chief-of-staff briefing patterns into concrete UX rules for this app
- Spec’ing the Workspace Engine narrative layer (`synthesizeFocusNarrative`: about / action / brief bullets)
- Planning post–Build Week phases (actions, live chat, tasks, hardening) without redesigning the whole product

Where Codex executed changes, GPT-5.6 shaped **what “good” looks like** in copy, information architecture, and roadmap.

---

## Future roadmap

1. **Executable actions** — Reply / Prepare / Pay / Open deep-link or perform real handoffs into Gmail, Calendar, and billing flows  
2. **Live Chief chat** — Ask Chief grounded in synced workspace + brief context (reasoning / prompt services)  
3. **Tasks & schedule** — Live day plan on Today (continue hardening off mocks; not deferred)  
4. **Provider expansion** — Harden Google; ship Slack / GitHub / Notion sync where valuable  
5. ~~**Notifications & freshness**~~ — In-app + push alerts for deadlines/security; Home last-synced; briefing/notification workers live  
6. **Production hardening** — Reliable migrations, observability, rate limits, E2E CI, strip mock fallbacks in prod builds, App Store / Play + web launch  

---

## License

Private / unlicensed — all rights reserved unless otherwise stated.
