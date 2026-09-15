# CareerVoice Hourly Sprint 15 QA

Branch: `feat/hourly-sprint-20260916-15`
Base: Sprint 14 `66627a618766ed6acd64f3f18be6195e57229b5f`
Selected tasks: CV-101, CV-102, CV-103, CV-104, CV-105

## Evidence collected this run
Live SupabaseB2C-Voice schema/data inspection was executed without mutating production data.

- `profiles`: 11 rows; `account_role` exists and is nullable text.
- `college_memberships`: 0 rows.
- `career_voice_share_links`: 0 rows.
- `audit_sessions`: 13 rows; attribution columns `share_link_id`, `college_id`, `department`, and `campaign_key` exist.
- `audit_reports`: 3 rows; `overall_score` exists on this table and is keyed by `session_id`.
- RLS inspection confirms own-user policies for profiles/audit data and membership-based policies for share links.

## QA matrix
| Task ID | Feature | Acceptance criteria | Test cases / evidence | Expected result | Actual result | Status | Bugs found | Retest status |
|---|---|---|---|---|---|---|---|---|
| CV-101 | Institution API runtime mount | Mounted route accepts authenticated Supabase session | Sprint 14 green CI + live schema/RLS inspection | Build/mount green and authenticated request succeeds | CI/build evidence exists; no safe authenticated test identity/token available in this run | Partial Pass | None new | Authenticated endpoint smoke test pending |
| CV-102 | Role selection/persistence | Supported role persists to authenticated user's profile | Verified live `profiles.account_role` column and own-user INSERT/UPDATE/SELECT RLS | Role can be persisted only for caller's profile | Schema and RLS prerequisites confirmed; no authenticated write executed | Partial Pass | None new | Authenticated role write/read E2E pending |
| CV-103 | College onboarding/membership | Membership creation/read is isolated to authorized user/college | Verified `college_memberships` schema and own-user INSERT/SELECT policies | User can only create/read own membership | Schema/RLS confirmed, but table currently has 0 rows so two-college isolation cannot be evidenced without fixtures | Partial Pass | Test-data gap: no memberships | Two-user/two-college fixture E2E pending |
| CV-104 | Placement share links | Create/list/revoke/resolve obey membership, tenant, department and lifecycle rules | Verified share-link schema and membership-based SELECT/INSERT RLS | Authorized member lifecycle works and cross-tenant access fails | Schema/RLS confirmed, but table currently has 0 rows and no authenticated fixture exists | Partial Pass | Test-data gap: no share links | Authenticated lifecycle fixture E2E pending |
| CV-105 | College analytics | Analytics reads scoped sessions and report scores without cross-tenant/department leakage | Verified 13 sessions, 3 reports, session attribution columns, and `audit_reports.overall_score` | Aggregation uses report score joined by session and honors college/department | Live schema supports implementation; current sessions cannot prove two-college/two-department isolation without controlled memberships/fixtures | Partial Pass | Test-data gap for isolation proof | Controlled two-college/two-department E2E pending |

## QA gate
No task is marked Done. This run adds live production-schema/RLS evidence, but authenticated E2E cannot be truthfully completed without safe QA identities/tokens and controlled college fixtures. Production data was not modified merely to manufacture test evidence.

## Next recommended tasks
1. CV-101 execute authenticated `/api/institution/*` smoke test using a dedicated QA identity.
2. CV-102 persist/read `account_role` with that identity and verify another identity cannot modify it.
3. CV-103 seed two QA colleges + memberships through the supported application path and verify cross-college isolation.
4. CV-104 create/list/revoke/resolve QA share links for both colleges/departments and verify denial boundaries.
5. CV-105 create attributable QA audit sessions/reports and compare endpoint aggregates against direct scoped SQL, then clean up QA fixtures.
