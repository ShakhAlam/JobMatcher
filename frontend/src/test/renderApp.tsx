import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'
import AppProviders from '../AppProviders'
import { routes } from '../routes'

/** Stub fetch so every request resolves with the given status and JSON body. */
export function stubFetch(status = 200, body: unknown = { status: 'ok' }) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

type RouteHandler = (init: RequestInit | undefined) => Response | Promise<Response>

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

/** Stub fetch with per-path handlers (e.g. '/api/score'); unknown paths answer 404. */
export function mockApi(handlers: Record<string, RouteHandler>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const handler = handlers[String(input)]
    if (handler) return handler(init)
    if (String(input) === '/api/health') return json({ status: 'ok' })
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
