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
- Added authentication and audit-ownership enforcement to the compatibility evaluation, report, and roadmap-handoff endpoints; the canonical finalize endpoint now uses the same fail-closed authorization helper.
- Removed unauthenticated synthetic report/finalization fallbacks and made an unavailable database fail explicitly with `DATABASE_UNAVAILABLE`; disabled the client-side re-audit score simulator until a new persisted-session flow exists.
- Aligned the canonical audit report type with the exact persisted and returned wire payload.
- Rejected duplicate competency, dimension, and explanation identifiers so every required AI item appears exactly once.
- Recovered concurrent final-signal insert conflicts through the unique idempotency key and removed obsolete recommendations after successful retries.
- Added fourteen focused authorization, finalization, contract, and idempotency regression tests across the batch.
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

The design specification explicitly requires `UNMAPPED` output and forbids invented stages when a stable mapping is absent. Structural Task 2 validation therefore passes, but actual Pathwisse coverage remains blocked. Repository investigation identified the authoritative source as Pathwisse production project `fvmjeietdxrvcnikcsxs`, used by `MahammadWahab540/PathwisseConnect`. Its `consumer_career_paths`, `consumer_roadmap_skills`, and `consumer_skill_stages` rows use UUIDs generated during import; no catalog snapshot or stable ID crosswalk is committed. A read-only export/query from that project is required before the 110 rows can be mapped safely.

Migration provenance is reconciled without changing live history or reapplying SQL. The live statement and Git file both normalize to 10,568 characters with MD5 `3150eef972a7265c6473086746949ee8`. The live UTC version `20260821160033` is 30 seconds after the original Git commit time of 21:30:03 +0530, proving the old repository filename used local time. The Git migration is now named `20260821160033_career_voice_evidence_scoring.sql` to match the connected project.

Security advisors reported no Task 2 mapping-table warning. Project-wide unrelated notices remain for five RLS-enabled tables without policies and disabled leaked-password protection. Performance notices are outside this batch.

## Technical validation

- Independent QA direct Node runner: PASS, 89/89 tests
- Focused authorization/finalization/domain regression tests: PASS
- `npm run lint`: PASS
- `npm run build`: PASS, Vite 794 KB chunk-size warning only
- `git diff --check`: PASS
- Connected Supabase read-only validation: structural checks PASS; external mapping coverage BLOCKED

## QA status

- Task 1: PASS after canonical report-contract correction and retest
- Task 2: PASS for schema, inventory, RLS shape, safe UNMAPPED behavior, and migration-history reconciliation; BLOCKED for authoritative Pathwisse catalog coverage; not marked fully Done
- Task 3: PASS after fail-closed endpoint authentication/ownership correction and retest
- Task 4: PASS
- Task 5: PASS after exact-one AI validation, concurrency recovery, stale-recommendation pruning, and retest

QA evidence: `docs/qa/careervoice-engineering-cycle-20260915-1218.csv`.

## Bugs and blockers

- Fixed: explanation failure could leave persisted classification lineage before a retry.
- Fixed: provider outages were converted to malformed-response 502 errors.
- Fixed: exported roadmap contract differed from the persisted endpoint payload.
- Fixed: a retry after partial database persistence could retain an old final signal while updating its score.
- Fixed: evaluation/report/handoff endpoints used a service-role client without authenticating or checking audit ownership.
- Fixed: dev fallback routes bypassed authentication and returned non-canonical synthetic reports; the re-audit UI fabricated score increases from unpersisted inputs.
- Fixed: the canonical report contract drifted from the persisted wire payload.
- Fixed: duplicate AI items, concurrent final-signal insertion, and stale retry recommendations were not handled strictly.
- Blocked: the authoritative Pathwisse catalog is in separate production project `fvmjeietdxrvcnikcsxs`; current access does not expose its live generated UUID hierarchy or a reviewed 110-row crosswalk.
- Fixed: repository/live migration timestamp provenance is reconciled by content hash and UTC filename without reapplying SQL.

## Next recommended tasks

1. Grant read-only access to, or export, published `consumer_career_paths`, `consumer_roadmap_skills`, and `consumer_skill_stages` from `fvmjeietdxrvcnikcsxs`, including IDs, slugs/titles, and parent IDs.
2. Retest Task 2 catalog references and then mark the Tasks 1–5 batch fully Done.
3. Continue with Task 6 only after the current batch blocker is resolved or explicitly accepted as a staged external-integration dependency.
