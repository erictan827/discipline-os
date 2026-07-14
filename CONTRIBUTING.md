# Contributing

## Development workflow

1. Create a focused branch from `main`.
2. Keep changes scoped and preserve existing user data migrations.
3. Never commit `.env.local`, credentials, local state, or generated output.
4. Run the required checks:

```bash
node --check src/app.js
node --check server/backend.js
npm run build
```

5. Update `CHANGELOG.md` for user-visible changes.
6. Use a clear conventional-style commit message such as `feat: add reversible ledger sync`.

## Product principles

- Preserve local-first and cloud-synced data compatibility.
- Prefer itemized, reversible actions over destructive aggregate edits.
- Keep AI assessments evidence-based and explainable.
- Ensure all core workflows remain usable on mobile.
- Maintain Chinese and English interface behavior where applicable.
