import { QueryClient } from '@tanstack/react-query'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        // One quick retry, then show the error (with a Try again button) instead of spinning for
        // several seconds while the default three retries back off.
        retry: 1,
      },
    },
  })
}
