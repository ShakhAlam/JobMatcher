import type { RouteObject } from 'react-router'
import AppShell from './layout/AppShell'
import HistoryPage from './pages/HistoryPage'
import NotFoundPage from './pages/NotFoundPage'
import ProfilePage from './pages/ProfilePage'
import RouteError from './pages/RouteError'
import ScorePage from './pages/ScorePage'
import SettingsPage from './pages/SettingsPage'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        // Pathless wrapper: a page error renders inside the shell, keeping the sidebar usable.
        errorElement: <RouteError />,
        children: [
          { index: true, element: <ScorePage /> },
          { path: 'history', element: <HistoryPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]
