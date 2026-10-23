import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { UserSettings } from '../api/types'
import { JD_TEXT, RESUME_TEXT, userSettings } from '../test/fixtures'
import { json, mockApi, renderApp } from '../test/renderApp'

const KEY = 'sk-ant-api03-secret-key-WXYZ'

function bodyOf(init: RequestInit | undefined) {
  return JSON.parse(String(init?.body))
}

/** A settings API whose PUT applies the change the way the backend does, recording each body. */
function settingsApi(initial: UserSettings = userSettings) {
  let current = structuredClone(initial)
  const puts: unknown[] = []
  const handler = (init: RequestInit | undefined) => {
    if (init?.method === 'PUT') {
      const change = bodyOf(init)
      puts.push(change)
      current = {
        ...current,
        ...('provider' in change && { provider: change.provider }),
        ...('temperature' in change && { temperature: change.temperature }),
        ...('ollama_base_url' in change && { ollama_base_url: change.ollama_base_url }),
        models: { ...current.models, ...change.models },
        api_keys: { ...current.api_keys },
      }
      for (const [p, key] of Object.entries(change.api_keys ?? {})) {
        current.api_keys[p as 'anthropic'] = key
          ? { source: 'saved', masked: `${String(key).slice(0, 6)}…${String(key).slice(-4)}` }
          : { source: null, masked: null }
      }
    }
    return json(current)
  }
  return { handler, puts }
}

describe('SettingsPage', () => {
  it('shows the saved Ollama settings and the installed models', async () => {
    const user = userEvent.setup()
    mockApi({})
    renderApp('/settings')

    expect(await screen.findByRole('button', { name: /Ollama/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('textbox', { name: 'Ollama server URL' })).toHaveValue('http://localhost:11434')
    const model = screen.getByRole('combobox', { name: 'Model' })
    expect(model).toHaveValue('qwen2.5-coder:14b')
    expect(await screen.findByText('14.8B · Q4_K_M · 9.0 GB')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open' }))
    const listbox = await screen.findByRole('listbox')
    expect(within(listbox).getByText('llama3.1:8b')).toBeInTheDocument()
    expect(within(listbox).getByText('8.0B · Q4_K_M · 4.9 GB')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('saves a different Ollama model', async () => {
    const user = userEvent.setup()
    const api = settingsApi()
    mockApi({ '/api/settings': api.handler })
    renderApp('/settings')

    await user.click(await screen.findByRole('button', { name: 'Open' }))
    await user.click(await screen.findByRole('option', { name: /llama3\.1:8b/ }))
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(api.puts).toEqual([{ models: { ollama: 'llama3.1:8b' } }]))
    expect(await screen.findByText('Settings saved')).toBeInTheDocument()
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
  })

  it('switches to Claude, adds a key and saves it without echoing it back', async () => {
    const user = userEvent.setup()
    const api = settingsApi()
    mockApi({ '/api/settings': api.handler })
    renderApp('/settings')

    await user.click(await screen.findByRole('button', { name: /Claude/ }))
    expect(screen.getByText('No key yet')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Model' })).toHaveValue('claude-sonnet-5-5'))
    expect(screen.getByRole('button', { name: 'Test connection' })).toBeDisabled()

    const keyField = screen.getByLabelText('Claude API key')
    expect(keyField).toHaveAttribute('type', 'password')
    fireEvent.change(keyField, { target: { value: KEY } })
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(api.puts).toEqual([{ provider: 'anthropic', api_keys: { anthropic: KEY } }]))
    expect(await screen.findByText('Saved: sk-ant…WXYZ')).toBeInTheDocument()
    // The form resets after saving: the typed key is cleared from the field.
    expect(screen.getByLabelText('Replace Claude API key')).toHaveValue('')
  })

  it('removes a saved key', async () => {
    const user = userEvent.setup()
    const api = settingsApi({
      ...userSettings,
      provider: 'openai',
      api_keys: { ...userSettings.api_keys, openai: { source: 'saved', masked: 'sk-pro…abcd' } },
    })
    mockApi({ '/api/settings': api.handler })
    renderApp('/settings')

    await user.click(await screen.findByRole('button', { name: 'Remove' }))
    expect(screen.getByText('Will be removed on save')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(api.puts).toEqual([{ api_keys: { openai: null } }]))
    expect(await screen.findByText('No key yet')).toBeInTheDocument()
  })

  it('tests the connection with the unsaved form values', async () => {
    const user = userEvent.setup()
    let sent: unknown
    mockApi({
      '/api/settings/test': (init) => {
        sent = bodyOf(init)
        return json({ ok: true, message: 'qwen2.5-coder:14b answered in 1.2s.', latency_ms: 1200 })
      },
    })
    renderApp('/settings')

    const url = await screen.findByRole('textbox', { name: 'Ollama server URL' })
    fireEvent.change(url, { target: { value: 'http://gpu-box:11434' } })
    await user.click(screen.getByRole('button', { name: 'Test connection' }))

    expect(await screen.findByText('qwen2.5-coder:14b answered in 1.2s.')).toBeInTheDocument()
    expect(sent).toEqual({ provider: 'ollama', model: 'qwen2.5-coder:14b', base_url: 'http://gpu-box:11434' })
  })

  it('shows connection failures and model-list problems', async () => {
    const user = userEvent.setup()
    mockApi({
      '/api/models': () =>
        json({
          provider: 'ollama',
          models: [],
          source: 'live',
          error: 'Cannot reach Ollama at http://localhost:11434. Is it running?',
        }),
      '/api/settings/test': () =>
        json({ ok: false, message: "Model 'qwen2.5-coder:14b' was not found on ollama.", latency_ms: null }),
    })
    renderApp('/settings')

    expect(await screen.findByText('Cannot reach Ollama at http://localhost:11434. Is it running?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Test connection' }))
    expect(await screen.findByText("Model 'qwen2.5-coder:14b' was not found on ollama.")).toBeInTheDocument()
  })
})

describe('Score page model chip', () => {
  it('shows the model that will score and links to Settings', async () => {
    const user = userEvent.setup()
    mockApi({})
    const { router } = renderApp('/')
    const chip = await screen.findByRole('link', { name: /Ollama · qwen2\.5-coder:14b/ })
    await user.click(chip)
    expect(router.state.location.pathname).toBe('/settings')
  })

  it('blocks scoring when the chosen hosted provider has no key', async () => {
    mockApi({ '/api/settings': () => json({ ...userSettings, provider: 'anthropic' }) })
    renderApp('/')
    expect(await screen.findByRole('link', { name: /Claude · claude-sonnet-5-5 \(no API key\)/ })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Job description' }), { target: { value: JD_TEXT } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Resume' }), { target: { value: RESUME_TEXT } })
    expect(screen.getByText('Add a Claude API key in Settings to score.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Score resume' })).toBeDisabled()
  })
})
