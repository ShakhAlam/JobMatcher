/** Thin fetch wrapper for the FastAPI backend. In dev, Vite proxies /api to the backend. */

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function detailMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const { detail } = body as { detail: unknown }
    if (typeof detail === 'string') return detail
    // FastAPI validation errors: [{ loc, msg, ... }]
    if (Array.isArray(detail)) return detail.map((d) => d?.msg ?? String(d)).join('; ')
  }
  return fallback
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, init)
  } catch {
    throw new ApiError(0, 'Cannot reach the Job Matcher API. Is the backend running?')
  }
  if (!res.ok) {
    let body: unknown = null
    try {
      body = await res.json()
    } catch {
      // Non-JSON error page (e.g. proxy error); fall back to the status text.
    }
    throw new ApiError(res.status, detailMessage(body, res.statusText || `Request failed (${res.status})`))
  }
  return (await res.json()) as T
}

export interface Health {
  status: string
}

export const getHealth = () => apiFetch<Health>('/health')
