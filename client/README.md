# ML Quest — client

The Vite + React + TypeScript app for [ML Quest](../README.md).

```bash
pnpm install
pnpm dev         # http://localhost:5173
pnpm typecheck   # tsc -b
pnpm lint        # oxlint
pnpm build       # production build → dist/
```

- `@/` is an alias for `src/` (for example `import { … } from '@/models'`).
- `VITE_BASE` sets the public base path. CI uses `/ml-quest/` for GitHub Pages, and it defaults to `/` locally.

Architecture, layers and naming rules: see [ARCHITECTURE.md](../ARCHITECTURE.md) and [RULES.md](../RULES.md).
