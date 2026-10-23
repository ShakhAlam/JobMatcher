import { describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch } from './client'

function respond(status: number, body: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(body, { status, statusText: 'Status text' })),
  )
}

describe('apiFetch', () => {
  it('prefixes /api and returns JSON', async () => {
    respond(200, '{"status":"ok"}')
    await expect(apiFetch('/health')).resolves.toEqual({ status: 'ok' })
    expect(fetch).toHaveBeenCalledWith('/api/health', undefined)
  })

  it('surfaces FastAPI string details', async () => {
    respond(400, '{"detail":"No API key configured for openai."}')
    await expect(apiFetch('/score')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'No API key configured for openai.',
    })
  })

  it('joins FastAPI validation error messages', async () => {
    respond(422, '{"detail":[{"msg":"Field required"},{"msg":"String too short"}]}')
    await expect(apiFetch('/score')).rejects.toThrow('Field required; String too short')
  })

  it('falls back to the status text for non-JSON errors', async () => {
    respond(504, '<html>gateway timeout</html>')
    await expect(apiFetch('/score')).rejects.toThrow('Status text')
  })

  it('reports network failures as status 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    )
    const error = await apiFetch('/health').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 0 })
  })
})
