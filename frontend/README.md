# Job Matcher frontend

React + TypeScript + MUI app (Vite). In development, `/api` is proxied to the backend at
`http://localhost:8000` (override with `JOBMATCHER_API_URL`).

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # Vitest + Testing Library
npm run lint      # oxlint
npm run format    # Prettier
npm run build     # type-check and production build
```

Structure:

- `src/theme/` – dark/light MUI theme (dark by default; choice saved in localStorage)
- `src/layout/` – app bar, collapsible sidebar, page shell
- `src/pages/` – Score, History, Profile, Settings
- `src/api/` – fetch wrapper that surfaces FastAPI error details
