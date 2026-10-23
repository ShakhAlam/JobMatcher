# Job Matcher frontend

React + TypeScript + MUI single-page app built with Vite. See the project [README](../README.md),
[Getting started](../docs/getting-started.md) and [Architecture](../docs/architecture.md#frontend).

```bash
npm install
npm run dev       # http://localhost:5173 (proxies /api to http://localhost:8000)
npm test          # Vitest + Testing Library
npm run lint      # oxlint
npm run format    # Prettier
npm run build     # type-check and production build into dist/
```

Set `JOBMATCHER_API_URL` to proxy `/api` to a backend other than `http://localhost:8000`.
