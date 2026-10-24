import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { emptyProfile, userSettings } from '../test/fixtures'
import { json, mockApi, renderApp } from '../test/renderApp'

/** Fails like an unreachable backend until `recover()` is called, then returns `body`. */
function failsUntilRecovered(body: unknown) {
  let down = true
  return {
    handler: () => (down ? json({ detail: 'Bad gateway' }, 502) : json(body)),
    recover: () => {
      down = false
    },
  }
}

describe('pages that fail to load', () => {
  it.each([
    ['/history', '/api/history?limit=25&offset=0', 'history', { items: [], total: 0 }, 'No history yet'],
    ['/profile', '/api/profile', 'your profile', emptyProfile, 'About you'],
    ['/settings', '/api/settings', 'settings', userSettings, 'Model provider'],
  ])('%s shows the error and recovers with Try again', async (path, url, what, body, loadedText) => {
    const user = userEvent.setup()
    // Other parts of the app (top bar, Score workspace) may fetch the same data, so keep failing
    // until the user is about to retry.
    const backend = failsUntilRecovered(body)
    mockApi({ [url]: backend.handler })
    renderApp(path)

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText(`Couldn't load ${what}`)).toBeInTheDocument()
    expect(within(alert).getByText('Bad gateway')).toBeInTheDocument()

    backend.recover()
    await user.click(within(alert).getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText(loadedText)).toBeInTheDocument()
    expect(screen.queryByText(`Couldn't load ${what}`)).not.toBeInTheDocument()
  })

  it('keeps the way back to History when a run fails to load', async () => {
    mockApi({ '/api/history/3': () => json({ detail: 'Bad gateway' }, 502) })
    renderApp('/history/3')
    expect(await screen.findByText("Couldn't load this scoring run")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All history' })).toHaveAttribute('href', '/history')
  })
})
