# CareerVoice engineering cycle report — 2026-09-15

## Selected task IDs

- CareerVoice Productionization Task 1: Deterministic audit domain and contracts
- CareerVoice Productionization Task 2: Supabase normalized lineage migration
- CareerVoice Productionization Task 3: Server configuration, health, auth, sessions, evidence contract
- CareerVoice Productionization Task 4: Backend-driven role fit and competency loading
- CareerVoice Productionization Task 5: Deterministic finalization and persisted report

## Branch

`cycle/careervoice-20260915-0717-tasks-1-5`

## Work performed in this cycle

This run inspected the authoritative plan at `docs/superpowers/plans/2026-08-21-careervoice-productionization.md`, the design spec at `docs/superpowers/specs/2026-08-21-careervoice-productionization-design.md`, the existing cycle branch, prior migration files, and Supabase project `pfzjbazocmgflcogjjrg`. The branch already contained implementations for Tasks 1-5, so this cycle focused on independent verification, Supabase validation, and durable QA documentation rather than duplicating implementation.

## Supabase validation

Migration status from project `pfzjbazocmgflcogjjrg` shows `career_voice_evidence_scoring` applied as version `20260821160033`. The repo contains the corresponding migration as `supabase/migrations/20260821213000_career_voice_evidence_scoring.sql`; timestamps differ, so future migration reconciliation should compare content before re-applying anything.

Validation SQL results:

| Check | Result | Status |
|---|---:|---|
| Published role competency model defects | 0 | PASS |
| Unmapped Pathwisse lineage rows | 110 | FAIL |
| Canonical v1 signals without evidence | 0 | PASS |
| Gap lineage defect rows | 0 | PASS |
| Recommendations without gap rows | 0 | PASS |

Task 2 remains QA Failed because published CareerVoice skills still lack stable Pathwisse skill/stage mappings.

## Tests run

- `npm ci` — PASS
- `npm run lint` — PASS
- `npm run build` — PASS, with Vite chunk-size warning only
- `npm test` — BLOCKED by environment IPC permission: `listen EPERM /tmp/tsx-0/*.pipe`
- `node --import tsx --test tests/*.test.ts src/ai/*.test.ts` — PASS, 73 passed / 0 failed
- Supabase validation SQL on `pfzjbazocmgflcogjjrg` — FAIL only for 110 unmapped Pathwisse lineage rows

## QA status

Persistent QA sheet: `docs/qa/careervoice-engineering-cycle-20260915-0717.csv`

Tasks 1, 3, 4, and 5 are validated by local tests/build in this environment. Task 2 is implemented structurally but cannot be marked Done because the live validation SQL reports 110 unmapped lineage rows.

## Bugs and blockers

- BUG: `career_voice_pathwisse_mappings` still contains 110 rows for published role skills where `mapping_status = 'UNMAPPED'`, `pathwisse_skill_id is null`, or `pathwisse_stage_ids` is empty. This violates Task 2 acceptance criteria.
- BLOCKER: The project-level `npm test` script is blocked in this sandbox by `tsx` IPC listener permissions. The direct Node runner workaround passed all tests.
- NOTE: Independent validation agents reviewed Tasks 1-5; Task 2 found the live Supabase mapping blocker, Task 4 found the seed fallback bug, and Task 5 patched malformed AI output handling before final validation.

## Next recommended tasks

1. Create a mapping data migration that resolves the 110 unmapped CareerVoice skills to actual Pathwisse skill IDs and stage IDs.
2. Re-run `scripts/validate-career-voice-mappings.sql` against a safe Supabase branch/test environment, then production only after review.
3. Reconcile migration timestamp drift between repo `20260821213000_career_voice_evidence_scoring.sql` and applied project migration `20260821160033_career_voice_evidence_scoring`.
4. Continue with Task 6 only after Task 2 mapping lineage passes, because frontend handoff quality depends on mapped roadmap lineage.
