# ML Quest: client

The Vite + React + TypeScript app for [ML Quest](../README.md). Run everything from this folder with **pnpm** (Node 24).

```bash
pnpm install
pnpm dev              # http://localhost:5173, every level open
pnpm typecheck        # strict TypeScript (tsc -b)
pnpm lint             # oxlint (zero warnings) + dependency-cruiser layer rules
pnpm format           # Prettier (format:check in CI)
pnpm test             # Vitest: node project (engine, services…) + dom project (app, pages…)
pnpm test:passbot     # replay every level's scripted solutions through the real game
pnpm levels:validate  # level schema + every text key exists
pnpm build            # production build → dist/ (with the offline service worker)
pnpm size             # gzip bundle budgets, after a build
```

- `@/` is an alias for `src/`, `@content/` for `content/`, `@tests/` for `tests/`.
- `VITE_BASE` sets the public base path. The deploy uses `/ml-quest/` for GitHub Pages; locally it is `/`.
- Levels and their text live in `content/`; see [Create a level](../docs/CREATE_A_LEVEL.md).

Architecture, layers and naming rules: [ARCHITECTURE.md](../ARCHITECTURE.md), [RULES.md](../RULES.md), [CONTRIBUTING.md](../CONTRIBUTING.md).
