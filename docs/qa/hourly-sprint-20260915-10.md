# CareerVoice Hourly Sprint 10 QA

Branch: `feat/hourly-sprint-20260915-10`
Selected tasks: CV-101, CV-102, CV-103, CV-104, CV-105

| Task ID | Feature | Acceptance criteria | Test case | Expected result | Actual result | Status | Bugs found | Retest status |
|---|---|---|---|---|---|---|---|---|
| CV-101 | Auth/session + institution route bootstrap | Institution API routes are mounted before SPA fallback and protected routes validate Supabase bearer sessions | Inspect root server bootstrap; execute authenticated/unauthenticated route tests after mount | Institution endpoints resolve through Express; missing/invalid token returns 401 | Root `server.ts` still lacks router mount. A surgical patch is committed under `docs/patches/sprint-10-institution-route-mount.patch`; runtime execution unavailable in this connector environment | BLOCKED | Router exists but is not mounted into root server | REQUIRED |
| CV-102 | Role Selection | Authenticated user can persist supported `account_role`; invalid roles rejected | POST `/api/onboarding/role` with valid and invalid roles | Valid role persists; invalid role returns 400 | Handler/domain contract exists; cannot execute E2E until CV-101 mount is applied | PARTIAL PASS | Runtime route unavailable because CV-101 mount is pending | REQUIRED |
| CV-103 | College onboarding | Placement/management membership persists with college + department scope | POST `/api/onboarding/institution` with valid/invalid college and department | Valid membership persists; malformed college rejected; scope preserved | Handler and validation exist; runtime verification blocked by CV-101 | PARTIAL PASS | Runtime route unavailable | REQUIRED |
| CV-104 | Share links | Create/list/revoke/resolve links with expiry and department isolation | Create active link, reject invalid expiry, revoke, resolve expired/revoked link, cross-department attempt | Only active scoped links resolve; invalid/expired/revoked/cross-scope operations fail safely | Handler/domain tests exist from prior sprints; E2E blocked by CV-101 | PARTIAL PASS | Runtime route unavailable | REQUIRED |
| CV-105 | College analytics | Analytics aggregate only sessions belonging to caller college/department and scores come from `audit_reports` | Two-college/two-department fixture; request analytics as each tenant | No cross-tenant leakage; score aggregation uses report rows | Query implementation was corrected in Sprint 09; live tenant-isolation E2E remains blocked by CV-101 | PARTIAL PASS | Runtime route unavailable | REQUIRED |

## Sprint 10 evidence

- Created this sprint branch from Sprint 09 head `7ae19c53279c97d348ad8755ed601c7f55a1ab03`.
- Re-read `server.ts`: Express + JSON middleware exist, but `registerInstitutionRoutes` is not imported/mounted.
- Re-read `src/server/institutionRoutes.ts`: the router exposes the CV-102 through CV-105 handlers and bearer-token authentication.
- Re-read `src/lib/supabase.ts`: `getSupabase()` supplies the privileged server client required by the router.
- Added a minimal, reviewable mount patch rather than replacing the ~132 KB root server blindly through a whole-file-only connector.
- Attempted local repository execution, but the runtime cannot resolve github.com, so clone/build/test execution could not be performed in this run.

## Required retest sequence

1. Apply `docs/patches/sprint-10-institution-route-mount.patch` to `server.ts`.
2. Run TypeScript/lint.
3. Run the repository test suite including `src/server/*.test.ts` and `src/domain/*.test.ts`.
4. Run production build.
5. Start server and verify unauthenticated institution endpoints return 401 rather than SPA HTML/404.
6. Verify authenticated role and institution onboarding.
7. Run share-link lifecycle tests.
8. Run two-college/two-department analytics isolation tests against Supabase.

No task is marked Done without those execution results.
