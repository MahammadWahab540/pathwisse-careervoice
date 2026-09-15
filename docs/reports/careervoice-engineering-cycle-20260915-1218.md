# CareerVoice engineering cycle report — 2026-09-15

## Selected task IDs

- CareerVoice Productionization Task 1
- CareerVoice Productionization Task 2
- CareerVoice Productionization Task 3
- CareerVoice Productionization Task 4
- CareerVoice Productionization Task 5

## Branch and pull request

- Branch: `cycle/careervoice-20260915-0717-tasks-1-5`
- Pull request: #15

The unfinished Tasks 1–5 batch was resumed. No overlapping batch or production deployment was created.

## Changes made

- Corrected the shared roadmap handoff type so it exactly matches the persisted `career-audit-roadmap-contract:v1` payload and aliased API/application DTOs to that canonical type.
- Moved AI explanation generation and validation ahead of final signal/score/gap persistence.
- Preserved provider availability failures as `AI_UNAVAILABLE` with HTTP 503 while malformed structured output remains `AI_RESPONSE_INVALID` with HTTP 502.
- Updated an existing finalization signal on retry before score/gap upserts, preventing stale classification lineage after a partial persistence failure.
- Added four focused finalization regression tests.
- Expanded `scripts/validate-career-voice-mappings.sql` to distinguish structural mapping defects from explicit safe `UNMAPPED` inventory and added semantic score/gap lineage checks.

## Supabase validation

Target inspected: connected `SupabaseB2C-Voice` project `pfzjbazocmgflcogjjrg`. Only read-only SQL and advisors were run; no production mutation was applied.

- Published role competency-model defects: 0
- Published role skills: 110
- Mapping inventory defects: 0
- Stale mappings: 0
- Malformed mapping states: 0
- Score/evidence lineage mismatches: 0
- Deterministic gap mismatches: 0
- Mapped Pathwisse skills: 0
- Explicit unresolved mappings: 110

The design specification explicitly requires `UNMAPPED` output and forbids invented stages when a stable mapping is absent. Structural Task 2 validation therefore passes, but actual Pathwisse coverage remains blocked because neither this repository nor the connected database exposes an authoritative Pathwisse skill/stage catalog. A verified catalog export/API or reviewed crosswalk is required before the 110 rows can be mapped safely.

Migration provenance also remains blocked: the connected project records `career_voice_evidence_scoring` as version `20260821160033`, while the repository file is `20260821213000_career_voice_evidence_scoring.sql`. Do not reapply based on filename alone.

Security advisors reported no Task 2 mapping-table warning. Project-wide unrelated notices remain for five RLS-enabled tables without policies and disabled leaked-password protection. Performance notices are outside this batch.

## Technical validation

- Independent QA direct Node runner: PASS, 77/77 tests
- Focused finalization/domain regression tests: PASS, 16/16
- `npm run lint`: PASS
- `npm run build`: PASS, Vite 794 KB chunk-size warning only
- `git diff --check`: PASS
- Connected Supabase read-only validation: structural checks PASS; external mapping coverage BLOCKED

## QA status

- Task 1: PASS
- Task 2: PASS for schema, inventory, RLS shape, and safe UNMAPPED behavior; BLOCKED for authoritative Pathwisse catalog coverage and migration-history reconciliation; not marked fully Done
- Task 3: PASS
- Task 4: PASS
- Task 5: PASS after review fixes and retest

QA evidence: `docs/qa/careervoice-engineering-cycle-20260915-1218.csv`.

## Bugs and blockers

- Fixed: explanation failure could leave persisted classification lineage before a retry.
- Fixed: provider outages were converted to malformed-response 502 errors.
- Fixed: exported roadmap contract differed from the persisted endpoint payload.
- Fixed: a retry after partial database persistence could retain an old final signal while updating its score.
- Blocked: no authoritative Pathwisse skill/stage catalog or reviewed 110-row mapping crosswalk is available in scope.
- Blocked: repository/live migration timestamp provenance is not reconciled.

## Next recommended tasks

1. Supply or connect the authoritative Pathwisse skill/stage catalog and create a reviewed slug-based mapping manifest for all 110 rows.
2. Reconcile the live `20260821160033` migration with repository migration history before any reapplication.
3. Retest Task 2 catalog references and then mark the Tasks 1–5 batch fully Done.
4. Continue with Task 6 only after the current batch blocker is resolved or explicitly accepted as a staged external-integration dependency.
