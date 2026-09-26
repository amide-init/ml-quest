import { createHashRouter } from 'react-router'
import { CodexPage, HomePage, NotFoundPage, SettingsPage, WorldMapPage } from '@/pages'
import { AppLayout } from './AppLayout'
import { RouteErrorBoundary } from './RouteErrorBoundary'
import { RouteFallback } from './RouteFallback'

/** Hash routing works on GitHub Pages without server rewrites (ARCHITECTURE §7). */
export function createAppRouter() {
  return createHashRouter([
    {
      element: <AppLayout />,
      errorElement: <RouteErrorBoundary />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'map', element: <WorldMapPage /> },
        {
          // The level player (views, charts, widgets) is its own chunk: Home and the map load
          // without it, keeping the first load inside the budget (ARCHITECTURE D5, §9).
          path: 'w/:world/l/:level',
          hydrateFallbackElement: <RouteFallback />,
          lazy: async () => ({ Component: (await import('@/pages/LevelPage')).LevelPage }),
        },
        { path: 'codex', element: <CodexPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ])
}
