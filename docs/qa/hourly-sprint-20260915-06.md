# CareerVoice Hourly Sprint 06 QA

Branch: `feat/hourly-sprint-20260915-06`

| Task ID | Feature | Acceptance criteria | Test case | Expected result | Actual result | Status | Bugs found | Retest status |
|---|---|---|---|---|---|---|---|---|
| CV-101 | Auth/session + institution API mount | Authenticated institution endpoints are reachable before SPA fallback | Start server and call `/api/onboarding/role` without bearer token | API returns 401 JSON, not SPA HTML | Route module exists, but root `server.ts` still does not mount `registerInstitutionRoutes` | BLOCKED | Root route registration missing | Pending |
| CV-102 | Role selection persistence | Supported roles persist to `profiles.account_role`; unsupported roles rejected | POST valid and invalid `accountRole` with authenticated session | Valid = 200; invalid = 400 | Handler and domain validation present; live mounted API not yet executable | PARTIAL PASS | Depends on CV-101 mount | Pending |
| CV-103 | College onboarding | Placement/management user can persist valid college membership; malformed college IDs rejected | POST valid UUID + role; POST malformed UUID | Valid = membership returned; malformed = 400 | Handler validates UUID/role and scopes membership; live mounted API pending | PARTIAL PASS | Depends on CV-101 mount | Pending |
| CV-104 | Share-link lifecycle | Links are tenant/department scoped, future expiry validated, revoked/expired links rejected, usage count increments | Create future link; create past-expiry link; resolve twice; revoke; resolve again | Future = 201; past = 400; usage increments; revoked = 404 | Added future-expiry validation and best-effort `usage_count` increment on successful resolution; existing revoke/expiry checks retained | PARTIAL PASS | Concurrent resolves can race on read+write usage counter; should move increment to DB RPC later | Pending live API test |
| CV-105 | College analytics isolation | Analytics only exposes sessions inside caller college + department scope | Query as users from two colleges/departments | No cross-tenant or cross-department sessions returned | Handler filters by membership college and department; no two-tenant live Supabase evidence in this run | PARTIAL | Live tenant-isolation fixture/test missing | Pending |

## Validation evidence

- Repository test command includes `tests/*.test.ts`, `src/ai/*.test.ts`, `src/domain/*.test.ts`, and `src/server/*.test.ts`.
- `institutionRoutes.ts` now rejects non-future/malformed share-link expiry values with `400 INVALID_EXPIRY`.
- Successful public share-link resolution now increments the existing `usage_count` field on a best-effort basis.
- No task is marked Done because root route mounting, build/typecheck execution, and live two-tenant Supabase QA are still missing.

## Next execution

1. CV-101: import and mount `registerInstitutionRoutes(app, requireSupabase())` before Vite/static SPA middleware, with a startup-safe Supabase configuration guard.
2. Run `npm run lint`, `npm test`, and `npm run build`; attach exact results to QA.
3. CV-102: wire Role Selection UI to `saveAccountRole` and verify session bearer propagation.
4. CV-103/CV-104: wire College Onboarding + Placement Dashboard share-link UI.
5. CV-105: seed two colleges and two departments, then execute positive/negative tenant-isolation tests.
