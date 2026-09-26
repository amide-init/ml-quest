# Contributing to ML Quest

Thanks for helping people learn machine learning by playing. There's room for every kind of help:

| You want to… | Start here |
|---|---|
| Report a bug | [Open a bug report](https://github.com/amide-init/ml-quest/issues/new?template=bug.yml) (your progress code from Settings helps us reproduce it) |
| Pitch or build a level | [Create a level](./docs/CREATE_A_LEVEL.md), then [propose it](https://github.com/amide-init/ml-quest/issues/new?template=level-proposal.yml) |
| Improve hints, field notes or wording | Edit `client/content/locales/en/levels.json` or `ui.json` and open a pull request |
| Work on the code | Read on |

By taking part you agree to the [code of conduct](./CODE_OF_CONDUCT.md).

## Set up

You need **Node 24** and **pnpm** (npm and yarn are blocked on purpose).

```bash
nvm use            # Node 24, from .nvmrc
corepack enable    # once: provides the pinned pnpm
cd client
pnpm install
pnpm dev           # http://localhost:5173
```

In development every level is open, so you can go straight to `/#/w/2/l/5`. Players unlock levels one by one.

## Before you open a pull request

Run what CI runs, from `client/`:

```bash
pnpm typecheck        # strict TypeScript
pnpm lint             # oxlint (zero warnings) + layer boundaries
pnpm format:check     # Prettier (pnpm format fixes it)
pnpm test             # unit, component and app tests, incl. an accessibility audit of every level
pnpm test:passbot     # replays every level's scripted solutions through the real game
pnpm levels:validate  # level schema + every text key exists
pnpm build && pnpm size   # production build + bundle budgets
```

The pull request template has the definition-of-done checklist (RULES.md §10).

## How the code is organised

The app in `client/` has strict layers, and dependency-cruiser enforces them: `pages → components/hooks → stores → services → repositories/engine → models`. Business rules live in `services/`, the pure ML engine in `engine/`, and levels are JSON in `content/`. The table in [AGENTS.md → "Where does this code go?"](./AGENTS.md#where-does-this-code-go) answers most placement questions; [ARCHITECTURE.md](./ARCHITECTURE.md) has the full picture and [RULES.md](./RULES.md) the rules.

Two rules that surprise people:

- **The engine is pure.** No `Math.random()`, `Date.now()`, DOM or React in `client/src/engine/`; take an injected random source or clock instead.
- **File names are TitleCase** and match their main export (`ProgressService.ts`), except hooks (`useLevelSession.ts`) and content files (`w2-l5.json`).

## Commits and pull requests

- Use [Conventional Commits](https://www.conventionalcommits.org/): `feat(engine): …`, `fix(level/w1-l4): …`, `content(w2): …`, `docs: …`.
- Keep a pull request to one purpose. A new level is one pull request: config, solution, text.
- If you change a contract described in ARCHITECTURE.md, update it (or add an ADR) in the same pull request.

## Licence of contributions

Code is under the [MIT licence](./LICENSE); level content (`client/content/`) is under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). By contributing you agree your work is released under the same terms. Level authors are credited in the level's `authors` field.
