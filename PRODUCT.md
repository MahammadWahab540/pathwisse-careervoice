# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Engineering and business students using Pathwisse to understand career direction, prove readiness, and decide what to improve next. The primary situation is a mobile-first guided career audit where the student may not know which role fits their branch or evidence.

## Product Purpose

Pathwisse CareerVoice helps a student move from uncertainty to a specific career direction, then audits demonstrated readiness against role expectations and produces a prioritized action plan.

## Positioning

Pathwisse combines conversational career discovery, evidence-led readiness auditing, role comparison, and next-action planning in one guided journey rather than giving generic career suggestions.

## Operating Context

The core journey is UNDERSTAND → GUIDE → COMPARE → CHOOSE → AUDIT → DIAGNOSE → REPORT. The learning journey is PRIORITIZE → LEARN → PRACTICE → BUILD → PROVE → IMPROVE.

## Capabilities and Constraints

Preserve existing authentication, profile sync, Supabase-backed career catalog, branch-aware discovery, role recommendations, audit session flow, evidence capture, report generation, and roadmap handoff behavior. User-facing UI must not expose internal implementation terms, IDs, database names, schema details, or backend provider names.

## Brand Commitments

Use the official Pathwisse logo from `https://kwjoyovcstrkvpcildfu.supabase.co/storage/v1/object/public/avatars/223246dc-a793-48fb-8a7a-a5aac93b315a/1767343055146.png`. Follow the supplied Pathwisse design documentation: navy-led institutional palette, generous whitespace, Inter-style humanist typography, rounded cards, restrained accents, clear hierarchy, and purposeful motion.

## Evidence on Hand

Design system reference: `C:/Users/NxtWave/Downloads/pathwisse.com-DESIGN.md`. Existing app code and active CareerVoice flows live under `src/components/audit`.

## Product Principles

- Make the student's current state, next action, and value obvious on every screen.
- Ask branch-aware questions before recommending career directions.
- Let students switch branches or career families without blocking them.
- Score only what the student has actually shown.
- Translate every result into a concrete next action.

## Accessibility & Inclusion

Mobile-first responsive web experience with readable text, visible focus states, 44px touch targets, reduced-motion support, and non-technical recovery copy.
