import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { HistoryEntry, HistorySummary, Profile } from '../api/types'
import { formatWhen } from '../history/formatWhen'
import { emptyProfile, JD_TEXT, matchResult, RESUME_TEXT } from '../test/fixtures'
import { json, mockApi, renderApp } from '../test/renderApp'

const savedProfile: Profile = {
  ...emptyProfile,
  name: 'Alex Rivera',
  headline: 'Senior Java engineer',
  default_resume: RESUME_TEXT,
  default_resume_filename: 'alex.pdf',
  updated_at: '2026-10-20T10:00:00Z',
}

const summary: HistorySummary = {
  id: 7,
  created_at: '2026-10-21T15:42:00Z',
  job_title: 'Java Developer',
  candidate: 'Alex Rivera',
  overall_score: 78,
  verdict: 'Good match',
  model_used: { provider: 'ollama', model: 'qwen2.5-coder:14b' },
}

const entry: HistoryEntry = { ...summary, job_description: JD_TEXT, resume: RESUME_TEXT, result: matchResult }

const resumeField = () => screen.getByRole('textbox', { name: 'Resume' })
const bodyOf = (init: RequestInit | undefined) => JSON.parse(String(init?.body))

describe('ProfilePage', () => {
  it('saves details and a default resume, and shows initials in the top bar', async () => {
    const user = userEvent.setup()
    let saved: unknown
    mockApi({
      '/api/profile': (init) => {
        if (init?.method === 'PUT') {
          saved = bodyOf(init)
          return json({ ...(saved as Profile), updated_at: '2026-10-23T00:00:00Z' })
        }
        return json(emptyProfile)
      },
    })
    renderApp('/profile')

    fireEvent.change(await screen.findByRole('textbox', { name: 'Name' }), { target: { value: 'Alex Rivera' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'alex@example.com' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Headline' }), { target: { value: 'Java engineer' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Default resume' }), { target: { value: RESUME_TEXT } })
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Profile saved')).toBeInTheDocument()
    expect(saved).toEqual({
      name: 'Alex Rivera',
      email: 'alex@example.com',
      headline: 'Java engineer',
      default_resume: RESUME_TEXT,
      default_resume_filename: null,
    })
    const account = screen.getByRole('button', { name: 'Open account menu' })
    expect(within(account).getByText('AR')).toBeInTheDocument()
  })

  it('blocks saving an invalid email', async () => {
    mockApi({})
    renderApp('/profile')
    fireEvent.change(await screen.findByRole('textbox', { name: 'Email' }), { target: { value: 'nope' } })
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('remembers which file the default resume came from', async () => {
    const user = userEvent.setup()
    let saved: Profile | undefined
    mockApi({
      '/api/extract-text': () =>
        json({
          filename: 'alex.pdf',
          file_type: 'pdf',
          text: RESUME_TEXT,
          char_count: RESUME_TEXT.length,
          pages: 1,
          warnings: [],
        }),
      '/api/profile': (init) => {
        if (init?.method === 'PUT') saved = bodyOf(init)
        return json(saved ?? emptyProfile)
      },
    })
    renderApp('/profile')
    await user.upload(
      await screen.findByLabelText('Upload default resume file'),
      new File(['%PDF'], 'alex.pdf', { type: 'application/pdf' }),
    )
    expect(await screen.findByText('From alex.pdf')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(saved?.default_resume_filename).toBe('alex.pdf'))
  })
})

describe('Score page with a saved resume', () => {
  it('prefills an empty resume box and can switch back to the saved resume', async () => {
    const user = userEvent.setup()
    mockApi({ '/api/profile': () => json(savedProfile) })
    renderApp('/')

    await waitFor(() => expect(resumeField()).toHaveValue(RESUME_TEXT))
    expect(screen.queryByRole('button', { name: 'Use saved resume' })).not.toBeInTheDocument()

    fireEvent.change(resumeField(), { target: { value: 'A different resume for this one job.' } })
    await user.click(screen.getByRole('button', { name: 'Use saved resume' }))
    expect(resumeField()).toHaveValue(RESUME_TEXT)
  })

  it('does not overwrite a resume draft', async () => {
    localStorage.setItem('jobmatcher.draft.resume', 'My own draft resume text here.')
    mockApi({ '/api/profile': () => json(savedProfile) })
    renderApp('/')
    expect(await screen.findByRole('button', { name: 'Use saved resume' })).toBeInTheDocument()
    expect(resumeField()).toHaveValue('My own draft resume text here.')
  })

  it('Start over returns to the saved resume', async () => {
    const user = userEvent.setup()
    localStorage.setItem('jobmatcher.draft.jobDescription', JD_TEXT)
    localStorage.setItem('jobmatcher.draft.resume', 'Another resume entirely, typed by hand.')
    mockApi({ '/api/profile': () => json(savedProfile) })
    renderApp('/')
    await screen.findByRole('button', { name: 'Use saved resume' })
    await user.click(screen.getByRole('button', { name: 'Start over' }))
    expect(screen.getByRole('textbox', { name: 'Job description' })).toHaveValue('')
    expect(resumeField()).toHaveValue(RESUME_TEXT)
  })

  it('links a new result to its History entry', async () => {
    const user = userEvent.setup()
    mockApi({ '/api/score': () => json({ ...matchResult, history_id: 7 }) })
    renderApp('/')
    fireEvent.change(screen.getByRole('textbox', { name: 'Job description' }), { target: { value: JD_TEXT } })
    fireEvent.change(resumeField(), { target: { value: RESUME_TEXT } })
    await user.click(screen.getByRole('button', { name: 'Score resume' }))
    expect(await screen.findByRole('link', { name: 'Saved to History' })).toHaveAttribute('href', '/history/7')
  })
})

describe('HistoryPage', () => {
  it('lists past runs newest first, linking to each', async () => {
    mockApi({ '/api/history?limit=25&offset=0': () => json({ items: [summary], total: 1 }) })
    renderApp('/history')

    const list = await screen.findByRole('list', { name: 'Past scoring runs' })
    const row = within(list).getByRole('link')
    expect(row).toHaveAttribute('href', '/history/7')
    expect(within(row).getByText('Java Developer')).toBeInTheDocument()
    expect(within(row).getByLabelText('Score 78')).toBeInTheDocument()
    expect(within(row).getByText('Good match')).toBeInTheDocument()
    expect(within(row).getByText(/Alex Rivera .* Ollama · qwen2\.5-coder:14b/)).toBeInTheDocument()
    expect(screen.getByText('1 past scoring run, newest first.')).toBeInTheDocument()
  })

  it('shows an empty state', async () => {
    mockApi({ '/api/history?limit=25&offset=0': () => json({ items: [], total: 0 }) })
    renderApp('/history')
    expect(await screen.findByText('No history yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Score a resume' })).toHaveAttribute('href', '/')
  })

  it('clears all history after confirming', async () => {
    const user = userEvent.setup()
    let cleared = false
    mockApi({
      '/api/history?limit=25&offset=0': () => json(cleared ? { items: [], total: 0 } : { items: [summary], total: 1 }),
      '/api/history': (init) => {
        cleared = init?.method === 'DELETE'
        return new Response(null, { status: 204 })
      },
    })
    renderApp('/history')
    await user.click(await screen.findByRole('button', { name: 'Clear history' }))
    const dialog = screen.getByRole('dialog', { name: 'Clear all history?' })
    await user.click(within(dialog).getByRole('button', { name: 'Clear history' }))
    expect(await screen.findByText('No history yet')).toBeInTheDocument()
    expect(cleared).toBe(true)
  })
})

describe('HistoryDetailPage', () => {
  it('shows the saved result and inputs, and reopens them on the Score page', async () => {
    const user = userEvent.setup()
    mockApi({ '/api/history/7': () => json(entry) })
    const { router } = renderApp('/history/7')

    expect(await screen.findByRole('heading', { name: 'Java Developer' })).toBeInTheDocument()
    expect(screen.getByText(/^Alex Rivera, scored .* with Ollama · qwen2\.5-coder:14b$/)).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Match result' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Job description and resume' }))
    expect(screen.getByText(JD_TEXT)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open in Score page' }))
    expect(router.state.location.pathname).toBe('/')
    expect(screen.getByRole('textbox', { name: 'Job description' })).toHaveValue(JD_TEXT)
    expect(resumeField()).toHaveValue(RESUME_TEXT)
    expect(await screen.findByRole('region', { name: 'Match result' })).toBeInTheDocument()
  })

  it('deletes after confirming and returns to the list', async () => {
    const user = userEvent.setup()
    let deleted = false
    mockApi({
      '/api/history/7': (init) => {
        if (init?.method === 'DELETE') {
          deleted = true
          return new Response(null, { status: 204 })
        }
        return json(entry)
      },
      '/api/history?limit=25&offset=0': () => json({ items: [], total: 0 }),
    })
    const { router } = renderApp('/history/7')
    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/history'))
    expect(deleted).toBe(true)
  })

  it('explains when a run no longer exists', async () => {
    mockApi({ '/api/history/99': () => json({ detail: 'That scoring run no longer exists.' }, 404) })
    renderApp('/history/99')
    expect(await screen.findByText('That scoring run no longer exists.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All history' })).toHaveAttribute('href', '/history')
  })
})

describe('formatWhen', () => {
  const now = new Date(2026, 9, 23, 18, 0)
  it('uses Today / Yesterday / dates', () => {
    expect(formatWhen(new Date(2026, 9, 23, 9, 5).toISOString(), now)).toMatch(/^Today, /)
    expect(formatWhen(new Date(2026, 9, 22, 9, 5).toISOString(), now)).toMatch(/^Yesterday, /)
    expect(formatWhen(new Date(2026, 9, 1, 9, 5).toISOString(), now)).not.toMatch(/2026/)
    expect(formatWhen(new Date(2025, 11, 3, 9, 5).toISOString(), now)).toMatch(/2025/)
  })
})
