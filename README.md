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
- Uses in-app OpenRouter STT, Qalam LLM, and TTS for production turn-based voice interviews.
- Keeps Pipecat/Daily voice assets as legacy experimental infrastructure.

## Tech stack

- React 19
- TypeScript
- Vite
- Express
- Supabase
- OpenRouter HTTP models for production chat/evaluation, STT, and TTS
- Google Gemini HTTP models as fallback chat/evaluation support
- Pipecat + Daily WebRTC for legacy experimental voice
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
- An OpenRouter API key for production Qalam voice and LLM

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

# Legacy/experimental Pipecat path.
PIPECAT_SERVICE_URL=https://7pmmmiwq7m.ap-south-1.awsapprunner.com
PIPECAT_SERVICE_TOKEN=

OPENROUTER_API_KEY=
OPENROUTER_LLM_MODEL=openrouter/auto,deepseek/deepseek-chat
OPENROUTER_TTS_MODEL=fish-audio/s2.1-pro
OPENROUTER_STT_MODEL=openai/gpt-4o-mini-transcribe
CAREERVOICE_SERVICE_TOKEN=

APP_URL=
PORT=3000
```

Important:

- Do not commit `.env`.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, and `PIPECAT_SERVICE_TOKEN` server-side only.
- The browser calls the same-origin Express proxy. It should never receive provider API keys or service tokens.

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
| `PIPECAT_SERVICE_URL` | Optional legacy voice | Deployed CareerVoice Pipecat service URL for experimental sessions |
| `PIPECAT_SERVICE_TOKEN` | Optional legacy voice | Server-side token for the Pipecat service; `CAREERVOICE_SERVICE_TOKEN` is supported as a deprecated alias |
| `OPENROUTER_API_KEY` | Yes for production voice and OpenRouter LLM | Server-side OpenRouter API key used by Qalam chat, STT, and TTS |
| `OPENROUTER_LLM_MODEL` | Optional | OpenRouter LLM model list; defaults to `openrouter/auto,deepseek/deepseek-chat` |
| `OPENROUTER_TTS_MODEL` | Optional | OpenRouter TTS model; defaults to `fish-audio/s2.1-pro` |
| `OPENROUTER_STT_MODEL` | Optional | OpenRouter STT model; defaults to `openai/gpt-4o-mini-transcribe` |
| `APP_URL` | Optional | Public app URL for callbacks/self links |
| `PORT` | Optional | Local/server port; use `3000` for local browser testing |

## Live voice integration

The production interview uses the in-app OpenRouter turn-based voice engine:

1. `useVoiceInteraction` records candidate speech with browser `MediaRecorder`.
2. The browser posts base64 audio to `POST /api/voice/transcribe`.
3. The server calls OpenRouter STT and returns the transcript.
4. The transcript is submitted to the existing `POST /api/ai/chat` / `POST /api/qalam/chat` flow.
5. The server uses OpenRouter first for Qalam reasoning, with Gemini fallback when configured.
6. Qalam responses are sent to `POST /api/voice/speak`.
7. The server calls OpenRouter TTS and returns base64 audio for browser playback.
8. Extracted skill evidence is persisted through `/api/audit/evidence/signal`.

Browser speech recognition and `SpeechSynthesis` remain fallback paths. Daily, LiveKit, and Pipecat are not required for production browser voice interviews.

Quick local check:

```bash
curl http://127.0.0.1:3000/api/health
```

Expected voice field:

```json
{
  "voiceEngine": "openrouter-turn-based"
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

- `POST /api/voice/transcribe`
- `POST /api/voice/speak`
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

