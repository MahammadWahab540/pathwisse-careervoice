# Pathwisse CareerVoice

Pathwisse CareerVoice is a student-facing career discovery and readiness audit application. It helps a student move from branch and interest context to career direction, evidence-backed readiness diagnosis, skill gaps, recommendations, and a roadmap handoff.

The current product journey is:

`UNDERSTAND → GUIDE → COMPARE → CHOOSE → AUDIT → DIAGNOSE → REPORT`

The broader Pathwisse learning journey is:

`PRIORITIZE → LEARN → PRACTICE → BUILD → PROVE → IMPROVE`

## What this app does

- Reads student profile context from Supabase.
- Loads colleges, streams, careers, role skills, competency benchmarks, pricing, reports, and roadmap handoff data from the backend/Supabase layer.
- Runs branch-aware conversational career discovery.
- Supports Mechanical/core-engineering discovery before asking whether the student wants to explore IT/software paths.
- Allows branch switching without blocking software careers.
- Generates 3–5 weighted career recommendations.
- Runs an adaptive 1-on-1 career audit.
- Persists discovery answers, skill signals, audit evidence, final reports, and recommendations.
- Uses the deployed Pipecat voice service for live voice sessions when configured.
- Falls back to browser voice only when the live voice service is not configured or unavailable.

## Tech stack

- React 19
- TypeScript
- Vite
- Express
- Supabase
- Google Gemini HTTP models for chat/evaluation
- Pipecat + Daily WebRTC for live voice
- Framer Motion / Motion for interaction states
- Tailwind CSS v4

## Repository structure

```txt
src/
  api/                 Frontend API clients
  ai/                  Qalam tool-call contracts and helpers
  components/          Audit, voice, dashboard, adaptive UI, and shared UI
  domain/              Deterministic career/audit business logic
  hooks/               Voice, career roles, and interaction hooks
  lib/                 Supabase and seed data helpers
  server/              Server config, Gemini, audit persistence/finalization
  types/               Shared DTOs and domain types
server.ts              Express server + Vite middleware + API routes
tests/                 Node test suite
PRODUCT.md            Product truth and UX principles
services/              Pipecat voice agent service assets
supabase/              Supabase-related project assets
```

## Prerequisites

- Node.js 22+ recommended
- npm
- A Supabase project with the required CareerVoice tables
- A Gemini API key for Qalam chat/evaluation flows
- A Pipecat CareerVoice service token for live voice

## Local setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Fill in `.env`:

```env
GEMINI_API_KEY=
GEMINI_CHAT_MODEL=gemini-3.6-flash
GEMINI_EVALUATION_MODEL=gemini-3.6-flash

ENABLE_GEMINI_LIVE=false
GEMINI_LIVE_MODEL=gemini-3.1-flash-live-preview

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

PIPECAT_SERVICE_URL=https://7pmmmiwq7m.ap-south-1.awsapprunner.com
CAREERVOICE_SERVICE_TOKEN=

APP_URL=
PORT=3000
```

Important:

- Do not commit `.env`.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, and `CAREERVOICE_SERVICE_TOKEN` server-side only.
- The browser calls the same-origin Express proxy. It should never receive the CareerVoice service token.

Start the local server:

```bash
npm run dev
```

Open:

```txt
http://127.0.0.1:3000
```

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes for full audit intelligence | Enables Qalam chat and final audit evaluation |
| `GEMINI_CHAT_MODEL` | Optional | Chat model; defaults to `gemini-3.6-flash` |
| `GEMINI_EVALUATION_MODEL` | Optional | Evaluation model; defaults to `gemini-3.6-flash` |
| `ENABLE_GEMINI_LIVE` | Optional | Experimental Gemini Live path; production audit path is HTTP |
| `GEMINI_LIVE_MODEL` | Optional | Gemini Live model name when enabled |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side Supabase service key |
| `PIPECAT_SERVICE_URL` | Yes for live voice | Deployed CareerVoice Pipecat service URL |
| `CAREERVOICE_SERVICE_TOKEN` | Yes for live voice | Server-side token for the Pipecat service |
| `APP_URL` | Optional | Public app URL for callbacks/self links |
| `PORT` | Optional | Local/server port; use `3000` for local browser testing |

## Live voice integration

The app uses `usePipecatVoice` for live audit voice sessions when `/api/health` reports:

```json
{
  "pipecatConfigured": true,
  "voiceEngine": "pipecat-daily-webrtc"
}
```

Flow:

1. Frontend requests `/api/voice/session`.
2. Express forwards the request to the deployed Pipecat service.
3. Express attaches `Authorization: Bearer CAREERVOICE_SERVICE_TOKEN`.
4. Pipecat returns a Daily room URL and room token.
5. Frontend joins the Daily room using `@daily-co/daily-js`.

Quick local check:

```bash
curl http://127.0.0.1:3000/api/health
```

Expected live-voice fields:

```json
{
  "pipecatConfigured": true,
  "voiceEngine": "pipecat-daily-webrtc"
}
```

## Main API routes

Health and setup:

- `GET /api/health`
- `GET /api/supabase/status`

Profile and authentication:

- `POST /api/auth/otp/request`
- `POST /api/auth/otp/verify`
- `POST /api/profile/sync`

Catalog and discovery:

- `GET /api/colleges`
- `GET /api/streams`
- `GET /api/roles`
- `GET /api/roles/:roleId`
- `GET /api/career-discovery`
- `POST /api/career-discovery/answer`
- `POST /api/roles/recommendations`
- `POST /api/career/guidance`

Audit:

- `POST /api/audit/session`
- `GET /api/audit/:auditId/session`
- `POST /api/qalam/chat`
- `POST /api/audit/evidence/signal`
- `POST /api/audit/:auditId/evidence`
- `POST /api/audit/:auditId/finalize`
- `GET /api/audit/:auditId/report`
- `GET /api/audit/:auditId/roadmap-handoff`

Voice:

- `POST /api/voice/session`

Commercial and analytics:

- `GET /api/pricing`
- `POST /api/analytics/track`

## Validation

Run TypeScript validation:

```bash
npm run lint
```

Run tests:

```bash
npm test
```

Build production assets and server bundle:

```bash
npm run build
```

Start the production bundle:

```bash
npm start
```

## Test coverage

The current test suite covers:

- Readiness status boundaries
- Deterministic skill-gap math
- Skill signal parsing
- Role-fit ranking behavior
- Mechanical discovery core-first behavior
- Mechanical-to-IT switch behavior
- Undecided student next-question behavior
- Insufficient-data recommendation behavior
- Gemini server config expectations
- API client error handling
- Universal recommendations
- Evidence coverage mapping
- Roadmap handoff mapping status preservation

## UX and product principles

The redesigned interface follows the Pathwisse product principle:

> Pathwisse understands where I am → helps me discover where I should go → proves what I know → shows what I'm missing → gives me the next action.

Student-facing UX rules:

- Show outcomes, not infrastructure.
- Do not expose provider names, internal IDs, database wording, raw backend errors, or schema terminology to students.
- Keep the student’s current state, next action, and value clear on every screen.
- Use the Pathwisse brand system consistently.
- Keep mobile flows first-class.

See `PRODUCT.md` for the product truth and UX guardrails.

## Git and security notes

- `.env` is ignored and must stay local.
- Do not commit generated local artifacts such as `.playwright-mcp/`, `output/`, or local Codex skill caches.
- If a token is accidentally committed, rotate it immediately before pushing again.

