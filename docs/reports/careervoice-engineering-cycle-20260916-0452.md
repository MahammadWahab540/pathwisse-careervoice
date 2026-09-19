# CareerVoice engineering cycle report — 2026-09-16

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

- Added a strict offline structural preflight for the 110-row Task 2 crosswalk manifest.
- Enforced exact inventory set equality including role slugs and skill names.
- Enforced decision-state shape, UUID syntax, unique nonempty stages, score and
  recomputed-margin gates, match-method ceilings, compound-label safeguards,
  strict non-future RFC3339 review timestamps, provenance syntax, and one catalog
  snapshot across approved rows.
- Validated retained `REVIEW` candidate evidence without treating it as approved.
- Added a package script and twenty focused regression tests.
- Clarified in the runbook and CLI output that structural preflight does not prove
  catalog existence, parentage, published status, stage order, or digest authenticity.

## Supabase changes

- Target in scope: `SupabaseB2C-Voice` project `pfzjbazocmgflcogjjrg`.
- No database mutation, migration application, deployment, or Edge Function change.
- The existing 110 rows remain explicitly `UNMAPPED`.
- No Pathwisse identifiers were invented or promoted to `MAPPED`.

## Tests run

- Focused structural-preflight suite: PASS, 20/20
- Full direct Node suite after all fixes: PASS, 109/109
- TypeScript lint after all fixes: PASS
- Production build: PASS; existing 794.10 kB chunk warning only
- `git diff --check`: PASS
- `npm test` and the npm preflight wrapper cannot bootstrap in this runner because
  `tsx` receives `EPERM` creating a `/tmp/tsx-0/*.pipe`; direct Node loader commands pass.

## QA status

- Task 1: PASS
- Task 2: structural preflight PASS; authoritative catalog coverage BLOCKED; not Done
- Task 3: PASS
- Task 4: PASS
- Task 5: PASS

Independent QA found malformed retained `REVIEW` evidence and mixed approved catalog
snapshots were initially accepted. Both defects were fixed with failing regressions
first and passed focused retest.

## Bugs and blockers

- Fixed: loose JavaScript date parsing accepted impossible review dates.
- Fixed: unsupported or fuzzy match methods could bypass their score ceilings.
- Fixed: malformed `REVIEW` candidate evidence was not validated.
- Fixed: approved rows could reference different catalog snapshots.
- Blocked: no approved catalog snapshot is available to prove target existence,
  hierarchy, publication status, stage ordering, and digest authenticity.
- Task 2 and PR #15 must remain incomplete/draft until that external validation passes.

## Next recommended tasks

1. Supply an explicitly approved, versioned Pathwisse catalog snapshot.
2. Extend the preflight with catalog digest and hierarchical parentage validation.
3. Generate and review the complete 110-row manifest.
4. Apply the reviewed migration only in an isolated/test environment and rerun SQL
   plus integration validation.
5. Complete independent Task 2 QA, then make PR #15 review-ready and start Task 6.
