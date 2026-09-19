# Original User Request

## 2026-09-17T10:45:18Z

Restructure CareerVoice into a production-quality Student + Placement Team application, preserving existing assessment intelligence, adaptive voice/text flow, Supabase database persistence, evidence engine, and report generation, while separating the CareerVoice diagnostic wedge from Pathwisse Core learning remediation.

Working directory: c:\Users\NxtWave\Documents\antigravity\mysterious-newton
Integration Branch: feature/careervoice-v2
Integrity mode: development

## Product Boundary (Non-Negotiable)

- CareerVoice Wedge: Discover → Assess → Diagnose → Report (Career direction, adaptive Qalam assessment, evidence ledger, single diagnostic report, placement campaigns).
- Pathwisse Core: Improve → Learn → Build → Prove (6-week roadmaps, skill remediation, learning modules, practice systems, enterprise projects, placement drives, Core eligibility).
- Result pages conclude with a single call to action: Continue with Pathwisse →.

## Requirements

### R1. Routing & Architectural Foundation
Replace the everything-on-/ state architecture with a clean client-side React Router (react-router-dom):
- /login, /verify, /invite/:token
- /onboarding/role, /onboarding/student, /onboarding/placement
- /student, /student/assessment, /student/result/:assessmentId
- /placement, /placement/campaigns, /placement/campaigns/new, /placement/campaigns/:campaignId
- /placement/students, /placement/students/:studentId
- /placement/reports, /placement/reports/:reportId
- /placement/insights, /placement/messages, /placement/settings
- /unauthorized, /404
Implement role-based route guards, deep-linking, refresh-safe session recovery, and unauthorized fallbacks.

### R2. Design System & Shared Layouts
Enforce a unified visual design system based on the warm editorial aesthetic (#f6f0e7 ambient cream, #fffdf9 card panel, #f57c00 orange accent, #0f172a/#1f3861 navy data surfaces, 16px/22px border radius, soft shadows):
- Reusable primitives in src/components/ui/: Button, Input, Select, Card, Table, Badge, Modal, EmptyState, LoadingState, ErrorState.
- Shared layouts: src/layouts/AuthLayout.tsx, src/layouts/StudentLayout.tsx, src/layouts/PlacementLayout.tsx.
- Strictly no random page-level hex colors or rogue buttons/cards.

### R3. Authentication & Secure Invitation System
- Mobile Phone OTP (WhatsApp/SMS) and Email auth with Supabase session recovery.
- Full logout revoking server tokens and clearing all storage keys.
- /invite/:token resolves securely on the server (GET /api/invite/:token) returning institution, campaign, batch, department, year, status, and expiry.
- Invited students do not go through general role selection; their institutional context is pre-populated and locked.
- Never trust client-editable query parameters (?college=...&batch=...).

### R4. Student Experience
- Simplify user-facing journey to 4 stages: 1. About You, 2. Career Direction, 3. CareerVoice, 4. Your Result.
- Preserve existing working intelligence: Career Discovery, Role Discovery, Adaptive Interview (Qalam), Evidence Upload, and Processing.
- Single unified CareerVoice Report: Career Direction, Signal Score, Top Strengths, Areas Requiring Attention, Evidence Considered, Confidence.
- Single Primary CTA: Continue with Pathwisse →. No learning LMS or detailed roadmap in CareerVoice.

### R5. Placement Team Experience
- Navigation: Overview, Campaigns, Students, Reports, Insights, Messages, Settings + Pathwisse Core ↗.
- Remove Eligible Students, Core Learning, Network Projects.
- Rename "CareerVoice Links" to "Campaigns". Support campaign creation, unique invite URLs, WhatsApp share, QR code modal, and funnel metrics (Invited → Started → Completed → Completion %).
- Rename "Inspect" to "View Student".
- Descriptive Cohort Insights: Role interest distribution, career clarity, evidence coverage, common strengths, areas requiring attention, cross-department comparison. No remediation programs.

## Acceptance Criteria

### Automated Tests & Quality Gates
- [ ] TypeScript check (bun run lint / tsc --noEmit) passes with 0 errors.
- [ ] Production build (bun run build) compiles Vite and Node server with 0 errors.
- [ ] Existing 71 automated test suites pass without regressions (bun run test).
- [ ] New unit and integration tests added for:
  - Route guards and role protection (Student cannot access /placement/*, unauthenticated redirected to /login).
  - Secure /invite/:token resolution (returns 404/expired for invalid tokens, resolves valid campaign metadata).
  - Campaign creation and invitation link generation.

### End-to-End Journeys Verified
- [ ] Journey A (Independent Student): /login → /onboarding/role → /onboarding/student → /student → /student/assessment → /student/result/:id with Continue with Pathwisse →.
- [ ] Journey B (Placement Officer): /login → /onboarding/placement → /placement → /placement/campaigns/new → generate unique /invite/:token → copy / WhatsApp share.
- [ ] Journey C (Invited Student): Access /invite/:token → login → context auto-filled → direct assessment → diagnostic result without role selection prompt.
- [ ] Journey D (Placement Officer Analytics): /placement/students → "View Student" → detailed report → /placement/insights showing descriptive cohort charts without learning LMS.

## 2026-09-18T09:51:00Z

# Teamwork Project Prompt — CareerVoice Product Redesign

Completely redesign the CareerVoice product from end to end so it feels like a native, premium, editorial extension of pathwisse.com, preserving all existing functionality, routes, backend APIs, business logic, permissions, and data flows while replacing the visual system entirely.

Working directory: c:\Users\NxtWave\Documents\antigravity\mysterious-newton
Integrity mode: development
Design Skills Enabled: brandkit, industrial-brutalist-ui, gpt-taste, image-to-code, imagegen-frontend-mobile, imagegen-frontend-web, minimalist-ui, full-output-enforcement, redesign-existing-projects, high-end-visual-design, stitch-design-taste, design-taste-frontend, design-taste-frontend-v1

## Team Topology & Orchestration

The task will be executed using a coordinated multi-agent design and frontend swarm:

- Agent 1 — Product Audit: Comprehensive inventory of all routes, layouts, shared components, tables, forms, modals, error/empty states, and inconsistent/duplicated patterns.
- Agent 2 — Pathwisse Brand Extraction: Extraction of canonical visual language (typography, scale, colors, spacing, borders, shadows, icons, interaction principles) matching pathwisse.com.
- Agent 3 — Reusable UI Design System: Production of unified primitive components (Button, Input, Select, Checkbox, Radio, Tabs, Badge, Tooltip, Modal, Drawer, Dropdown, Table, Card, EmptyState, Skeleton, Toast, Pagination, PageShell, Header, Sidebar).
- Agent 4 — UX & Information Architecture: Information hierarchy polish, CTA prioritization, form progression, empty states, and desktop/mobile usability.
- Agent 5 — Desktop Redesign: Screen-by-screen desktop transformation prioritizing whitespace, typographic contrast, restrained surfaces, and editorial clarity.
- Agent 6 — Mobile / Responsive Redesign: Dedicated mobile-first responsive redesigns (not shrunk desktop UI) for drawer navigation, tables, cards, and modal flows.
- Agent 7 — Visual Quality Director: Strict anti-slop review using gpt-taste, high-end-visual-design, minimalist-ui, and stitch-design-taste to reject generic SaaS templates, over-carding, and visual clutter.
- Agent 8 — Frontend Implementation: Complete codebase implementation replacing old styles without leaving legacy visual artifacts behind.
- Agent 9 — QA & Regression: Comprehensive verification of routing, API interactions, forms, keyboard/focus accessibility, automated test suites, and production build.

## Requirements

### R1. Product Audit & Legacy Component Inventory
Audit the entire application across all routes (/login, /onboarding/*, /student/*, /placement/*, /invite/:token), documenting every page, dialog, input, card, badge, and table state to ensure complete coverage with zero forgotten views.

### R2. Pathwisse Brand Tokens & Theme System
Establish canonical design tokens inspired by pathwisse.com:
- Typography: Editorial, disciplined type scale with high legibility.
- Palette: Warm, restrained backgrounds, crisp dark text, intentional accent color, muted borders.
- Elevation & Radius: Subtle border depth, restrained shadows, clean consistent border radii.
- Principles: Whitespace over containers, typography over decoration, hierarchy over borders.

### R3. Reusable Primitive Component Library
Build or refactor the shared component library in src/components/ui/ with comprehensive state coverage (default, hover, active, focus-visible, disabled, loading, success, error, empty). Eliminate fragmented, one-off button and card implementations.

### R4. Complete Desktop & Mobile Screen Redesign
Redesign all authenticated and unauthenticated surfaces:
1. Auth & Onboarding: /login, /onboarding/role, /onboarding/student, /onboarding/placement.
2. Student Experience: /student (Student Hub), /student/assessment (Adaptive Qalam Interview, Waveform, Evidence upload), diagnostic report views.
3. Placement Command Center: /placement (Overview Control Room), /placement/campaigns, /placement/campaigns/new, /placement/students, /placement/reports, /placement/insights, /placement/messages, /placement/settings.
4. Public & Invite Gates: /invite/:token.

### R5. Non-Negotiable Preservation of Functionality & Zero Regressions
- Retain all backend integrations (server.ts, Supabase persistence, Gemini evaluation, audio/speech engine).
- Preserve existing routing logic, route guards (AuthGuard, StudentGuard, PlacementGuard, RootRedirect), query params, and redirect behaviors.
- Enforce full-output-enforcement: no placeholder code, truncated files, or skipped screens.

## Acceptance Criteria

### Automated Tests & Code Quality
- [ ] bun run test passes 82/82 tests with 0 regressions.
- [ ] TypeScript check (bun run lint / tsc --noEmit) passes with 0 errors.
- [ ] Production build (bun run build) compiles Vite assets and server bundle cleanly.

### Visual & Architectural Quality Gates
- [ ] The visual system feels native to pathwisse.com: restrained, editorial, premium, and free of generic SaaS templates.
- [ ] No over-carding (cards inside cards inside cards), unneeded gradients, or high-contrast drop-shadows.
- [ ] Complete responsive parity across mobile (375px), tablet (768px), and desktop (1280px, 1440px).
- [ ] Every form, button, and interactive input has visible focus, hover, disabled, and active states.
- [ ] All 10+ routes and modal surfaces updated without leaving legacy #f6f0e7 or outdated cards behind.
