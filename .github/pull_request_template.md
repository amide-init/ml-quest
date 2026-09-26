## What and why

<!-- One or two sentences. Cite the PRD requirement (F-id) or the level (e.g. W2-L5). -->

Closes #

## Layers touched

<!-- e.g. content, engine, services, hooks, pages, components (ARCHITECTURE §4) -->

## Definition of done (RULES.md §10)

- [ ] Meets the PRD requirement it references
- [ ] Tests added; CI is green (typecheck, lint incl. layer rules, format, tests, pass-bot, level validation, build, bundle size)
- [ ] Works with touch, mouse and keyboard; checked at 360 px width
- [ ] Light and dark themes checked; reduced motion checked
- [ ] Strings externalized; no console errors
- [ ] Docs, schema or ADR updated if behaviour or contracts changed

## New level? (skip otherwise)

- [ ] `content/levels/<world>/<id>.json` and `<id>.solution.json` (with an anti-solution if the level has a trap)
- [ ] Text in `levels.json` (mission, 3 hints, debrief, field notes) and `ui.json` (title, concept card)
- [ ] Played it end to end; `pnpm levels:validate` and `pnpm test:passbot` pass
