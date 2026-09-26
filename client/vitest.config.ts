import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

/**
 * Two test projects (ARCHITECTURE.md §10):
 * - "node":  engine, services, repositories, models, lib … and tests/ (pass-bot).
 *            Running in plain Node proves this code does not depend on the DOM.
 * - "dom":   UI layers (app, pages, components, hooks) in jsdom with Testing Library.
 * Tests live next to their source as Xxx.test.ts(x).
 */
const UI_LAYERS = 'src/{app,pages,components,hooks}/**/*.test.{ts,tsx}'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'node',
            environment: 'node',
            include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
            exclude: [UI_LAYERS, 'tests/e2e/**'],
          },
        },
        {
          extends: true,
          test: {
            name: 'dom',
            environment: 'jsdom',
            include: [UI_LAYERS],
            setupFiles: ['./tests/setup/DomSetup.ts'],
          },
        },
      ],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/index.ts', 'src/main.tsx', 'src/**/*.test.{ts,tsx}'],
        reporter: ['text', 'html', 'lcov'],
        reportsDirectory: './coverage',
      },
    },
  }),
)
