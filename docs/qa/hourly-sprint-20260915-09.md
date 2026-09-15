# CareerVoice Hourly Sprint 09 QA

| Task ID | Feature | Acceptance Criteria | Test Case | Expected Result | Actual Result | Status | Bugs Found | Retest Status |
|---|---|---|---|---|---|---|---|---|
| CV-101 | Auth/session + institution route bootstrap | Institution endpoints are mounted before SPA fallback and bearer sessions are validated | Call protected institution endpoint with valid/invalid bearer token | Valid session reaches handler; invalid session returns 401 | `authenticateInstitutionRequest` validates Supabase bearer tokens, but root `server.ts` still does not mount `registerInstitutionRoutes` | BLOCKED | Router exists but is not mounted in root Express app | Required |
| CV-102 | Role selection persistence | Supported account role persists to `profiles.account_role` | POST supported and unsupported account roles | Supported role persists; unsupported role returns 400 | Handler and DB column present; runtime route unavailable until CV-101 mount | PARTIAL PASS | Runtime integration blocked by CV-101 | Required |
| CV-103 | Institution membership | Placement/management membership persists with college + department scope | POST valid UUID/role/department and invalid college UUID | Valid membership persists; malformed college rejected | Handler validation and `college_memberships` table verified; runtime route unavailable until CV-101 mount | PARTIAL PASS | Runtime integration blocked by CV-101 | Required |
| CV-104 | Share-link lifecycle | Authenticated member can create/list/revoke scoped links; public resolver rejects expired/revoked links | Create/list/revoke/resolve links across department boundaries | No cross-department access; invalid links rejected | Handler/domain guards present and database table/policies verified; runtime route unavailable until CV-101 mount | PARTIAL PASS | Runtime integration blocked by CV-101 | Required |
| CV-105 | College analytics | Analytics query uses existing schema and remains college/department scoped | Query sessions and readiness scores for scoped membership | No missing-column error; scores come from reports; no cross-tenant leakage | Fixed schema defect: `audit_sessions` has no `overall_score`; handler now loads `audit_reports.overall_score` by `session_id`. Live DB schema verified | PARTIAL PASS | Root router mount and authenticated E2E isolation still pending | Required |

## Evidence from this run

- Production Supabase contains `profiles`, `college_memberships`, `career_voice_share_links`, and `audit_sessions` attribution columns (`college_id`, `department`, `share_link_id`).
- Production schema check proved `audit_sessions.overall_score` does not exist.
- Production schema check proved `audit_reports.session_id` and `audit_reports.overall_score` exist.
- CV-105 server handler was corrected to fetch scoped sessions first and then load report scores by session ID.
- Existing RLS was inspected: audit sessions are user-owned; membership and share-link policies exist. Department isolation is additionally enforced by server queries.

## Exit gate

Do not mark CV-101 through CV-105 Done until the institution router is mounted, lint/tests/build execute successfully, and authenticated two-college/two-department E2E isolation tests produce evidence.
