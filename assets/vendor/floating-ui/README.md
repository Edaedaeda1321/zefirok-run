# Floating UI vendor files

Run from the repository root before deployment:

```bash
node scripts/fetch-floating-ui.mjs
```

The script downloads the exact versions already used by the project:

- `@floating-ui/core@1.7.3`
- `@floating-ui/dom@1.7.4`

The game keeps the previous UNPKG URLs only as a runtime emergency fallback. A normal deployment should pass `node scripts/check-assets.mjs` and serve the local files.
