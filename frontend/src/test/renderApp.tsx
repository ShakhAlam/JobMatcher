import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'
import AppProviders from '../AppProviders'
import { routes } from '../routes'
import { ollamaModels, userSettings } from './fixtures'

/** Stub fetch: the health check answers with the given status and body; settings and models get fixtures. */
export function stubFetch(status = 200, body: unknown = { status: 'ok' }) {
  return mockApi({ '/api/health': () => new Response(JSON.stringify(body), { status }) })
}

type RouteHandler = (init: RequestInit | undefined) => Response | Promise<Response>

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

const defaultHandlers: Record<string, RouteHandler> = {
  '/api/health': () => json({ status: 'ok' }),
  '/api/settings': () => json(userSettings),
  '/api/models': (init) => {
    const { provider } = JSON.parse(String(init?.body))
    if (provider === 'ollama') return json(ollamaModels)
    const suggested = provider === 'anthropic' ? 'claude-sonnet-5-5' : 'gpt-5-mini'
    return json({
      provider,
      models: [{ id: suggested, label: suggested, detail: null, size_bytes: null }],
      source: 'suggested',
      error: null,
    })
  },
}

/** Stub fetch with per-path handlers (e.g. '/api/score') over sensible defaults; unknown paths answer 404. */
export function mockApi(handlers: Record<string, RouteHandler>) {
  const all = { ...defaultHandlers, ...handlers }
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const handler = all[String(input)]
    if (handler) return handler(init)
    return json({ detail: 'Not found' }, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const utils = render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { ...utils, router }
}
