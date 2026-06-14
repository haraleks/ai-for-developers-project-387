# AGENTS.md

Hexlet learning project: Calendar Booking Service (Calendly-like). No backend exists yet — only an API contract and a frontend.

## Layout

- `main.tsp` — TypeSpec API contract, the source of truth for the API. Doc comments and domain rules are in Russian; keep that style.
- `tsp-output/schema/openapi.yaml` — generated from `main.tsp`, gitignored. Never edit; regenerate with `npx tsp compile .` from the repo root.
- `frontend/` — React 19 + Vite + Tailwind v4 + shadcn/ui (JSX, not TSX). Separate `package.json`; run npm commands inside `frontend/`.
- Root `package.json` only holds TypeSpec deps; it has no scripts.

## Commands

- Compile API schema: `npx tsp compile .` (repo root)
- Frontend dev: `cd frontend && npm install && npm run dev`
- Frontend lint: `npm run lint` (in `frontend/`); build: `npm run build`
- There are no tests in the repo. CI is the Hexlet checker only.

## Frontend conventions

- Plain JavaScript/JSX; `@/` alias maps to `frontend/src` (see `vite.config.js` and `jsconfig.json`).
- shadcn/ui configured via `frontend/components.json` (style "new-york", `cssVariables`, lucide icons); generated components live in `src/components/ui/`. Add new ones with the shadcn CLI rather than hand-writing.
- All API calls go through `frontend/src/api/client.js`, which mirrors `main.tsp` exactly and throws `ApiError { code, message }`. When the contract changes, update the client to match.
- Backend base URL comes from `VITE_API_BASE_URL` env var (e.g. `frontend/.env`); the client errors clearly if it's unset.

## Domain rules (from the contract)

- No auth/registration; one predefined owner.
- Slots are computed (not stored) for a 30-day window starting today.
- Two bookings can never share the same start time, even across event types — booking conflicts return 409.

## Constraints

- Do not edit, delete, or rename `.github/workflows/hexlet-check.yml`, and do not rename the repository — Hexlet's automated checks depend on them.
