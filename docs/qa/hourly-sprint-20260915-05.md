# CareerVoice QA — Sprint 05

Branch: `feat/hourly-sprint-20260915-05`
Tasks: CV-101, CV-102, CV-103, CV-104, CV-105

| Task ID | Feature | Acceptance Criteria | Test Case | Expected Result | Actual Result | Status | Bugs Found | Retest Status |
|---|---|---|---|---|---|---|---|---|
| CV-101 | Auth/session bootstrap | Institution APIs reject missing/invalid bearer sessions | Call protected route without bearer token and with invalid token | 401 with stable auth error code | Auth guard implemented; route mount into root server still pending | Partial | Root `server.ts` does not yet mount `registerInstitutionRoutes` | Pending |
| CV-102 | Role selection persistence | Only supported account roles persist for authenticated user | Submit student, placement_team, college_management and unsupported role | Supported roles save; unsupported role returns 400 | Validation and persistence implemented; UI wiring pending | Partial Pass | UI not wired | Pending |
| CV-103 | College onboarding | Institution membership requires UUID college and institution role | Submit invalid college id, valid college id, student role | Invalid input 400; valid institution membership persists | UUID + role validation added; database persistence handler exists | Partial Pass | UI not wired; live DB test pending | Pending |
| CV-104 | Share links | Links are tenant/department scoped and revoked/expired links cannot resolve | Department member lists/creates/revokes links outside department; resolve expired/revoked token | Cross-department access blocked; invalid links return 404 | Department scoping added to list/create/revoke; shared usability rule used for resolve | Partial Pass | Live two-tenant API test pending | Pending |
| CV-105 | College analytics | Analytics cannot cross college or department boundary | Compare analytics for two colleges and two departments | Each identity sees only its permitted aggregate | College + department filters implemented in handler | Partial | Live two-tenant isolation evidence pending | Pending |

## Changes in this run

- Hardened institution membership input with UUID validation.
- Changed membership lookup to deterministic first membership rather than failing on multiple rows.
- Added department scoping to share-link list, create, revoke and analytics queries.
- Reused the domain `shareLinkIsUsable` rule for public token resolution.
- Preserved explicit 403 for department-scope violations.

## Validation evidence

Static code inspection completed against the branch. No CI/workflow execution was available from this connector run, so build, TypeScript, API integration, and live Supabase results are intentionally not claimed as passing.

## Blocking item

`registerInstitutionRoutes(app, supabase)` still must be mounted in the root Express server before SPA/Vite fallback middleware. Because `server.ts` is a very large file and the repository connector only supports whole-file replacement, this run avoided a high-risk blind rewrite. The next safe execution should mount it using a checked-out workspace/patch-capable coding environment, then run `npm run lint`, `npm test`, `npm run build`, and two-tenant Supabase integration tests.
