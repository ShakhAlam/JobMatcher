import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { JD_TEXT, matchResult, RESUME_TEXT } from '../test/fixtures'
import { json, mockApi, renderApp } from '../test/renderApp'

// Make one page fail to render so the route error boundary is exercised.
vi.mock('./HistoryPage', () => ({
  default: () => {
    throw new Error('History exploded')
  },
}))

describe('result rendering resilience', () => {
  it('renders a result from a backend that omits the advice lists', async () => {
    const user = userEvent.setup()
    const { resume_tips: _tips, skills_to_build: _skills, ...older } = matchResult
    mockApi({ '/api/score': () => json(older) })
    renderApp('/')
    fireEvent.change(screen.getByRole('textbox', { name: 'Job description' }), { target: { value: JD_TEXT } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Resume' }), { target: { value: RESUME_TEXT } })
    await user.click(screen.getByRole('button', { name: 'Score resume' }))

    const result = await screen.findByRole('region', { name: 'Match result' })
    expect(within(result).getByText('No missing skills to build.')).toBeInTheDocument()
  })

  it('shows page errors inside the shell so navigation keeps working', async () => {
    mockApi({})
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { router } = renderApp('/')

    await act(() => router.navigate('/history'))
    expect(await screen.findByText('Something went wrong on this page')).toBeInTheDocument()
    expect(screen.getByText('History exploded')).toBeInTheDocument()

    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    await act(() => router.navigate('/settings'))
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page')
    consoleError.mockRestore()
  })
})
