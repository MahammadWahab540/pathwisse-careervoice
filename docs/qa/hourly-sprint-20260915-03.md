# CareerVoice QA — Sprint 03

Branch: `feat/hourly-sprint-20260915-03`

| Task ID | Feature | Acceptance criteria | Test cases | Expected result | Actual result | Status | Bugs found | Retest status |
|---|---|---|---|---|---|---|---|---|
| CV-101 | Auth/session API guard | Bearer session resolved server-side; missing/invalid session rejected | No bearer; invalid bearer; valid Supabase JWT | 401/401/authenticated user id | Handler implemented in `institutionRoutes.ts`; route mounting pending | Partial | Server route registration not yet mounted in `server.ts` | Required |
| CV-102 | Role selection persistence | Only student/placement_team/college_management; authenticated profile upsert | Valid roles + invalid admin | Valid roles accepted, invalid rejected | Domain validation + authenticated handler implemented | Partial pass | UI + mounted route E2E pending | Required |
| CV-103 | Institution onboarding | Institution role only; department normalized; membership scoped to auth user | whitespace department; empty department; invalid membership | normalized/null/400 | Domain validation + membership upsert handler implemented | Partial pass | Searchable college UI and live RLS tenant test pending | Required |
| CV-104 | Shareable links | crypto token; active/expired/revoked enforcement; tenant-scoped list/revoke | active future; revoked; expired | true/false/false | Resolver/create/list/revoke handlers implemented; domain test aligned | Partial pass | UI + mounted API E2E pending | Required |
| CV-105 | College analytics | college-scoped aggregate metrics; no phone/email fields | analytics output contract inspection | aggregate-first payload | Aggregate handler implemented with college filter and limited recent sessions | Partial pass | live tenant-isolation test and readiness column verification pending | Required |

## Validation evidence

- Existing branch carries Supabase schema/RLS migration from Sprint 01 and typed frontend contracts/domain tests from Sprint 02.
- Added server handlers for CV-101..105 in `src/server/institutionRoutes.ts`.
- Added security/domain contract tests in `src/server/institutionRoutes.test.ts`.
- Corrected test fixture to use the canonical `expires_at` domain field.
- `server.ts` was restored byte-for-byte after an unsafe route-wiring edit attempt; no placeholder code remains on the branch.

## QA gate

No task is Done. Next gate is to mount `registerInstitutionRoutes` safely in `server.ts`, include the new tests in the test script, run TypeScript/build/tests, then execute live Supabase tenant-isolation tests with two institution identities.
