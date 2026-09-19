# CareerVoice engineering cycle report — 2026-09-19

## Selected task IDs

- CareerVoice Productionization Task 1
- CareerVoice Productionization Task 2
- CareerVoice Productionization Task 3
- CareerVoice Productionization Task 4
- CareerVoice Productionization Task 5

## Branch and pull request

- Branch: `cycle/careervoice-20260915-0717-tasks-1-5`
- Pull request: #15 (draft)

The unfinished Tasks 1–5 batch was resumed. No overlapping batch was started.

## Changes made

- Extended the Task 2 offline crosswalk validator to require an exact versioned
  Pathwisse catalog snapshot and an independently approved SHA-256 checksum.
- Added strict path, skill, and stage schema validation; UUID and publication checks;
  parent-reference validation; exact label validation; a unique CareerVoice-role to
  Pathwisse-path binding; and selected-stage ordering by `(order_index, id)`.
- Validated both `APPROVED` rows and populated `REVIEW` candidates against the same
  trusted catalog snapshot.
- Added eleven catalog regressions, including forged snapshots, unsigned fields,
  duplicate role bindings, hierarchy drift, and REVIEW candidate drift.
- Removed committed Supabase service-role and publishable-key fallbacks from the live
  authentication test. Live privileged tests now require explicit environment
  credentials plus `CAREERVOICE_LIVE_AUTH_TESTS=true`.
- Updated the Task 2 runbook and persistent QA evidence.

## Supabase changes

- Target in scope: `SupabaseB2C-Voice` project `pfzjbazocmgflcogjjrg`.
- No database mutation, migration application, Edge Function deployment, or production
  deployment was performed.
- Existing production evidence remains 110/110 mapping rows explicitly `UNMAPPED`.
- No Pathwisse identifier was invented or promoted to `MAPPED`.
- The previously committed service-role key must be rotated in Supabase; removing it
  from the current tree does not revoke a credential already exposed in Git history.

## Tests run

- Independent focused QA: PASS, 31/31.
- Full safe direct Node suite: PASS, 113 passed, 0 failed, 7 explicitly skipped live
  Supabase authentication tests.
- TypeScript lint: PASS.
- Production build: PASS; existing 794.10 kB chunk warning only.
- `git diff --check`: PASS.
- Secret fallback scan: PASS.

## QA status

- Task 1: PASS
- Task 2: validator and structural QA PASS; real catalog/crosswalk BLOCKED; not Done
- Task 3: PASS; live privileged integration remains opt-in
- Task 4: PASS
- Task 5: PASS

Independent QA found and retested two validator bugs: unsigned catalog fields were
outside the digest schema, and multiple paths could be bound to one CareerVoice role.
Both now have passing regressions. Independent QA also confirmed explicit `REVIEW`
catalog mismatch coverage.

## Bugs and blockers

- Fixed: self-consistent forged snapshots could be trusted without an external digest.
- Fixed: extra catalog fields could sit outside the canonical digest schema.
- Fixed: multiple Pathwisse paths could bind to one CareerVoice role.
- Fixed: live auth tests contained fallback credentials and could mutate Supabase
  without an explicit opt-in.
- Blocked: no authorized immutable production catalog snapshot, independently approved
  checksum, or human-reviewed 110-row manifest is available in the repository.
- Blocked: no fixed-value mapping migration can be generated or validated in an
  isolated environment until that evidence exists.
- Security action: rotate the previously exposed Supabase service-role key.

## Next recommended tasks

1. Rotate the exposed Supabase service-role key and audit its recent use.
2. Supply an authorized Pathwisse catalog snapshot and its checksum through separate
   approved channels.
3. Produce and human-review the complete 110-row manifest, including duplicate slugs
   and compound labels.
4. Generate the fixed-value migration and validate it only in an isolated/test target.
5. Complete Task 2 independent database/integration QA, make PR #15 review-ready, then
   begin Task 6.
