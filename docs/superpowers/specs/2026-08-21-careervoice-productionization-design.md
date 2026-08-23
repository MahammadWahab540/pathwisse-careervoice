# CareerVoice Productionization Design

## Goal

Turn CareerVoice into an evidence-driven audit system where every reported score and recommendation is traceable to persisted student evidence and a role benchmark.

## Canonical diagnostic chain

Student Answer → Evidence → Skill Signal → Demonstrated Score → Expected Benchmark → Skill Gap → Priority → Recommended Action → Pathwisse Skill / Stage

## Architecture decisions

- Gemini HTTP is the canonical intelligence layer for adaptive probing, evidence classification, and explanation.
- Browser Speech remains the temporary STT/TTS transport.
- Gemini Live stays disabled by default behind `ENABLE_GEMINI_LIVE`; it is not a second audit engine.
- Gemini never owns mathematical truth. Deterministic backend functions calculate competency scores, gaps, priorities, dimension scores, overall readiness, and readiness status.
- Supabase is the system of record for sessions, messages, evidence, signals, scores, gaps, reports, recommendations, and roadmap handoff lineage.
- Every audit artifact uses one UUID `auditId` created before interviewing starts.

## API ownership

- `POST /api/auth/otp/request` and `POST /api/auth/otp/verify`: server-mediated Supabase phone authentication.
- `POST /api/audit/session`: creates or resumes a traceable audit session.
- `POST /api/qalam/chat`: adaptive Gemini probing; never returns fabricated fallback data.
- `POST /api/audit/evidence/signal`: validates and persists the canonical signal/evidence contract.
- `GET /api/catalog/competency/:roleId`: Supabase-only competency benchmark. Missing data is an explicit configuration error.
- `GET /api/roles/recommendations`: deterministic role-fit scoring based on intent/background/known skills.
- `POST /api/qalam/evaluate`: compatibility entry point that delegates to deterministic finalization.
- `POST /api/audit/:auditId/finalize`: loads persisted evidence, classifies with Gemini, calculates deterministic scores/gaps/status, asks Gemini only for explanations, persists the report and handoff.
- `GET /api/audit/:auditId/report`: returns the persisted report and explainability chain.
- `GET /api/audit/:auditId/roadmap-handoff`: returns `career-audit-roadmap-contract:v1`.

## Data model

Canonical tables are `audit_sessions`, `audit_messages`, `audit_evidence`, `audit_skill_signals`, `audit_skill_scores`, `audit_skill_gaps`, `audit_reports`, `audit_recommendations`, and `career_voice_pathwisse_mappings`.

The existing legacy `skill_signals` and `career_audits` tables remain backward-compatible but are not the production source of truth for new audits.

Data integrity rules are enforced with foreign keys, checks, uniqueness/idempotency constraints, and transactional finalization semantics where practical.

## Deterministic scoring

For each competency:

- `gap = max(expectedScore - demonstratedScore, 0)`
- `priorityWeight = importanceWeight × dependencyWeight × employabilityWeight`
- `weightedGap = gap × priorityWeight`

Readiness is the configured weighted average of dimension/competency scores. Readiness thresholds are shared backend domain configuration:

- Ready: 85–100
- Nearly Ready: 70–84
- Developing: 45–69
- Early Stage: 0–44

## Failure behavior

- Missing Gemini returns `503 AI_UNAVAILABLE`; audit progression does not silently continue.
- Missing Supabase returns `503 DATABASE_UNAVAILABLE` for critical writes.
- Critical persistence failures return non-2xx and never claim success.
- Malformed Gemini structured output is rejected and retried only for transient/provider failures.
- Missing competency models return `404 COMPETENCY_MODEL_MISSING`.
- Missing Pathwisse mapping yields `mappingStatus: "UNMAPPED"`; no roadmap item is invented.

## UI behavior

The current visual design is preserved. Functional changes add explicit loading/error/retry states, backend-provided role-fit scores, backend-provided readiness status/benchmark, evidence ledger/strengths/gaps, and persisted diagnostic chains.
