# CareerVoice QA — Sprint 04

Branch: `feat/hourly-sprint-20260915-04`

| Task ID | Feature | Acceptance criteria | Test cases | Expected result | Actual result | Status | Bugs found | Retest status |
|---|---|---|---|---|---|---|---|---|
| CV-101 | Auth/session API guard | Bearer session resolved server-side and route reachable from main server | missing/invalid/valid bearer | 401/401/authenticated user | Handler exists; server test suite now included by npm test; main server mount still pending | Partial | `registerInstitutionRoutes` is not mounted in `server.ts` | Required |
| CV-102 | Role selection persistence | authenticated valid role persists | student/placement_team/college_management + invalid role | valid roles save; invalid 400 | Validation and handler covered by newly included domain/server suites | Partial pass | route not reachable until mount | Required |
| CV-103 | Institution onboarding | membership persists and department normalized | valid institution role; whitespace department; invalid role | normalized membership / 400 | Domain/server tests now part of default test command | Partial pass | live RLS tenant test pending | Required |
| CV-104 | Share links | create/list/revoke/resolve with active/expired/revoked rules | lifecycle cases | correct lifecycle and tenant scope | Domain/server tests now part of default test command | Partial pass | mounted API E2E + UI pending | Required |
| CV-105 | College analytics | college scoped aggregates without PII | tenant A/B and output contract | no cross-college rows; aggregate payload | Handler implemented; test harness included | Partial | live two-tenant Supabase test pending | Required |

## Changes this run

- Expanded `npm test` to execute `src/domain/*.test.ts` and `src/server/*.test.ts`, so institution onboarding and institution route tests can no longer silently sit outside CI/default local QA.
- Created a fresh isolated sprint branch from Sprint 03.
- Re-inspected `server.ts`: Express app is initialized directly in the root server and `registerInstitutionRoutes` is still not imported/mounted before Vite/static middleware.

## QA gate

No task is marked Done. The next code gate is mounting `registerInstitutionRoutes(app, supabase)` safely before SPA middleware, then build/typecheck/default test execution and two-college live RLS isolation verification.
