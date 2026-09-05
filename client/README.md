# ITSM Platform — Frontend (Client)

React + TypeScript + Vite + Tailwind CSS frontend for the MERN-014 ITSM platform.

## Status

**Phase 0 — Foundation** complete. See `ai-context/FRONTEND-ROADMAP.md` for the phased plan.

## Tech Stack

- **React 18** + **TypeScript** + **Vite 5**
- **Tailwind CSS 3** (shadcn/ui theme tokens)
- **shadcn/ui** base components (Button, Card, Input, Label, Badge)
- **React Router v6** (foundation)
- **Redux Toolkit** (foundation)
- **TanStack React Query** (data fetching layer)
- **Axios** (centralized `apiClient`)
- **Sonner** (toast notifications)
- **Zod + react-hook-form** (form validation — used in later phases)
- **ESLint** + **Prettier** (linting and formatting)

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment template (already provided in .env.example)
cp .env.example .env

# Start the dev server
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint

# Production build
npm run build
```

## Environment Variables

Variables are read at build time and must be prefixed with `VITE_`.

| Variable | Description | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:5000/api/v1` |
| `VITE_APP_NAME` | Application display name | `ITSM Platform` |
| `VITE_APP_VERSION` | Application version | `0.1.0` |

## Project Structure

```
client/
├── src/
│   ├── components/
│   │   └── ui/         # shadcn/ui base components
│   ├── config/         # Static config (fonts, etc.)
│   ├── lib/
│   │   ├── apiClient.ts  # Centralized Axios client
│   │   └── utils.ts      # cn() helper, etc.
│   ├── pages/          # Page components
│   ├── store/          # Redux Toolkit store foundation
│   └── styles/         # Global CSS and Tailwind entry
├── public/             # Static assets
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
└── tsconfig.json
```

## Backend Integration

The centralized Axios `apiClient` reads `VITE_API_BASE_URL` and uses the backend contract from `docs/api/backend-reference.md`. The current backend base URL is `http://localhost:5000/api/v1` with success shape `{ success: true, data }` and error shape `{ success: false, message }`.

## Next Phase

Phase 1 (Authentication & Layout) is queued and starts only after explicit confirmation.
