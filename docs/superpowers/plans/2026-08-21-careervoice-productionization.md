# CareerVoice Productionization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Productionize CareerVoice into a traceable, deterministic, evidence-driven Career Audit system.

**Architecture:** Gemini HTTP classifies evidence and explains results; deterministic TypeScript domain code owns scoring and gaps; Supabase owns the normalized audit lineage. Browser Speech remains transport, and Gemini Live is experimental only.

**Tech Stack:** TypeScript, React, Express, `@google/genai`, Supabase/Postgres, Node test runner/tsx.

**Spec:** `docs/superpowers/specs/2026-08-21-careervoice-productionization-design.md`

## Global Constraints

- No score without evidence.
- No gap without a benchmark.
- No recommendation without a traceable reason.
- Never expose `GEMINI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- New production audits use one UUID `auditId` from session creation through roadmap handoff.
- Gemini cannot modify deterministic scores.
- Missing provider/database/configuration states fail explicitly.
- Preserve current UI design unless behavior requires a state change.

---

### Task 1: Deterministic audit domain and contracts

**Files:**
- Create: `src/domain/careerAudit.ts`
- Create: `tests/careerAudit.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces canonical `SkillSignalInput`, competency, score/gap/report/handoff types and runtime parsers.
- Produces `calculateSkillScore`, `calculateSkillGap`, `calculateReadiness`, `readinessStatusForScore`, and `calculateRoleFit`.

- [ ] Write tests for evidence validation, threshold boundaries, deterministic score/gap output, and two different role-fit profiles.
- [ ] Run tests and confirm RED because the domain module does not exist.
- [ ] Implement the minimal pure TypeScript domain module.
- [ ] Run tests and confirm GREEN.

### Task 2: Supabase normalized lineage migration

**Files:**
- Create: `supabase/migrations/20260821213000_career_voice_evidence_scoring.sql`
- Create: `scripts/validate-career-voice-mappings.sql`

**Interfaces:**
- Extends evidence/signals and creates `audit_skill_scores`, `audit_skill_gaps`, `audit_recommendations`, `career_voice_pathwisse_mappings`.
- Populates one competency model for every published role from `career_role_skills` without hardcoded generated UUIDs.

- [ ] Write SQL assertions that detect published roles without exactly one competency model and orphan/unmapped lineage.
- [ ] Apply migration to the connected Supabase project.
- [ ] Execute validation SQL and verify role/model counts.

### Task 3: Server configuration, health, auth, sessions, evidence contract

**Files:**
- Create: `src/server/config.ts`
- Modify: `.env.example`
- Modify: `server.ts`
- Modify: `src/lib/supabase.ts`

**Interfaces:**
- Adds centralized Gemini model configuration and `ENABLE_GEMINI_LIVE`.
- Adds real Supabase OTP request/verify and audit session creation.
- Makes health return Gemini/Supabase/evaluation/voice engine state.
- Makes evidence writes strict/idempotent and persists raw answers.

- [ ] Add contract/error-path tests where pure logic permits.
- [ ] Replace fake chat fallback with `503 AI_UNAVAILABLE`.
- [ ] Gate `/live` behind the feature flag.
- [ ] Persist messages/evidence/signals under one audit UUID.

### Task 4: Backend-driven role fit and competency loading

**Files:**
- Modify: `server.ts`
- Modify: `src/components/audit/RoleDiscoveryStep.tsx`
- Modify: `src/components/audit/LoadCompetencyModelStep.tsx`

**Interfaces:**
- `GET /api/roles/recommendations` returns deterministic `matchScore`, `fitBand`, and `fitReasons`.
- Competency endpoint never falls back to seed data.

- [ ] Remove 98/92/87 scores and index-based matching.
- [ ] Start competency model state at `null` and show loading/missing-config/retry states.

### Task 5: Deterministic finalization and persisted report

**Files:**
- Modify: `server.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- `POST /api/audit/:auditId/finalize` performs classify → persist signals → deterministic scores/gaps/status → explanation → report/handoff persistence.
- `POST /api/qalam/evaluate` becomes a compatibility delegate requiring `auditId`.
- Adds report and handoff GET endpoints.

- [ ] Constrain Gemini structured output and reject malformed output.
- [ ] Persist scores/gaps/recommendations with traceable foreign keys.
- [ ] Make finalization idempotent.

### Task 6: Frontend session/evidence/finalization flow

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/audit/PhoneOtpStep.tsx`
- Modify: `src/components/audit/AdaptiveInterviewStep.tsx`

**Interfaces:**
- Carries `userId` and one `auditId` through the flow.
- Critical message/signal persistence is awaited; failures surface retry states.
- Missing Gemini does not advance the audit.

- [ ] Replace instant-passkey OTP behavior with server Supabase OTP APIs.
- [ ] Create audit session before interview.
- [ ] Send canonical `SkillSignalInput` including raw answer and source.
- [ ] Finalize by audit ID.

### Task 7: Complete explainable report and roadmap handoff UI

**Files:**
- Modify: `src/components/audit/ReadinessReportView.tsx`
- Modify: `src/components/audit/GapReportView.tsx`
- Modify: `src/components/audit/DiagnosticChainCard.tsx`
- Modify: `src/components/audit/RoadmapView.tsx`

**Interfaces:**
- Renders backend-provided readiness status/benchmark/distance, role-fit reasoning, strengths, gaps, evidence ledger, recommendations, diagnostic chain, and mapping status.

- [ ] Remove UI-owned readiness thresholds and default roadmap generation.
- [ ] Render `UNMAPPED` instead of inventing Pathwisse stages.

### Task 8: Hardcoded-data sweep and verification

**Files:**
- Modify only production-path files found by sweep.

- [ ] Search for `98%`, `92%`, `87%`, `Core Knowledge`, `Intermediate`, `60`, `generateDefaultRoadmap`, `fallback`, `mock`, `dummy`, `hardcoded`, `sample`, `anonymous`, `current_student`.
- [ ] Remove production-path placeholders; keep isolated fixtures only.
- [ ] Run domain tests, TypeScript lint/build where the environment permits, Supabase validations, and endpoint/E2E tests where credentials/runtime permit.
- [ ] Record PASS/FAIL/BLOCKED against all 12 requested tests plus E2E acceptance.
