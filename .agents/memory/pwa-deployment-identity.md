---
name: PWA deployment identity
description: Why client update detection must use a shared build-time identity rather than server process start time.
---

Use one immutable identifier generated during the production build and embed it into both the client and server bundles. The running client compares its own embedded identity with the server's identity.

**Why:** A process-start timestamp changes during ordinary restarts and may differ across rolling instances, which can cause false updates and repeated reloads even when the deployed code is unchanged.

**How to apply:** Keep both sides sourced from the same build invocation whenever changing deployment checks, visible build labels, bundling, or server startup behavior.