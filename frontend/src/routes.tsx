import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router'
import StartupFallback from './components/StartupFallback'
import AppShell from './layout/AppShell'
import RouteError from './pages/RouteError'
import ScorePage from './pages/ScorePage'

/**
 * Load a page's code only when it is first visited. The Score page is the landing page, so it
 * stays in the main bundle; the router waits for a lazy page before switching to it.
 */
function page(load: () => Promise<{ default: ComponentType }>): RouteObject['lazy'] {
  return async () => ({ Component: (await load()).default })
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    hydrateFallbackElement: <StartupFallback />,
    children: [
      {
        // Pathless wrapper: a page error renders inside the shell, keeping the sidebar usable.
        errorElement: <RouteError />,
        children: [
          { index: true, element: <ScorePage /> },
          { path: 'history', lazy: page(() => import('./pages/HistoryPage')) },
          { path: 'history/:id', lazy: page(() => import('./pages/HistoryDetailPage')) },
          { path: 'profile', lazy: page(() => import('./pages/ProfilePage')) },
          { path: 'settings', lazy: page(() => import('./pages/SettingsPage')) },
          { path: '*', lazy: page(() => import('./pages/NotFoundPage')) },
        ],
      },
    ],
  },
]
