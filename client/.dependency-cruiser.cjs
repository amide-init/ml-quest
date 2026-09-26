/**
 * Layer boundaries for ML Quest (ARCHITECTURE.md §4.2, RULES.md §2).
 *
 *   app ─▶ pages ─▶ components
 *            └────▶ hooks ─▶ stores
 *                     └───▶ services ─▶ repositories ─▶ platform
 *                                 ├───▶ engine
 *                                 └───▶ workers (protocol) ─▶ engine
 *   every layer ─▶ models, lib, config, i18n
 *
 * Every rule below is a "forbidden" edge. When a rule fires, move the code to
 * the right layer instead of loosening the rule. Changing a rule needs an ADR.
 */

/** Files that are tests (they may reach into internals of the layer they test). */
const TEST_FILES = '\\.test\\.tsx?$'

/** Concrete repository implementations live in subfolders of repositories/. */
const CONCRETE_REPOSITORIES = '^src/repositories/[^/]+/'

/** Only the composition root may import app/, and only main.tsx imports it. */
const APP = '^src/app/'

/** Build a rule forbidding `from` layer folder(s) to import `to` layer folder(s). */
const forbid = (name, comment, from, to) => ({
  name,
  comment,
  severity: 'error',
  from: { path: `^src/(${from})/`, pathNot: TEST_FILES },
  to: { path: `^src/(${to})/` },
})

/** Resolved paths look like node_modules/.pnpm/react@x/node_modules/react/… under pnpm. */
const REACT_PACKAGES = '(^|/)node_modules/(react|react-dom|react-router|zustand)/'

module.exports = {
  forbidden: [
    // ── General hygiene ────────────────────────────────────────────────────
    {
      name: 'no-circular',
      comment:
        'Circular dependencies make layers impossible to reason about. Extract the shared part.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'not-to-unresolvable',
      comment: 'Import points to a module that cannot be resolved.',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: 'no-dev-deps-in-app',
      comment: 'App code must not import devDependencies (they are not shipped).',
      severity: 'error',
      from: { path: '^src/', pathNot: TEST_FILES },
      to: { dependencyTypes: ['npm-dev'], dependencyTypesNot: ['type-only'] },
    },
    {
      name: 'no-solutions-in-bundle',
      comment:
        'Level solutions are for the pass-bot only and must never be bundled (ARCHITECTURE §4 rule 5).',
      severity: 'error',
      from: { path: '^src/' },
      to: { path: '\\.solution\\.json$' },
    },

    // ── engine: pure ───────────────────────────────────────────────────────
    forbid(
      'engine-is-pure',
      'engine/ may only import models/ and lib/ (plus itself). It must run in Node, the worker and the main thread.',
      'engine',
      'app|pages|components|hooks|stores|services|repositories|workers|platform|config|i18n',
    ),
    {
      name: 'engine-no-react',
      comment: 'engine/ must not depend on React or UI state libraries.',
      severity: 'error',
      from: { path: '^src/engine/' },
      to: { path: REACT_PACKAGES, dependencyTypes: ['npm'] },
    },

    // ── models & lib: leaves ───────────────────────────────────────────────
    forbid(
      'models-are-leaves',
      'models/ holds types and schemas only; it may import lib/ and nothing else in src.',
      'models',
      'app|pages|components|hooks|stores|services|repositories|engine|workers|platform|config|i18n',
    ),
    forbid(
      'lib-is-generic',
      'lib/ has no domain knowledge and imports no other layer.',
      'lib',
      'app|pages|components|hooks|stores|services|repositories|engine|workers|platform|config|i18n|models',
    ),

    // ── UI layers ──────────────────────────────────────────────────────────
    forbid(
      'components-are-presentational',
      'components/ receive data via props. They must not reach services, stores, repositories, engine or hooks.',
      'components',
      'app|pages|hooks|stores|services|repositories|engine|workers|platform',
    ),
    forbid(
      'pages-compose-only',
      'pages/ compose components + hooks. Business logic and data access go through hooks → services.',
      'pages',
      'app|stores|services|repositories|engine|workers|platform',
    ),
    {
      name: 'use-services-only-in-hooks',
      comment:
        'Only hooks/ may call useServices(); pages and components get data from hooks or props.',
      severity: 'error',
      from: { path: '^src/(pages|components)/', pathNot: TEST_FILES },
      to: { path: '^src/hooks/useServices\\.tsx?$' },
    },
    forbid(
      'hooks-adapt-only',
      'hooks/ adapt services + stores to React. They must not import UI, repositories or engine.',
      'hooks',
      'app|pages|components|repositories|engine|workers',
    ),
    forbid(
      'stores-hold-state-only',
      'stores/ hold UI state. Persistence goes through services → repositories.',
      'stores',
      'app|pages|components|hooks|repositories|engine|workers|platform',
    ),

    // ── Application & data layers ──────────────────────────────────────────
    forbid(
      'services-no-ui',
      'services/ are UI-agnostic business logic.',
      'services',
      'app|pages|components|hooks|stores',
    ),
    {
      name: 'services-no-react',
      comment: 'services/ must not depend on React or UI state libraries.',
      severity: 'error',
      from: { path: '^src/services/', pathNot: TEST_FILES },
      to: { path: REACT_PACKAGES, dependencyTypes: ['npm'] },
    },
    forbid(
      'repositories-data-only',
      'repositories/ only read/write data. No business rules, no UI, no engine.',
      'repositories',
      'app|pages|components|hooks|stores|services|engine|workers',
    ),
    forbid(
      'workers-host-engine-only',
      'workers/ host the engine off-thread; they must not import app layers.',
      'workers',
      'app|pages|components|hooks|stores|services|repositories|platform',
    ),
    forbid(
      'platform-is-adapter',
      'platform/ wraps browser APIs; it must not import app layers.',
      'platform',
      'app|pages|components|hooks|stores|services|repositories|engine|workers',
    ),
    forbid(
      'config-i18n-are-leaves',
      'config/ and i18n/ must not import app layers.',
      'config|i18n',
      'app|pages|components|hooks|stores|services|repositories|engine|workers|platform',
    ),

    // ── Dependency injection ───────────────────────────────────────────────
    {
      name: 'concrete-repositories-only-in-composition-root',
      comment:
        'Only app/ (the composition root) may import concrete repositories. Everyone else depends on the interfaces in repositories/*.ts.',
      severity: 'error',
      from: { path: '^src/', pathNot: [APP, '^src/repositories/', TEST_FILES] },
      to: { path: CONCRETE_REPOSITORIES },
    },
    {
      name: 'repositories-barrel-exports-interfaces-only',
      comment:
        'repositories/index.ts must not re-export concrete implementations (that would bypass DI).',
      severity: 'error',
      from: { path: '^src/repositories/index\\.ts$' },
      to: { path: CONCRETE_REPOSITORIES },
    },
    {
      name: 'app-is-composition-root',
      comment: 'Nothing imports app/ except main.tsx.',
      severity: 'error',
      from: { path: '^src/', pathNot: ['^src/main\\.tsx$', APP] },
      to: { path: APP },
    },

    // ── Public APIs ────────────────────────────────────────────────────────
    {
      name: 'cross-layer-imports-use-barrels',
      comment:
        'Import another layer through its index.ts public API (e.g. @/services), not its internal files. app/ and tests are exempt.',
      severity: 'error',
      from: { path: '^src/([^/]+)/', pathNot: [APP, TEST_FILES] },
      to: {
        path: '^src/[^/]+/',
        pathNot: ['^src/$1/', '^src/[^/]+/index\\.tsx?$', '^src/[^/]+/[^/]+/index\\.tsx?$'],
      },
    },
  ],

  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.app.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
}
