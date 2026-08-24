---
name: Playwright runtime dependencies
description: Environment requirement for local Chromium browser validation
---

Local Playwright Chromium may fail to launch until the workspace has the required Nix browser libraries, including GLib, GBM, XKB common, GTK, NSS, and related graphics/X11 dependencies.

**Why:** The project can compile and the platform preview can render while the local headless Chromium binary still fails immediately on missing shared libraries.

**How to apply:** Before browser E2E, launch a minimal Playwright smoke test. If it fails with a missing `.so`, install the corresponding Nix system dependency and restart the workflow before diagnosing application behavior.