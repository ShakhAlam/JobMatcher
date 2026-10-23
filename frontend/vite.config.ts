/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const backendUrl = process.env.JOBMATCHER_API_URL ?? 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Scoring can take minutes on local models, so don't let the proxy time out first.
      '/api': { target: backendUrl, changeOrigin: true, timeout: 15 * 60_000, proxyTimeout: 15 * 60_000 },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Above Testing Library's 5s findBy timeout so a slow query fails with its own message.
    testTimeout: 15_000,
  },
})
