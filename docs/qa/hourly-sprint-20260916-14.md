# CareerVoice Hourly Sprint 14 QA

Branch: `feat/hourly-sprint-20260916-14`
Base: Sprint 13 `d3622da9b25101f69e5c3356e06500ea7598d737`
Selected tasks: CV-101, CV-102, CV-103, CV-104, CV-105

## New evidence this run
Sprint 13 GitHub Actions Verify run `35018671932` completed successfully. All workflow stages passed: dependency install, institution-route bootstrap, route-mount verification, contract tests, TypeScript verification, and production build.

| Task ID | Feature | Acceptance criteria | Test cases / evidence | Expected result | Actual result | Status | Bugs found | Retest status |
|---|---|---|---|---|---|---|---|---|
| CV-101 | Institution API runtime mount | Institution routes are mounted before SPA fallback and repository builds cleanly | CI route bootstrap + explicit mount verification + TypeScript + production build | Mount present; typecheck/build pass | All CI stages passed in run 35018671932 | Partial Pass | None in CI | CI retest passed; authenticated API E2E still required |
| CV-102 | Role selection/persistence | Supported role validates and persists for authenticated user | Contract tests in green CI | Validation/contract tests pass | Contract suite passed as part of green CI | Partial Pass | None in CI | Live authenticated Supabase role persistence E2E required |
| CV-103 | College onboarding/membership | Membership is created/read only within authorized college scope | Domain/contract tests in green CI | Contract tests pass | Contract suite passed | Partial Pass | None in CI | Two-college live RLS/isolation E2E required |
| CV-104 | Placement share links | Create/list/revoke/resolve respect tenant, department, expiry and lifecycle rules | Server/domain contract tests in green CI | Lifecycle and isolation contracts pass | Contract suite passed | Partial Pass | None in CI | Authenticated live lifecycle E2E required |
| CV-105 | College analytics | Analytics uses scoped sessions/report scores and cannot cross tenant/department boundary | Aggregate/domain contract tests in green CI | Aggregates/contracts pass | Contract suite passed | Partial Pass | None in CI | Two-college/two-department live Supabase analytics E2E required |

## QA gate
No task is marked Done. Green CI now closes the static/runtime-build gate, but CV-102 through CV-105 still require authenticated live Supabase evidence; CV-101 also needs an authenticated endpoint smoke test to prove the mounted router works with the deployed Supabase auth path.

## Next recommended tasks
1. CV-101 authenticated institution endpoint smoke test.
2. CV-102 authenticated role persistence E2E.
3. CV-103 two-college membership + RLS isolation E2E.
4. CV-104 share-link create/list/revoke/public-resolve lifecycle E2E.
5. CV-105 two-college/two-department analytics isolation and score-accuracy E2E.
