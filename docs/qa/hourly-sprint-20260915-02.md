# CareerVoice QA Sheet — Sprint 2026-09-15-02

| Task ID | Feature | Acceptance Criteria | Test Case | Expected Result | Actual Result | Status | Bugs Found | Retest Status |
|---|---|---|---|---|---|---|---|---|
| CV-101 | Auth/session bootstrap | Refresh restores auth; protected institution APIs reject anonymous users | Review browser auth bootstrap and protected API requirement | Persistent Supabase session exists; server auth guard required | Browser client already persists/refreshes session; no institution server routes yet | PARTIAL | Server-side auth guard still missing | PENDING |
| CV-102 | Role-aware onboarding | Only student/placement_team/college_management accepted; client can persist role | Domain validation rejects unknown role; API client exposes role save | Invalid role rejected before server persistence | Domain validator + typed client API added | PARTIAL PASS | Server endpoint/UI pending | UNIT TEST ADDED |
| CV-103 | Institution onboarding | Placement/management membership only; department normalized; duplicate membership idempotent | Validate role and department inputs; client request shape | Student rejected; department bounded; typed membership returned | Domain validation + client API added; DB uniqueness/RLS from sprint 01 | PARTIAL PASS | Server endpoint/UI and live idempotency test pending | UNIT TEST ADDED |
| CV-104 | Shareable links | Active/non-expired links usable; revoke/expiry honored; dashboard CRUD client available | Test lifecycle helper; inspect typed list/create/revoke/resolve API client | Revoked/expired links rejected | Lifecycle tests + share-link client APIs added | PARTIAL PASS | Server endpoints/dashboard UI pending | UNIT TEST ADDED |
| CV-105 | Attribution & analytics | Tenant-safe analytics endpoint and attribution from share link | Inspect analytics client and DB attribution foundation | Client can request aggregate analytics without exposing raw cross-tenant data | Typed analytics client added; DB attribution exists from sprint 01 | PARTIAL | Server aggregate query + tenant isolation integration tests pending | PENDING |

## Evidence

- Added `src/api/institution.ts` for role, institution membership, share-link lifecycle and college analytics contracts.
- Added `src/domain/institutionOnboarding.ts` with role/department/link-lifecycle validation.
- Added `src/domain/institutionOnboarding.test.ts` with four unit-test groups.
- Existing `src/lib/supabaseBrowser.ts` already configures `persistSession`, `autoRefreshToken`, and `detectSessionInUrl`.
- Sprint 01 migration remains the database foundation for CV-102..CV-105.

## Release gate

Do not mark CV-101..CV-105 Done. This batch establishes typed frontend contracts and testable domain rules, but server endpoints, UI wiring, and live tenant-isolation QA are still required.
