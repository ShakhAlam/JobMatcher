import type { ReactNode } from 'react'
import { CssBaseline } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from './queryClient'
import ScoreWorkspaceProvider from './score/ScoreWorkspaceProvider'
import { theme } from './theme/theme'

// Also read by the inline script in index.html that applies the mode before React loads.
export const MODE_STORAGE_KEY = 'jobmatcher.color-mode'

interface AppProvidersProps {
  children: ReactNode
  queryClient?: QueryClient
}

export default function AppProviders({ children, queryClient = createQueryClient() }: AppProvidersProps) {
  return (
    <ThemeProvider theme={theme} defaultMode="dark" modeStorageKey={MODE_STORAGE_KEY}>
      <CssBaseline enableColorScheme />
      <QueryClientProvider client={queryClient}>
        <ScoreWorkspaceProvider>{children}</ScoreWorkspaceProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
