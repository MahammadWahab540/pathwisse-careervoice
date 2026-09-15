# CareerVoice QA Matrix — Sprint 11

Branch: `feat/hourly-sprint-20260915-11`
Selected tasks: CV-101, CV-102, CV-103, CV-104, CV-105

| Task ID | Feature | Acceptance criteria | Test cases | Expected result | Actual result | Status | Bugs found | Retest status |
|---|---|---|---|---|---|---|---|---|
| CV-101 | Auth/session + institution API runtime mount | Protected institution endpoints are mounted before SPA fallback and authenticate Supabase bearer sessions | Run `npm run dev` and `npm run build`; call protected endpoint with missing, invalid and valid bearer tokens | Route exists; 401 for missing/invalid token; valid session reaches handler | Added idempotent `scripts/ensure-institution-routes.mjs`; `predev` and `prebuild` now guarantee import + mount are inserted before runtime/build. Local executable validation unavailable because runtime cannot resolve GitHub to clone dependencies/source | Partial Pass | Runtime/API evidence still required | Pending |
| CV-102 | Role selection persistence | Authenticated user can persist an allowed account role; invalid role rejected | POST role endpoint with valid/invalid roles and verify `profiles.account_role` | Valid role persists; invalid role returns 400 | Handler/domain implementation already present; runtime mount path now enforced before dev/build | Partial Pass | No new defect this run | Pending |
| CV-103 | College membership onboarding | College/department membership is tenant scoped and malformed college IDs are rejected | Create/read membership for two colleges/departments | Correct membership returned; cross-tenant access denied | Existing scoped handler + DB/RLS foundation retained; runtime mount path now enforced | Partial Pass | Live two-tenant evidence outstanding | Pending |
| CV-104 | Share-link lifecycle | Authorized member can create/list/revoke links only in own scope; expiry/revoke enforced | Create/list/resolve/revoke; malformed/past expiry; cross-department attempt | Own-scope succeeds; invalid/expired/revoked/cross-scope rejected | Existing hardened handler/domain tests retained; runtime mount path now enforced | Partial Pass | End-to-end API evidence outstanding | Pending |
| CV-105 | College analytics isolation | Analytics uses college + department scope and report scores from `audit_reports` | Seed two colleges/departments and compare analytics responses | No cross-tenant leakage; readiness metrics use report scores | Existing corrected analytics implementation retained; runtime mount path now enforced | Partial Pass | Live isolation evidence outstanding | Pending |

## Changes in this run

- Added `scripts/ensure-institution-routes.mjs`, an idempotent source transform that inserts the institution router import and mounts it immediately after Express JSON middleware.
- Added `predev` and `prebuild` hooks so development and production builds cannot silently omit the institution API mount.
- Did not mark any task Done because executable build/API/live-Supabase evidence is still missing.

## Validation attempted

- Repository branch and previous sprint head verified through GitHub.
- `server.ts` anchors verified: Supabase import and Express JSON middleware are present.
- Local clone/build attempt failed before checkout because the execution runtime could not resolve `github.com`; this is environment/network evidence, not a product test failure.

## Next QA gate

1. Run `npm run lint`.
2. Run `npm test`.
3. Run `npm run build` and confirm prebuild modifies `server.ts` exactly once.
4. Start server and execute authenticated API tests for CV-101–CV-105.
5. Run two-college/two-department RLS and analytics isolation tests against SupabaseB2C-Voice.
6. Only then promote tasks from Partial Pass to Done.
