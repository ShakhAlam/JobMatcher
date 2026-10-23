/** Thin fetch wrapper for the FastAPI backend. In dev, Vite proxies /api to the backend. */

import type {
  ConnectionResult,
  ExtractResult,
  LLMProvider,
  MatchResult,
  ModelList,
  ScoreRequest,
  SettingsUpdate,
  UserSettings,
} from './types'

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
  } catch (error) {
    // Let callers tell a user-initiated cancel apart from a network failure.
    if (error instanceof DOMException && error.name === 'AbortError') throw error
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

export const scoreResume = (body: ScoreRequest, signal?: AbortSignal) =>
  apiFetch<MatchResult>('/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

export function extractText(file: File, signal?: AbortSignal) {
  const form = new FormData()
  form.append('file', file)
  return apiFetch<ExtractResult>('/extract-text', { method: 'POST', body: form, signal })
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const getSettings = () => apiFetch<UserSettings>('/settings')

export const updateSettings = (change: SettingsUpdate) => apiFetch<UserSettings>('/settings', json('PUT', change))

/** Keys go in the POST body, never the URL. Unsaved form values let the list load before saving. */
export const listModels = (params: { provider: LLMProvider; api_key?: string; ollama_base_url?: string }) =>
  apiFetch<ModelList>('/models', json('POST', params))

export const testConnection = (params: { provider: LLMProvider; model: string; api_key?: string; base_url?: string }) =>
  apiFetch<ConnectionResult>('/settings/test', json('POST', params))
