# Qalam Adaptive Tool UI Design

## Goal

Add native Gemini tool calling and adaptive React UI to Pathwisse Qalam without replacing the existing Express, Gemini Live WebSocket, voice waveform, qalamState, or audit stage flow.

## Current architecture

- `server.ts` owns Gemini Live (`/live`), `/api/qalam/chat`, and `/api/qalam/evaluate`.
- `AdaptiveInterviewStep.tsx` consumes `/api/qalam/chat` while preserving voice/text interaction and qalamState transitions.
- `useGeminiLive.ts` already supports bidirectional audio/transcripts over `/live`, but has no tool-call protocol.
- `App.tsx` owns audit state and transitions to existing readiness, gap, and roadmap screens.
- Existing report components remain authoritative; adaptive UI augments them rather than replacing them.

## Chosen approach

Use native `@google/genai` function calling plus a small shared TypeScript tool protocol. This is preferable to CopilotKit or assistant-ui for this repository because Qalam already has its own Gemini Live connection, state machine, and custom voice UI. Adding another agent runtime would duplicate transport/state and increase regression risk.

The architecture remains portable: the React renderer registry mirrors the same tool-name-to-component pattern used by generative UI frameworks, so CopilotKit can be adopted later without rewriting the visual components.

## Tool contract

Create `src/ai/qalamTools.ts` as the single source of truth for:

- tool names and TypeScript argument types
- Gemini `FunctionDeclaration`-compatible JSON schemas
- runtime normalization of untrusted model arguments
- `QalamToolCall` envelope used by HTTP and WebSocket transports
- deterministic `buildAuditToolCalls` mapping for post-evaluation UI

Tools:

1. `render_skill_radar`
2. `show_gap_analysis`
3. `generate_roadmap`
4. `update_readiness_score`
5. `show_competency_benchmark`
6. `request_evidence_upload`

## HTTP flow

`AdaptiveInterviewStep` calls `/api/qalam/chat` as it does today. Gemini receives the six function declarations in AUTO mode. If Gemini selects one or more UI tools, the server records the function calls, acknowledges them to Gemini as queued UI renders, then asks Gemini for the normal typed audit response. The endpoint returns both the existing fields and `toolCalls`.

This preserves the current frontend contract while making the UI intent an actual model-selected function call rather than an extra JSON field.

## Gemini Live flow

The Live config receives the same function declarations. When Gemini emits `message.toolCall.functionCalls`, Express forwards typed `toolCall` WebSocket messages to the browser. The browser renders them immediately and sends a `toolResult` acknowledgement. Express responds to Gemini with `session.sendToolResponse` using the matching function-call id.

This allows adaptive UI to appear during a real voice turn without interrupting audio/transcription messages.

## Post-evaluation flow

`/api/qalam/evaluate` continues producing the current audit result. The server additionally returns deterministic adaptive calls derived only from evaluated data:

- readiness dashboard from overall/dimension scores
- gap analysis from evaluated gaps
- competency benchmark and skill radar from diagnostic conclusions
- roadmap from the evaluated roadmap when available

No score or gap is invented by the UI layer.

## Frontend rendering

Create an adaptive UI renderer registry under `src/components/adaptive-ui/` with one focused component per tool and a shared `AdaptiveToolSurface` container.

The surface:

- renders the latest tool call prominently and allows browsing recent cards
- uses Framer Motion for enter/update transitions
- is mobile-first within the existing 390px product frame
- uses Pathwisse navy, slate, emerald, amber, and rose semantic states
- exposes an action for `request_evidence_upload` that transitions to the existing `EVIDENCE_UPLOAD` step

## State ownership

`App.tsx` owns `adaptiveToolCalls` so calls survive stage changes. `AdaptiveInterviewStep` receives an `onToolCalls` callback. After evaluation, `App.tsx` merges returned calls using id/name replacement rules so score and benchmark cards update rather than duplicate endlessly.

## Error handling

- Unknown tool names are discarded server-side.
- Malformed args are normalized to safe empty/default values rather than crashing the audit.
- Tool rendering failures do not fail the chat/evaluation response.
- Live tool acknowledgements are optional from the model's perspective; WebSocket errors continue through the existing error channel.
- Adaptive UI never writes scores back into the evaluation model.

## Testing

- Pure contract tests cover tool normalization, unknown-tool rejection, and post-evaluation tool generation.
- TypeScript `npm run lint` remains the repository-wide type gate.
- `npm run build` remains the production build gate.
- Manual smoke cases: weak evidence triggers evidence upload; strong evaluated data updates readiness/gap/benchmark/roadmap cards; Live tool calls render without stopping audio events.
