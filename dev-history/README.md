# Development history — non-authoritative

This directory contains historical UI snapshots and one-off patch/diff artifacts that used to live in the repository root.

Rules:
- Production source of truth stays in the repository root (`index.html`, `battle-pass.html`, `rating.html`, etc.) and `src/worker.js`.
- Do not use files from `dev-history/` as the basis for production changes unless explicitly restoring historical behavior.
- `dev-history/` is excluded from Cloudflare static asset deployment by `.assetsignore`.
- Git history remains the authoritative record of older commits; these files are kept only where they are still useful for local comparison/test-project workflows.
