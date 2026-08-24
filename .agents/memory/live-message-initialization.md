---
name: Live message initialization
description: Ordering constraint between browser WebSocket open and Gemini Live session setup
---

The browser can send text or audio immediately after the project WebSocket opens, before the upstream Gemini Live session finishes connecting. Those messages must be queued and replayed after session initialization.

**Why:** Registering the client message handler only after the upstream connection completed caused silent Live sessions and dropped first turns.

**How to apply:** Keep the project WebSocket listener active from connection start, buffer messages while the upstream session is null, and flush them once the session is ready.