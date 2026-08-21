# Qalam Adaptive Tool UI Design

## Goal

Add native Gemini tool calling and adaptive React UI to Pathwisse Qalam without replacing the existing Express, Gemini Live WebSocket, voice waveform, qalamState, or audit stage flow.

## Current architecture

- `server.ts` owns Gemini Live (`/live`), `/api/qalam/chat`, and `/api/qalam/evaluate`.
- `AdaptiveInterviewStep.tsx` consumes `/api/qalam/chat` while preserving voice/text interaction and qalamState transitions.
- `useGeminiLive.ts` supports bidirectional audio/transcripts over `/live` and is extended with a typed tool-call protocol.
- `App.tsx` owns audit state and transitions to existing readiness, gap, and roadmap screens.
- Existing report components remain authoritative; adaptive UI augments them rather than replacing them.

## Chosen approach

Use native `@google/genai` function calling plus a small shared TypeScript tool protocol. This is preferable to CopilotKit or assistant-ui for this repository because Qalam already has its own Gemini Live connection, state machine, and custom voice UI. Adding another agent runtime would duplicate transport/state and increase regression risk.

The architecture remains portable: the React renderer registry mirrors the same tool-name-to-component pattern used by generative UI frameworks, so CopilotKit can be adopted later without rewriting the visual components.

## Tool contract

`src/ai/qalamTools.ts` is the single source of truth for:

- tool names and TypeScript argument types
- Gemini `FunctionDeclaration`-compatible JSON schemas
- runtime normalization of untrusted model arguments
- `QalamToolCall` envelopes used by HTTP and WebSocket transports
- deterministic `buildAuditToolCalls` mapping for post-evaluation UI

Tools:

1. `render_skill_radar`
2. `show_gap_analysis`
3. `generate_roadmap`
4. `update_readiness_score`
5. `show_competency_benchmark`
6. `request_evidence_upload`

## HTTP flow

`AdaptiveInterviewStep` continues calling `/api/qalam/chat`. The server runs two Gemini operations in parallel:

1. the existing structured audit-response generation, preserving the current JSON contract
2. a small adaptive UI planner with the six function declarations enabled

If the planner selects UI tools, `response.functionCalls` are normalized to typed `QalamToolCall` objects and returned beside the normal chat response as `toolCalls`. If no visual adds value, the planner calls no tool.

This keeps chat latency bounded by parallel work and makes UI intent an actual model-selected function call rather than another hand-authored JSON field.

## Gemini Live flow

The Live config receives the same function declarations. When Gemini emits `message.toolCall.functionCalls`, Express forwards normalized `toolCall` WebSocket messages to the browser. `useGeminiLive` exposes `onToolCall` for rendering and `sendToolResult(callId, name, result)` for acknowledging the rendered result. Express maps that acknowledgement to `session.sendToolResponse` with the matching function-call id.

Audio, input/output transcription, interruption, and turn-complete events remain separate and unchanged.

## Post-evaluation flow

`/api/qalam/evaluate` continues producing the current audit result. It additionally returns deterministic adaptive calls derived only from evaluated data:

- readiness dashboard from overall/dimension scores
- gap analysis from evaluated gaps
- skill radar from diagnostic conclusions
- competency benchmark only when a real Supabase/seed role benchmark is available
- roadmap from the evaluated roadmap when available

No score, gap, or benchmark is invented by the UI layer.

## Frontend rendering

`src/components/adaptive-ui/AdaptiveToolSurface.tsx` is a renderer registry with one focused component per tool.

The surface:

- renders the latest tool call prominently and allows browsing recent cards
- uses Framer Motion for enter/update transitions
- is mobile-first within the existing 390px product frame
- uses Pathwisse navy, slate, emerald, amber, and rose semantic states
- renders `request_evidence_upload` as an inline proof-capture card so the interview component does not unmount mid-audit
- stores adaptive proof metadata/URLs in the existing `EvidenceUploads` payload for later evaluation

## State ownership

`App.tsx` owns `adaptiveToolCalls` so calls survive stage changes. `AdaptiveInterviewStep` receives an `onToolCalls` callback. After evaluation, `App.tsx` merges returned calls using id/name replacement rules so score and benchmark cards update rather than duplicate endlessly.

## Error handling

- Unknown tool names are discarded server-side.
- Model-provided scores are clamped to 0-100 and gap severities are normalized.
- Malformed args degrade to safe defaults rather than crashing the audit.
- Tool-planner failure returns `toolCalls: []` and does not fail the core chat response.
- Live WebSocket errors continue through the existing error channel.
- Adaptive UI never calculates or writes readiness scores back into the evaluation model.

## Verification

- Focused contract test covers tool normalization, unknown-tool rejection, score clamping, severity normalization, and post-evaluation tool generation.
- GitHub Actions installs dependencies and runs `npm test`.
- TypeScript `npm run lint` is the repository-wide type gate.
- `npm run build` verifies the production Vite and server bundle.
