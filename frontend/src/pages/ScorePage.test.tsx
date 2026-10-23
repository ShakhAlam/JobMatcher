import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { JD_TEXT, matchResult, RESUME_TEXT } from '../test/fixtures'
import { json, mockApi, renderApp } from '../test/renderApp'

const jdField = () => screen.getByRole('textbox', { name: 'Job description' })
const resumeField = () => screen.getByRole('textbox', { name: 'Resume' })
const scoreButton = () => screen.getByRole('button', { name: /score resume|score again/i })

/** Paste-style input: one change event instead of typing character by character. */
function fill(field: HTMLElement, text: string) {
  fireEvent.change(field, { target: { value: text } })
}

describe('ScorePage', () => {
  it('enables scoring only when both inputs have enough text', async () => {
    mockApi({})
    renderApp('/')
    expect(scoreButton()).toBeDisabled()
    expect(screen.getByText('Add a job description and a resume to score.')).toBeInTheDocument()

    fill(jdField(), JD_TEXT)
    expect(screen.getByText('Add a resume to score.')).toBeInTheDocument()
    fill(resumeField(), 'too short')
    expect(screen.getByText('Enter at least 20 characters')).toBeInTheDocument()
    expect(scoreButton()).toBeDisabled()

    fill(resumeField(), RESUME_TEXT)
    expect(scoreButton()).toBeEnabled()
  })

  it('scores and shows the result with explanations', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi({ '/api/score': () => json(matchResult) })
    renderApp('/')
    fill(jdField(), JD_TEXT)
    fill(resumeField(), RESUME_TEXT)
    await user.click(scoreButton())

    const result = await screen.findByRole('region', { name: 'Match result' })
    const scoreCall = fetchMock.mock.calls.find(([url]) => url === '/api/score')
    expect(JSON.parse(String(scoreCall?.[1]?.body))).toEqual({ job_description: JD_TEXT, resume: RESUME_TEXT })

    expect(within(result).getByText('78')).toBeInTheDocument()
    expect(within(result).getByText('Good match')).toBeInTheDocument()
    expect(
      within(result).getByRole('progressbar', { name: /Overall score 78 out of 100, Good match/ }),
    ).toBeInTheDocument()
    expect(within(result).getByText('Alex Rivera for Java Developer')).toBeInTheDocument()
    expect(within(result).getByText(/Scored by Ollama · llama3.1:8b in 1m 03s/)).toBeInTheDocument()

    // Every criterion has its explanation, weight and score.
    for (const criterion of matchResult.criteria) {
      const section = within(result).getByRole('region', { name: criterion.label })
      expect(within(section).getByText(criterion.rationale)).toBeInTheDocument()
      expect(within(section).getByText(`${Math.round(criterion.weight * 100)}% weight`)).toBeInTheDocument()
    }
    expect(within(result).getByText('Deep Spring Boot experience')).toBeInTheDocument()
    expect(within(result).getByText('No Java EE platform experience')).toBeInTheDocument()
    expect(within(result).getByText('Mention JPA work explicitly')).toBeInTheDocument()
    expect(within(result).getByText('Earn the Oracle Java certification')).toBeInTheDocument()
    expect(scoreButton()).toHaveTextContent('Score again')
  })

  it('shows the API error and can retry', async () => {
    const user = userEvent.setup()
    let calls = 0
    mockApi({
      '/api/score': () =>
        ++calls === 1 ? json({ detail: 'Cannot reach Ollama at http://localhost:11434.' }, 502) : json(matchResult),
    })
    renderApp('/')
    fill(jdField(), JD_TEXT)
    fill(resumeField(), RESUME_TEXT)
    await user.click(scoreButton())

    expect(await screen.findByText('Cannot reach Ollama at http://localhost:11434.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('region', { name: 'Match result' })).toBeInTheDocument()
    expect(screen.queryByText(/Cannot reach Ollama/)).not.toBeInTheDocument()
  })

  it('shows progress and can cancel a running score', async () => {
    const user = userEvent.setup()
    let signal: AbortSignal | undefined
    mockApi({
      '/api/score': (init) =>
        new Promise<Response>((_, reject) => {
          signal = init?.signal ?? undefined
          signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        }),
    })
    renderApp('/')
    fill(jdField(), JD_TEXT)
    fill(resumeField(), RESUME_TEXT)
    await user.click(scoreButton())

    expect(await screen.findByText('Scoring the resume')).toBeInTheDocument()
    expect(jdField()).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(signal?.aborted).toBe(true)
    await waitFor(() => expect(screen.queryByText('Scoring the resume')).not.toBeInTheDocument())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(scoreButton()).toBeEnabled()
  })

  it('keeps inputs and the result when navigating away and back', async () => {
    const user = userEvent.setup()
    mockApi({ '/api/score': () => json(matchResult) })
    const { router } = renderApp('/')
    fill(jdField(), JD_TEXT)
    fill(resumeField(), RESUME_TEXT)
    await user.click(scoreButton())
    await screen.findByRole('region', { name: 'Match result' })

    await act(() => router.navigate('/settings'))
    await act(() => router.navigate('/'))
    expect(jdField()).toHaveValue(JD_TEXT)
    expect(screen.getByRole('region', { name: 'Match result' })).toBeInTheDocument()
    expect(localStorage.getItem('jobmatcher.draft.resume')).toBe(RESUME_TEXT)
  })

  it('restores saved drafts and clears everything on Start over', async () => {
    const user = userEvent.setup()
    mockApi({})
    localStorage.setItem('jobmatcher.draft.jobDescription', JD_TEXT)
    renderApp('/')
    expect(jdField()).toHaveValue(JD_TEXT)

    await user.click(screen.getByRole('button', { name: 'Start over' }))
    expect(jdField()).toHaveValue('')
    expect(localStorage.getItem('jobmatcher.draft.jobDescription')).toBeNull()
  })
})

describe('document upload', () => {
  it('fills the field from an uploaded file and shows its details and warnings', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi({
      '/api/extract-text': () =>
        json({
          filename: 'resume.pdf',
          file_type: 'pdf',
          text: RESUME_TEXT,
          char_count: RESUME_TEXT.length,
          pages: 2,
          warnings: ['Little or no text was found.'],
        }),
    })
    renderApp('/')
    const file = new File(['%PDF-1.7'], 'resume.pdf', { type: 'application/pdf' })
    await user.upload(screen.getByLabelText('Upload resume file'), file)

    await waitFor(() => expect(resumeField()).toHaveValue(RESUME_TEXT))
    expect(screen.getByText(`resume.pdf — PDF · 2 pages · ${RESUME_TEXT.length} characters`)).toBeInTheDocument()
    expect(screen.getByText('Little or no text was found.')).toBeInTheDocument()

    const uploadCall = fetchMock.mock.calls.find(([url]) => url === '/api/extract-text')
    const body = uploadCall?.[1]?.body as FormData
    expect((body.get('file') as File).name).toBe('resume.pdf')
  })

  it('shows extraction errors without touching the text', async () => {
    // Dropped files bypass the input's accept filter, so the server must reject them.
    const user = userEvent.setup({ applyAccept: false })
    mockApi({
      '/api/extract-text': () => json({ detail: 'Legacy .doc files are not supported.' }, 415),
    })
    renderApp('/')
    fill(jdField(), JD_TEXT)
    await user.upload(
      screen.getByLabelText('Upload job description file'),
      new File(['x'], 'old.doc', { type: 'application/msword' }),
    )
    expect(await screen.findByText('Legacy .doc files are not supported.')).toBeInTheDocument()
    expect(jdField()).toHaveValue(JD_TEXT)
  })

  it('rejects files over the size limit before uploading', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi({})
    renderApp('/')
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'huge.pdf', { type: 'application/pdf' })
    await user.upload(screen.getByLabelText('Upload resume file'), big)
    expect(await screen.findByText('huge.pdf is larger than 5 MB.')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/extract-text')).toBe(false)
  })
})
