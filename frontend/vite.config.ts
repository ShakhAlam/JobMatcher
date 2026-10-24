/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const backendUrl = process.env.JOBMATCHER_API_URL ?? 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Long-lived libraries in their own chunks: cached across app updates, and no single chunk
        // trips the 500 kB warning. MUI X Charts is left out so it stays in the lazy results chunk.
        codeSplitting: {
          groups: [
            // [\\/] matches both path separators.
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/, priority: 20 },
            { name: 'mui', test: /node_modules[\\/](@mui[\\/](?!x-)|@emotion[\\/])/, priority: 10 },
          ],
        },
      },
    },
  },
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
