# Qalam Adaptive Tool UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add native Gemini tool calling that renders six typed, animated adaptive UI cards during Qalam audit conversations, Gemini Live sessions, and post-evaluation results.

**Architecture:** Keep Express and `@google/genai` as the only agent runtime. Share a TypeScript tool contract between server and browser, forward real Gemini function calls over HTTP/WebSocket, and render them through a small React registry. Existing audit/report components remain intact.

**Tech Stack:** TypeScript 5.8, React 19, Express, `@google/genai`, WebSocket, Framer Motion, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-08-22-qalam-adaptive-tool-ui-design.md`

## Global Constraints

- Preserve the existing voice waveform, qalamState transitions, audit stages, and report screens.
- Do not expose Gemini API keys to the browser.
- Do not invent readiness scores, gaps, or benchmark values in the UI layer.
- All six adaptive tools must be fully typed and mobile-friendly.
- Gemini Live and `/api/qalam/chat` must use the same tool names and schemas.

---

### Task 1: Shared tool contract

**Files:**
- Create: `src/ai/qalamTools.ts`
- Create: `src/ai/qalamTools.test.ts`

**Interfaces:**
- Produces: `QalamToolName`, `QalamToolCall`, tool argument types, `QALAM_TOOL_DECLARATIONS`, `normalizeQalamToolCall`, `buildAuditToolCalls`.

- [ ] **Step 1: Write failing tests** for accepting a valid readiness call, rejecting an unknown tool, normalizing gap severities, and generating evaluation-derived calls.
- [ ] **Step 2: Run the focused contract test and confirm it fails because `qalamTools.ts` does not exist.**
- [ ] **Step 3: Implement the minimum shared types, schemas, normalizer, merge id helpers, and evaluation mapper.**
- [ ] **Step 4: Re-run the focused test and confirm all assertions pass.**

### Task 2: Gemini server integration

**Files:**
- Modify: `server.ts`

**Interfaces:**
- Consumes: `QALAM_TOOL_DECLARATIONS`, `normalizeQalamToolCall`, `buildAuditToolCalls`.
- Produces: HTTP `toolCalls` arrays and WebSocket `toolCall` messages.

- [ ] **Step 1: Add shared tool declarations to Gemini Live config and update the Live system instruction with explicit tool-selection rules.**
- [ ] **Step 2: Forward Live function calls to the browser and accept `toolResult` messages that call `session.sendToolResponse`.**
- [ ] **Step 3: Update `/api/qalam/chat` to let Gemini select UI tools in AUTO mode, acknowledge selected calls, then return the existing chat JSON plus `toolCalls`.**
- [ ] **Step 4: Update `/api/qalam/evaluate` to append deterministic `toolCalls` built from evaluated data.**

### Task 3: Browser Live transport

**Files:**
- Modify: `src/hooks/useGeminiLive.ts`

**Interfaces:**
- Consumes: WebSocket `toolCall` messages.
- Produces: `onToolCall` callback and `sendToolResult(callId, name, result)`.

- [ ] **Step 1: Extend hook options with a typed `onToolCall` callback.**
- [ ] **Step 2: Parse `toolCall` messages without affecting audio/transcript handling.**
- [ ] **Step 3: Add `sendToolResult` and export it from the hook.**

### Task 4: Adaptive UI renderer registry

**Files:**
- Create: `src/components/adaptive-ui/AdaptiveToolSurface.tsx`
- Create: `src/components/adaptive-ui/SkillRadarCard.tsx`
- Create: `src/components/adaptive-ui/GapAnalysisCard.tsx`
- Create: `src/components/adaptive-ui/RoadmapCard.tsx`
- Create: `src/components/adaptive-ui/ReadinessScoreCard.tsx`
- Create: `src/components/adaptive-ui/CompetencyBenchmarkCard.tsx`
- Create: `src/components/adaptive-ui/EvidenceUploadRequestCard.tsx`

**Interfaces:**
- Consumes: `QalamToolCall[]`.
- Produces: animated mobile-first cards and `onRequestEvidence` action.

- [ ] **Step 1: Implement the renderer registry keyed by exact tool name.**
- [ ] **Step 2: Implement each card with semantic RED/ORANGE/GREEN presentation and no external chart package.**
- [ ] **Step 3: Add Framer Motion enter/update transitions and compact navigation between recent tool cards.**

### Task 5: Audit-flow wiring

**Files:**
- Modify: `src/components/audit/AdaptiveInterviewStep.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- `AdaptiveInterviewStepProps.onToolCalls(calls: QalamToolCall[]): void`
- `App.tsx` owns and merges adaptive calls across stages.

- [ ] **Step 1: Capture `/api/qalam/chat` tool calls in `AdaptiveInterviewStep` and forward them to `App`.**
- [ ] **Step 2: Render `AdaptiveToolSurface` inside the existing phone frame without replacing stage content.**
- [ ] **Step 3: Merge evaluation-returned tool calls after `/api/qalam/evaluate`.**
- [ ] **Step 4: Wire `request_evidence_upload` CTA to the existing `EVIDENCE_UPLOAD` stage.**
- [ ] **Step 5: Clear adaptive state on audit restart.**

### Task 6: Verification and handoff

**Files:**
- Modify if needed: `package.json` only when a test script is necessary.

- [ ] **Step 1: Run the focused contract test.**
- [ ] **Step 2: Run `npm run lint`.**
- [ ] **Step 3: Run `npm run build`.**
- [ ] **Step 4: Review the final diff for accidental audit-flow changes, hardcoded scores, and API-key exposure.**
- [ ] **Step 5: Open a PR from `feat/qalam-adaptive-tool-ui` to `main` with verification evidence and an example Gemini → frontend tool flow.**
