# CareerVoice Product Contract (v2.0)
**Document Owner:** Agent A1 (Product Architecture & Information Architecture)  
**Approved by:** Agent A0 (Principal Product Engineer & Orchestrator)  
**Status:** Frozen & Canonical  

---

## 1. Product Boundary & Core Value Proposition

CareerVoice is the diagnostic wedge product by Pathwisse.

$$\text{CareerVoice Responsibility} = \textbf{Discover} \longrightarrow \textbf{Assess} \longrightarrow \textbf{Diagnose} \longrightarrow \textbf{Report}$$

### The CareerVoice Wedge:
1. **For Students:** Uncover true career direction, evaluate demonstrated skill signals against authentic industry benchmarks through an adaptive voice/text interview, and deliver a definitive diagnostic report.
2. **For Placement Teams:** Provide institutional cohort visibility, career direction mapping across branches, and evidence-backed diagnostic verification to target recruitment readiness.

### The Pathwisse Core Boundary (Strictly Non-Negotiable):
$$\text{Pathwisse Core Responsibility} = \textbf{Improve} \longrightarrow \textbf{Learn} \longrightarrow \textbf{Build} \longrightarrow \textbf{Prove}$$

CareerVoice identifies the diagnostic signal. Pathwisse Core handles the intervention and remediation.

| Capability | In CareerVoice? | In Pathwisse Core? |
|---|:---:|:---:|
| Career Direction & Role Discovery | **YES** | Refined in Core |
| Adaptive Diagnostic Assessment (Qalam) | **YES** | No |
| Evidence Ledger & Signal Scoring | **YES** | Continuous validation |
| Diagnostic Report & Career Clarity | **YES** | Consumed as starting baseline |
| Placement Campaign Management (`/invite/:token`) | **YES** | No |
| Cohort Skill Gaps & Strengths Overview | **YES** | Targeted batch cohort tracks |
| 6-Week Learning Roadmaps | **NO** | **YES** |
| Skill Remediation & Learning Modules | **NO** | **YES** |
| Enterprise Projects & Code Sandboxes | **NO** | **YES** |
| Placement Drives & Job Prep Workflows | **NO** | **YES** |
| Core Eligibility Workflows & Gating | **NO** | **YES** |

CareerVoice result and student pages conclude with a single, clear, high-intent call to action:  
`Continue with Pathwisse →`

---

## 2. Canonical User Journeys

### Journey 1: Independent Student (Organic / Direct)
1. **Landing / Login** (`/login`):
   - Authenticates via Mobile Phone OTP (WhatsApp/SMS) or Email / Google OAuth.
2. **Role Gate** (`/onboarding/role`):
   - Selects "Student".
3. **Student Profile Setup** (`/onboarding/student`):
   - Collects Name, College / Institution, Department / Branch, Graduation Year.
   - Saves to `profiles` with `account_role = 'student'` and sets `onboarding_completed_at`.
4. **Student Home** (`/student`):
   - Displays student identity, active career direction, past assessment report (if completed), or CTA to begin CareerVoice Assessment.
5. **CareerVoice Assessment** (`/student/assessment`):
   - Simplified 4-stage mental model:
     1. **About You** (Contextual verification)
     2. **Career Direction** (Discovery & Role Target selection)
     3. **CareerVoice** (Adaptive Qalam interview + evidence upload)
     4. **Your Result** (Real-time evaluation & diagnostic generation)
6. **CareerVoice Result** (`/student/result/:assessmentId`):
   - Single unified diagnostic report:
     - Career Direction
     - Overall CareerVoice Signal score (0–100) & Hiring Benchmark Distance
     - Top Observed Strengths
     - Areas Requiring Attention
     - Evidence Considered (Answers, Resume, GitHub, Portfolios)
     - Evidence Coverage & Diagnostic Confidence
   - Primary CTA: `Continue with Pathwisse →` (deep-link to Pathwisse Core).

---

### Journey 2: College-Invited Student (Campaign Token Flow)
1. **Campaign Link Access** (`/invite/:token`):
   - Secure token resolution validates campaign status, institution ID, department, batch, and expiry.
   - **Crucial Rule:** Does NOT trust user-editable query parameters (`?college=...&batch=...`). All institutional metadata is resolved securely from the database.
2. **Authentication** (`/login` with stored invite context):
   - Pre-binds student identity to the resolved campaign.
   - Completely bypasses general role selection (`/onboarding/role`).
3. **Tailored Student Onboarding** (`/onboarding/student`):
   - Institutional context (University, Placement Cell, Department, Batch Year) is pre-populated and locked.
   - Collects only missing student information (e.g. Full Name, Roll Number, Phone).
4. **Assessment & Diagnostic Report**:
   - Flows directly to `/student/assessment` and produces the CareerVoice result.
   - Automatically attributes the assessment result to the College Placement Campaign.

---

### Journey 3: Placement Team (Institutional Partner)
1. **Authentication** (`/login`):
   - Officer logs in via phone OTP or institutional email.
2. **Role Selection** (`/onboarding/role`):
   - Selects "Placement Team".
3. **Institutional Workspace Setup** (`/onboarding/placement`):
   - Configures University name, Placement Cell title, Officer Name, Officer Email, Target Batch.
   - Persists workspace context to Supabase.
4. **Placement Command Center** (`/placement`):
   - Institutional Overview: Cohort participation rate, total invited, assessments started, assessments completed, average readiness score, top career directions.
5. **Campaign Management** (`/placement/campaigns`):
   - Views active and past campaigns.
   - Creates new campaigns (`/placement/campaigns/new`) for specific branches and batches.
   - Instant 1-click share: Copy link, WhatsApp broadcast format, QR code modal.
   - Tracks live per-campaign funnel: Invited $\to$ Started $\to$ Completed $\to$ Completion Rate %.
6. **Student Roster** (`/placement/students`):
   - Filterable, searchable student list with real assessment status badges.
   - Action: `View Student` (navigates to `/placement/students/:studentId`).
7. **CareerVoice Diagnostic Reports** (`/placement/reports` & `/placement/reports/:reportId`):
   - Full diagnostic audit review per student.
8. **Cohort Insights** (`/placement/insights`):
   - Purely descriptive cohort intelligence: Career direction breakdown, role interest distribution, common strengths, areas requiring attention, cross-department comparison.
   - **No remediation programs or learning roadmaps.**
9. **External Pathwisse Core Entry**:
   - Sidebar item `Pathwisse Core ↗` linking to Pathwisse enterprise services.

---

## 3. Route Architecture & RBAC Permissions

| Route | Role Access | Layout | Description |
|---|---|---|---|
| `/login` | Public / Guest | `AuthLayout` | Phone OTP & Email/Google login |
| `/verify` | Public / Guest | `AuthLayout` | OTP token confirmation |
| `/invite/:token` | Public / Guest | `AuthLayout` | Resolves campaign, stores context, redirects to auth/onboarding |
| `/onboarding/role` | Authenticated | `AuthLayout` | Role selector (Student vs Placement Team) |
| `/onboarding/student` | Authenticated (Student) | `AuthLayout` | Profile setup for independent or invited students |
| `/onboarding/placement`| Authenticated (Placement) | `AuthLayout` | Institutional placement workspace setup |
| `/student` | Student | `StudentLayout` | Student Hub: status, target role, launch/resume assessment |
| `/student/assessment` | Student | `StudentLayout` | 4-step CareerVoice assessment (About $\to$ Direction $\to$ Voice $\to$ Result) |
| `/student/result/:assessmentId` | Student | `StudentLayout` | Unified CareerVoice diagnostic report + `Continue with Pathwisse` |
| `/placement` | Placement Team | `PlacementLayout` | Placement cohort overview & executive metrics |
| `/placement/campaigns` | Placement Team | `PlacementLayout` | Active campaign list & invitation analytics |
| `/placement/campaigns/new` | Placement Team | `PlacementLayout` | Create campaign with targeted branch & batch |
| `/placement/campaigns/:campaignId` | Placement Team | `PlacementLayout` | Campaign drilldown & student list |
| `/placement/students` | Placement Team | `PlacementLayout` | Student roster with live status & career direction |
| `/placement/students/:studentId` | Placement Team | `PlacementLayout` | Individual student diagnostic profile |
| `/placement/reports` | Placement Team | `PlacementLayout` | Complete archive of student reports |
| `/placement/reports/:reportId` | Placement Team | `PlacementLayout` | Detailed report inspect view |
| `/placement/insights` | Placement Team | `PlacementLayout` | Cohort-wide career direction & skill gap analytics |
| `/placement/messages` | Placement Team | `PlacementLayout` | Student cohort communication center |
| `/placement/settings` | Placement Team | `PlacementLayout` | Placement cell profile & workspace settings |
| `/unauthorized` | Any Authenticated | `AuthLayout` | Access denied for incorrect role |
| `/404` | Public | `AuthLayout` | Not found fallback |

---

## 4. Terminology Standards

To eliminate ambiguity across UI, documentation, and APIs, all agents must adhere to:

- **Use:** `CareerVoice`, `CareerVoice Assessment`, `CareerVoice Report`, `Campaign`, `Student`, `Placement Team`, `View Student`, `Career Direction`, `Career Signal`.
- **Avoid:** `Audit`, `Technical Audit`, `Readiness Audit`, `Diagnostic Audit`, `CareerVoice Links`, `Inspect`, `Core Eligibility`, `Core Learning`, `Network Projects`.
