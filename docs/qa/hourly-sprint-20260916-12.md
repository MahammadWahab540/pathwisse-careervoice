# CareerVoice Hourly Sprint 12 QA

Branch: `feat/hourly-sprint-20260916-12`
Selected tasks: CV-101, CV-102, CV-103, CV-104, CV-105

| Task ID | Feature | Acceptance criteria | Test cases | Expected result | Actual result | Status | Bugs found | Retest status |
|---|---|---|---|---|---|---|---|---|
| CV-101 | Institution API runtime mount | Institution routes are mounted before SPA fallback and included in dev/build/CI paths | Run route bootstrap; assert import and mount lines; run TypeScript, tests, production build | Route module is present in compiled server and verification passes | CI workflow now runs bootstrap and explicit mount assertions on hourly sprint branches; executable CI result not yet attached to commit | Partial Pass | Historical CI only watched `feat/qalam-adaptive-tool-ui`, so sprint branches produced no verification evidence | Pending CI evidence |
| CV-102 | Role persistence | Authenticated user can persist an allowed account role; invalid role rejected | API contract/server unit tests plus authenticated integration request | Valid role persists; invalid role returns 400 | Implementation and tests exist; live authenticated API evidence still pending | Partial Pass | No new defect this run | Pending integration retest |
| CV-103 | College membership | Placement/management user can persist valid college membership with normalized department and tenant boundary | Unit tests plus two-user/two-college API isolation test | Membership is tenant-scoped and invalid college IDs are rejected | Validation and scoped server implementation exist; live two-tenant evidence pending | Partial Pass | No new defect this run | Pending isolation retest |
| CV-104 | Share links | Authorized college user can create/list/revoke scoped links; expired/revoked links cannot resolve | Unit tests for expiry/department scope plus authenticated API lifecycle | Link lifecycle works without cross-department access | Server/domain coverage exists; live lifecycle evidence pending | Partial Pass | No new defect this run | Pending integration retest |
| CV-105 | College analytics | Analytics uses audit report scores and respects college + department scope | Unit/contract validation plus two-college/two-department data test | Counts/readiness distribution contain only authorized tenant data | Schema mismatch was fixed previously; live isolation/data accuracy evidence pending | Partial Pass | No new defect this run | Pending isolation retest |

## Changes in this run
- Expanded `.github/workflows/verify.yml` push coverage to `feat/hourly-sprint-*`.
- Added an explicit CI bootstrap step for `scripts/ensure-institution-routes.mjs`.
- Added CI assertions proving both the institution route import and runtime mount are present before tests/build.
- Existing test, TypeScript, and production-build gates remain in the same verification job.

## Evidence policy
No CV-101 through CV-105 task is marked complete until executable CI/API/live-Supabase evidence is available. A missing CI status is treated as pending, not passing.

## Next recommended tasks
1. CV-101: obtain green CI evidence for route mount, tests, TypeScript, and production build.
2. CV-102: authenticated role-selection API/UI E2E.
3. CV-103: two-user/two-college membership and RLS isolation E2E.
4. CV-104: authenticated create/list/revoke/resolve share-link lifecycle E2E.
5. CV-105: two-college/two-department analytics isolation and score-accuracy E2E.
