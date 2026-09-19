# Project: CareerVoice Product Redesign

## Architecture
- **Platform**: CareerVoice (Diagnostic Intake Wedge) integrated seamlessly with Pathwisse (`pathwisse.com`).
- **Core Technology Stack**: React 19, TypeScript 5.8, Tailwind CSS v4, Framer Motion, Express/Node.js, Supabase, Gemini AI, Web Audio/Speech synthesis.
- **Visual Design Philosophy**: High-end editorial institutional aesthetic. Crisp slate canvas (`#f8fafc`), pure white surfaces (`#ffffff`), deep authoritative navy typography (`#0b111d`, `#1f3861`), refined burnt orange accents (`#ea580c`), precision modern radii (6px–12px), diffuse ambient shadows (`rgba(15, 23, 42, 0.04)`), whisper border hairlines (`#e2e8f0`).
- **Anti-Slop Strictures**: No cards-inside-cards, whitespace over container nesting, typography over decoration, single-line desktop navigation, elimination of all legacy `#f6f0e7` cream, yellow tints, and 40px blob radii.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Baseline Verification | Verify 82/82 automated tests, clean TypeScript lint, clean Vite & Node build | M1 | Survey (Agent 1) |
| 2 | Product & Route Audit | Exhaustive inventory of 18+ routes, views, states, and 26 `#f6f0e7` occurrences | M1 | Survey (Agent 1) |
| 3 | Pathwisse Brand Tokens | CSS custom properties & Tailwind v4 theme for canvas, navy, orange, semantic status, radii, shadows | M1 | Survey (Agent 2) |
| 4 | UI Primitives Suite | 20 reusable components in `src/components/ui/` with complete state matrices & ARIA compliance | M1 | Survey (Agent 3) |
| 5 | UX & Information Architecture | Streamlined page layouts, CTA hierarchy, modal flows, form progressions, responsive layouts | M2 | Request R4 (Agent 4) |
| 6 | Desktop Screen Redesign | Full screen-by-screen editorial redesign for Auth, Onboarding, Student, and Placement Command Center | M2 | Request R4 (Agent 5) |
| 7 | Mobile / Responsive Redesign | Dedicated mobile drawer navigation, responsive table cards, mobile modal flows, 375px–1440px parity | M2 | Request R4 (Agent 6) |
| 8 | Anti-Slop Visual Quality Review | Rigorous review against `gpt-taste`, `high-end-visual-design`, `minimalist-ui`, `stitch-design-taste` | M3 | Visual Quality (Agent 7) |
| 9 | Complete Codebase Implementation | Full replacement of legacy styles, components, and layouts; complete purge of `#f6f0e7` | M4 | Request R5 (Agent 8) |
| 10| Route & Deep-Link Parity | Implementation of `/student/result/:assessmentId`, `/placement/students/:studentId`, etc. | M4 | Request R1/R4 (Agent 8) |
| 11| QA & Automated Regression | Verifying 82/82 tests pass, 0 lint errors, clean build, end-to-end user journeys | M5 | Acceptance Criteria (Agent 9) |
| 12| Forensic Integrity Audit | Independent verification of genuine logic, zero hardcoding, zero facade implementations | M5 | Integrity Forensics (Auditor) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Survey, Brand Tokens & UI Primitives | Baseline verification (82/82 pass), route/legacy audit, brand tokens formalization, 20 UI primitive components spec | none | DONE |
| M2 | UX & Screen Redesign Specifications | UX & IA polish (Agent 4), Desktop Redesign Specs (Agent 5), Mobile / Responsive Redesign Specs (Agent 6) | M1 | DONE |
| M3 | Visual Quality Director Review | Anti-slop quality gate review & directives using design skills (Agent 7) | M2 | DONE |
| M4 | Frontend Implementation | Full codebase styling overhaul across all layouts, routes, pages, and components (Agent 8) | M3 | IN_PROGRESS |
| M5 | QA, Regression, Verification & Audit | Automated tests (82/82), lint (0 errors), build clean, forensic integrity audit, victory reporting | M4 | PLANNED |

## Interface Contracts

### 1. Design System Tokens Contract (`src/index.css` & CSS Variables)
- Canvas: `--pw-canvas: #f8fafc;`, `--pw-surface: #ffffff;`, `--pw-surface-hover: #f1f5f9;`
- Typography: `--pw-ink-primary: #0b111d;`, `--pw-ink-secondary: #334155;`, `--pw-ink-muted: #64748b;`
- Borders: `--pw-border-default: #e2e8f0;`, `--pw-border-subtle: #f1f5f9;`, `--pw-border-strong: #cbd5e1;`
- Navy Spectrum: `--pw-navy-900: #0b111d;`, `--pw-navy-700: #1f3861;`, `--pw-navy-100: #e8f0fa;`
- Orange Accent: `--pw-accent-primary: #ea580c;`, `--pw-accent-hover: #c2410c;`, `--pw-accent-soft: #fff7ed;`
- Radii: `--pw-radius-sm: 6px;`, `--pw-radius-md: 8px;`, `--pw-radius-lg: 10px;`, `--pw-radius-xl: 12px;`, `--pw-radius-2xl: 16px;`

### 2. UI Component Primitives Contract (`src/components/ui/`)
- Exported primitives: `Button`, `Input`, `Select`, `Checkbox`, `Radio`, `Tabs`, `Badge`, `Tooltip`, `Modal`, `Drawer`, `Dropdown`, `Table`, `Card`, `EmptyState`, `Skeleton`, `Toast`, `Pagination`, `PageShell`, `Header`, `Sidebar`.
- Each primitive provides full state variant coverage (`default`, `hover`, `active`, `focus-visible`, `disabled`, `loading`, `error`), WAI-ARIA roles, and keyboard navigation.

### 3. Routing & Layout Architecture
- `AuthLayout`: Clean unauthenticated shell with subtle header brand and centered editorial card.
- `StudentLayout`: Top navigation bar with student identity, active status badge, and content shell.
- `PlacementLayout`: Modern responsive sidebar, top control bar with institutional context, and content workspace.
- Route endpoints:
  - Auth: `/login`, `/onboarding/role`, `/onboarding/student`, `/onboarding/placement`, `/invite/:token`
  - Student: `/student`, `/student/assessment`, `/student/result/:assessmentId`
  - Placement: `/placement`, `/placement/campaigns`, `/placement/campaigns/new`, `/placement/campaigns/:campaignId`, `/placement/students`, `/placement/students/:studentId`, `/placement/reports`, `/placement/reports/:reportId`, `/placement/insights`, `/placement/messages`, `/placement/settings`
  - Utility: `/unauthorized`, `/404`

## Code Layout
- `src/components/ui/` — 20 shared primitive UI components
- `src/layouts/` — AuthLayout, StudentLayout, PlacementLayout
- `src/pages/` — Page components for all authenticated & unauthenticated routes
- `src/components/audit/`, `src/components/student/`, `src/components/college/` — Domain-specific views updated to use UI primitives and token system
- `src/index.css` — Global CSS variables and Tailwind v4 theme definitions
- `src/router.tsx` — Client-side router configuration with role-based guards
