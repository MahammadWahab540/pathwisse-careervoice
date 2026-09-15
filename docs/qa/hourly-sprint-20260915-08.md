# CareerVoice Hourly Sprint 08 QA Matrix

Branch: `feat/hourly-sprint-20260915-08`
Selected tasks: CV-101, CV-102, CV-103, CV-104, CV-105

| Task ID | Feature | Acceptance Criteria | Test Case | Expected Result | Actual Result | Status | Bugs Found | Retest Status |
|---|---|---|---|---|---|---|---|---|
| CV-101 | Auth/session + institution route bootstrap | Institution APIs mounted before SPA fallback and reject missing/invalid bearer sessions | Inspect root server and protected endpoint mount | Router imported/mounted; unauthenticated calls return 401 | Root server still has no institution router import/mount | Blocked | CV-BUG-101 remains open | Pending |
| CV-102 | Role selection persistence | Valid account role persists for authenticated user | Validator + authenticated API integration | Valid role stored; invalid role 400 | Handler exists but is unreachable until CV-101 mount | Partial Pass | Depends on CV-BUG-101 | Pending integration retest |
| CV-103 | College onboarding | Valid institution membership persists with tenant scope | UUID/role/department validation + API integration | Membership persisted for caller | Handler and validation exist; runtime blocked by CV-101 | Partial Pass | Depends on CV-BUG-101 | Pending integration retest |
| CV-104 | Share-link lifecycle | Create/list/revoke/resolve enforce tenant+department, expiry and revoke semantics | Unit rules + lifecycle API integration | No scope escape; invalid links rejected | Handler contains scope/expiry/revoke rules; runtime blocked by CV-101 | Partial Pass | Depends on CV-BUG-101 | Pending integration retest |
| CV-105 | College analytics | Aggregate analytics remain college+department scoped | Two-college/two-department live isolation | No cross-tenant rows | Query is scoped in handler; live isolation evidence unavailable | Partial | Depends on CV-BUG-101 | Pending live retest |

## Run evidence
- Created Sprint 08 branch directly from Sprint 07 QA commit `475dc45482d0c86eaf5186d3027be78f82728f48`.
- Re-inspected `server.ts`: Express app and JSON middleware are initialized, but `registerInstitutionRoutes` is not imported/mounted.
- Re-inspected `src/server/institutionRoutes.ts`: CV-102 through CV-105 handlers remain present with bearer auth, tenant/department scope, expiry validation, revoke semantics and aggregate analytics.
- No CI/build/test pass is claimed because this connector does not provide an execution environment and no new status evidence exists.
- No task is marked Done.

## Next recommended tasks
1. CV-101: mount `registerInstitutionRoutes` in root Express bootstrap using the configured Supabase client, before SPA/Vite fallback.
2. Run lint/typecheck/test/build in an executable environment and attach evidence.
3. CV-102: wire Role Selection UI to `/api/onboarding/role` and verify authenticated persistence.
4. CV-103/CV-104: wire institution onboarding + placement share-link dashboard.
5. CV-105: run two-college/two-department tenant-isolation QA against SupabaseB2C-Voice.
