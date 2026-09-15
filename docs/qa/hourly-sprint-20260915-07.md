# CareerVoice Hourly Sprint 07 QA Matrix

Branch: `feat/hourly-sprint-20260915-07`
Selected tasks: CV-101, CV-102, CV-103, CV-104, CV-105

| Task ID | Feature | Acceptance Criteria | Test Case | Expected Result | Actual Result | Status | Bugs Found | Retest Status |
|---|---|---|---|---|---|---|---|---|
| CV-101 | Auth/session + institution route bootstrap | Institution APIs are mounted before SPA fallback and reject missing/invalid bearer sessions | Inspect root server mount; call protected institution endpoint without/with invalid token | Route exists; 401 for missing/invalid session | `registerInstitutionRoutes` still not imported/mounted in root `server.ts` | Blocked | CV-BUG-101: institution route module unreachable from runtime | Pending |
| CV-102 | Role selection persistence | Only student, placement_team, college_management accepted and persisted against authenticated user | Unit validation plus authenticated API integration | Invalid role rejected; valid role stored on caller profile | Role validator unit coverage exists; runtime endpoint blocked by CV-101 | Partial Pass | Depends on CV-BUG-101 | Pending integration retest |
| CV-103 | College onboarding | Valid college UUID + institution role creates scoped membership | Department normalization and API integration | Membership persisted with normalized department and caller user ID | Normalization covered; API runtime blocked by CV-101 | Partial Pass | Depends on CV-BUG-101 | Pending integration retest |
| CV-104 | Share-link lifecycle | Create/list/revoke/resolve obey college+department scope; expiry must be future; revoked/expired links unusable | Deterministic expiry tests; cross-department scope tests; lifecycle API integration | Invalid expiry rejected; department escape rejected; revoked/expired links rejected | Added deterministic expiry and department isolation unit tests; runtime integration still blocked by CV-101 | Partial Pass | Depends on CV-BUG-101 | Pending executable CI/API retest |
| CV-105 | College analytics | Analytics are tenant-scoped and aggregate-first | Contract check + two-college/two-department live isolation | No cross-tenant rows; aggregate metrics only | Aggregate contract check exists; live isolation not executable until route mount and test identities are available | Partial | Depends on CV-BUG-101 | Pending live Supabase retest |

## Changes in this run
- Exported `normalizeExpiry` with an injectable clock so expiry behavior can be tested deterministically.
- Exported `scopedDepartment` so department boundary enforcement has direct unit coverage.
- Added tests for invalid/equal/past expiry values and cross-department link creation attempts.
- No task is marked Done because root route mounting, build/typecheck execution, and live Supabase isolation evidence are still missing.

## Required next validation
1. Import and mount `registerInstitutionRoutes(app, requireSupabase())` in `server.ts` before Vite/static SPA middleware, guarded so startup behavior is explicit when Supabase is not configured.
2. Run `npm run lint`.
3. Run `npm test`.
4. Run `npm run build`.
5. Execute protected endpoint tests with valid and invalid Supabase sessions.
6. Execute two-college/two-department isolation tests for share links and analytics.
