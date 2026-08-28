# Raspored — Work Shift Scheduling

A small work-scheduling app with two roles:

- **Admin** (`VUKAS`) — creates shift cards (date, start → end time, number of workers needed) and sees who applied to each shift.
- **Employee** — sees all shift cards and applies to the ones that still have free spots (name, surname, phone). A shift only accepts as many applicants as the admin requested.

Built with Next.js 16 (App Router) + TypeScript, no external database — data is stored in a local JSON file.

## Log in

| Role     | Username   | Password     |
| -------- | ---------- | ------------ |
| Admin    | `VUKAS`    | `gocamiaiva` |
| Employee | `employee` | `vukasr123`  |

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Or run the production build:

```bash
npm run build
npm run start      # http://localhost:3000
```

Use `npm run start -- -p 3001` to pick a different port.

## How data is stored

- Shifts and applications live in `data/db.json` (created automatically on first write).
- Sessions are stateless JWT cookies signed with `AUTH_SECRET`.
- Set a stable `AUTH_SECRET` in `.env.local` for your environment (any long random string). Without it, a local-dev fallback secret is used.

```bash
echo 'AUTH_SECRET=generate-a-long-random-string-here' > .env.local
```

## Deploying to Vercel — important

The app works out of the box on Vercel, **but** JSON-file storage is only suitable for local use:

- Vercel's serverless filesystem is **ephemeral and read-only** — shifts you create will disappear after a cold start, and file writes can fail entirely.
- For a real deployment, swap the storage layer for a database. The store is isolated in `lib/store.ts` (only async functions: `getShifts`, `getShift`, `addShift`, `updateShift`, `deleteShift`), so replacing it with e.g. Neon Postgres is a small, contained change.

Everything else (auth, panels, application logic) is deployment-agnostic.

## Project structure

```
app/
  login/        login page
  admin/        admin panel (create shifts, review applicants)
  employee/     employee panel (apply to shifts)
components/     forms + shift cards (client components)
lib/
  types.ts      shared types
  accounts.ts   fixed accounts + credential check
  session.ts    JWT session (jose)
  store.ts      JSON file storage (swap for a real DB on Vercel)
  actions.ts    Server Actions (login, create shift, apply, withdraw…)
data/db.json    persisted data (local dev)
```
