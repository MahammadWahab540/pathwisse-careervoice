# CareerVoice Hourly Sprint 13 QA

Branch: `feat/hourly-sprint-20260916-13`
Selected tasks: CV-101, CV-102, CV-103, CV-104, CV-105

| Task ID | Feature | Acceptance criteria | Test cases | Expected result | Actual result | Status | Bugs found | Retest status |
|---|---|---|---|---|---|---|---|---|
| CV-101 | Institution API runtime mount | Institution routes mount before SPA fallback and repository passes test/typecheck/build gates | CI route bootstrap + mount assertions + npm test + npm run lint + npm run build | Mount assertions, tests, TypeScript and build pass | Sprint 12 CI proved route bootstrap/mount and all 81 tests pass. TypeScript failed because `@vitejs/plugin-react` imported by vite.config.ts was absent from package.json. Sprint 13 adds the missing dev dependency; fresh CI retest pending. | Partial Pass | Missing `@vitejs/plugin-react` dependency caused TS2307 and skipped production build | Pending CI retest |
| CV-102 | Role persistence | Authenticated user persists allowed role; invalid role rejected | Existing CV-102 unit/contract tests + authenticated integration request | Valid role persists; invalid role returns 400 | Sprint 12 CI CV-102 contract test passed; live authenticated API/UI evidence remains pending | Partial Pass | No new CV-102 defect | Pending integration retest |
| CV-103 | College membership | Valid institution membership is normalized and tenant-scoped | Existing CV-103 unit test + two-user/two-college isolation E2E | Membership cannot cross tenant boundary | Sprint 12 CI CV-103 normalization test passed; live two-tenant isolation remains pending | Partial Pass | No new CV-103 defect | Pending isolation retest |
| CV-104 | Share links | Authorized member can create/list/revoke links and lifecycle/department boundaries are enforced | Existing CV-104 lifecycle, expiry and department tests + API E2E | Revoked/expired/cross-department access rejected | Sprint 12 CI CV-104 lifecycle, deterministic expiry and cross-department tests all passed; live API lifecycle pending | Partial Pass | No new CV-104 defect | Pending integration retest |
| CV-105 | College analytics | Aggregate analytics uses correct score source and college/department scope | Existing aggregate contract test + two-college/two-department live data E2E | Only authorized tenant aggregates returned | Sprint 12 CI CV-105 aggregate-first contract test passed; live Supabase isolation/accuracy evidence pending | Partial Pass | No new CV-105 defect | Pending isolation retest |

## Changes and evidence
- Inspected Sprint 12 GitHub Actions run 35012861683.
- Route bootstrap and explicit route-mount assertions passed.
- Full automated test suite passed: 81/81, 0 failures.
- TypeScript gate failed with TS2307 because `vite.config.ts` imports `@vitejs/plugin-react` but package.json did not declare it.
- Added `@vitejs/plugin-react` to devDependencies on Sprint 13 branch.
- Production build in Sprint 12 was skipped after the TypeScript failure; fresh CI must prove the dependency fix before CV-101 can be Done.

## Evidence policy
No selected task is marked Done without implementation plus executable QA evidence. Unit/contract success upgrades confidence but does not substitute for required authenticated/live tenant-isolation E2E.

## Next recommended tasks
1. CV-101: confirm Sprint 13 CI passes TypeScript and production build after dependency fix.
2. CV-102: execute authenticated role-selection API/UI E2E.
3. CV-103: execute two-user/two-college membership + RLS isolation E2E.
4. CV-104: execute authenticated create/list/revoke/resolve share-link lifecycle E2E.
5. CV-105: execute two-college/two-department analytics isolation and score-accuracy E2E.
