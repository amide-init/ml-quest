import { createHashRouter } from 'react-router'
import { CodexPage, HomePage, LevelPage, NotFoundPage, SettingsPage, WorldMapPage } from '@/pages'
import { AppLayout } from './AppLayout'
import { RouteErrorBoundary } from './RouteErrorBoundary'

/** Hash routing works on GitHub Pages without server rewrites (ARCHITECTURE §7). */
export function createAppRouter() {
  return createHashRouter([
    {
      element: <AppLayout />,
      errorElement: <RouteErrorBoundary />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'map', element: <WorldMapPage /> },
        { path: 'w/:world/l/:level', element: <LevelPage /> },
        { path: 'codex', element: <CodexPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ])
}
