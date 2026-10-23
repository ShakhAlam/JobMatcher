import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderApp, stubFetch } from '../test/renderApp'

describe('AppShell', () => {
  beforeEach(() => {
    stubFetch()
  })

  it('renders the score page with the sidebar navigation', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Score a resume' })).toBeInTheDocument()

    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    for (const label of ['Score', 'History', 'Profile', 'Settings']) {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument()
    }
    expect(within(nav).getByRole('link', { name: 'Score' })).toHaveAttribute('aria-current', 'page')
  })

  it('navigates between pages from the sidebar', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/')
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })

    await user.click(within(nav).getByRole('link', { name: 'Settings' }))
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/settings')
    expect(within(nav).getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Score' })).not.toHaveAttribute('aria-current')
  })

  it('collapses the desktop sidebar to icons and remembers it', async () => {
    const user = userEvent.setup()
    renderApp('/')
    expect(screen.getByText('Job Matcher v0.1')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Toggle navigation' }))
    expect(screen.queryByText('Job Matcher v0.1')).not.toBeInTheDocument()
    // Collapsed items keep an accessible name for screen readers.
    expect(screen.getByRole('link', { name: 'History' })).toBeInTheDocument()
    expect(localStorage.getItem('jobmatcher.sidenav.expanded')).toBe('false')
  })

  it('opens Profile from the account menu', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await user.click(screen.getByRole('button', { name: 'Open account menu' }))
    await user.click(screen.getByRole('menuitem', { name: 'Profile' }))
    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument()
  })

  it('shows a not-found page for unknown routes', async () => {
    renderApp('/nope')
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})

describe('theme toggle', () => {
  beforeEach(() => {
    stubFetch()
  })

  it('defaults to dark and switches to light', async () => {
    const user = userEvent.setup()
    renderApp('/')

    const toLight = await screen.findByRole('button', { name: 'Switch to light mode' })
    expect(document.documentElement).toHaveClass('dark')

    await user.click(toLight)
    expect(await screen.findByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument()
    expect(document.documentElement).toHaveClass('light')
    expect(localStorage.getItem('jobmatcher.color-mode')).toBe('light')
  })

  it('restores a saved light preference', async () => {
    localStorage.setItem('jobmatcher.color-mode', 'light')
    renderApp('/')
    expect(await screen.findByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument()
  })
})

describe('API status chip', () => {
  it('shows online when the health check succeeds', async () => {
    stubFetch(200, { status: 'ok' })
    renderApp('/')
    expect(await screen.findByText('API online')).toBeInTheDocument()
  })

  it('shows offline when the backend errors', async () => {
    stubFetch(502, { detail: 'Bad gateway' })
    renderApp('/')
    expect(await screen.findByText('API offline')).toBeInTheDocument()
  })
})
