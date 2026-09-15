# CareerVoice QA Sheet — Sprint 2026-09-15-01

| Task ID | Feature | Acceptance Criteria | Test Case | Expected Result | Actual Result | Status | Bugs Found | Retest Status |
|---|---|---|---|---|---|---|---|---|
| CV-101 | Auth/session bootstrap | Refresh restores auth; protected routes reject anonymous users; profile sync idempotent | Refresh authenticated session and attempt anonymous dashboard access | Session restored; anonymous access denied | Existing auth stack identified; no frontend change in this batch | BLOCKED | Frontend implementation pending | NOT RUN |
| CV-102 | Role-aware onboarding | Persist student/placement_team/college_management role; invalid role rejected | Inspect DB constraint and attempt valid/invalid role writes in authenticated QA | Valid roles accepted; invalid role rejected | `profiles.account_role` and DB check constraint deployed | PARTIAL PASS | UI/API persistence pending | DB PASS |
| CV-103 | Institution onboarding | Membership tied to user+college; duplicate idempotent; tenant access restricted | Verify table, unique constraint, RLS enabled | Membership schema exists with unique identity and RLS | `college_memberships` deployed with RLS and indexes | PARTIAL PASS | Update/delete policies and UI/API pending | DB PASS |
| CV-104 | Shareable links | Non-guessable token; college attribution; active/revoked/expired states; member-only creation | Verify token default/unique, status constraint and RLS | UUID token and lifecycle constraints enforced | `career_voice_share_links` deployed with member select/insert RLS | PARTIAL PASS | API validation, revoke flow and dashboard UI pending | DB PASS |
| CV-105 | Session attribution & analytics | Audit session retains link/college/department/campaign; tenant-safe analytics | Verify attribution columns/FKs/indexes | Attribution columns exist and are queryable | `audit_sessions` attribution fields deployed | PARTIAL PASS | Analytics endpoint/UI and tenant isolation tests pending | DB PASS |

## Database validation evidence

Executed schema validation after migration. Confirmed `college_memberships` and `career_voice_share_links` exist, `profiles.account_role` exists, and `audit_sessions.share_link_id` exists.

## Release gate

Do not mark CV-101..CV-105 Done yet. Database foundation is deployed for CV-102..CV-105, but frontend/server integration and full QA remain incomplete.