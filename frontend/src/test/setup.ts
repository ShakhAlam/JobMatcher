import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom has no matchMedia. Evaluate simple min/max-width queries against window.innerWidth
// (1024px by default, i.e. desktop) so MUI's useMediaQuery behaves realistically.
function evaluate(query: string): boolean {
  const min = /min-width:\s*([\d.]+)px/.exec(query)
  const max = /max-width:\s*([\d.]+)px/.exec(query)
  if (!min && !max) return false
  const width = window.innerWidth
  return (!min || width >= Number(min[1])) && (!max || width <= Number(max[1]))
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: evaluate(query),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  document.documentElement.className = ''
  vi.unstubAllGlobals()
})
