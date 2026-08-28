# Raspored — Work Shift Scheduling

A small work-scheduling app with two roles:

- **Admin** (`VUKAS`) — creates shift cards (date, start → end time, number of workers needed) and sees who applied to each shift.
- **Employee** — sees all shift cards and applies to the ones that still have free spots (name, surname, phone). A shift only accepts as many applicants as the admin requested.

Built with Next.js 16 (App Router) + TypeScript, using **Neon Postgres** for storage.

## Log in

| Role     | Username   | Password     |
| -------- | ---------- | ------------ |
| Admin    | `VUKAS`    | `gocamiaiva` |
| Employee | `employee` | `vukasr123`  |

## Run locally

```bash
npm install
# create .env.local with your Neon connection string:
#   DATABASE_URL="postgresql://..."
npm run dev        # http://localhost:3000
```

Or run the production build:

```bash
npm run build
npm run start      # http://localhost:3000
```

Use `npm run start -- -p 3001` to pick a different port.

## Data & storage

- Shifts and applications are stored in **Postgres** (Neon). The table (`shifts`) is created automatically on first use.
- Everything is isolated in `lib/store.ts` — a thin layer with `getShifts`, `getShift`, `addShift`, `updateShift`, `deleteShift`.
- Sessions are stateless JWT cookies signed with `AUTH_SECRET` (optional; falls back to a dev secret). Set `AUTH_SECRET` in your env for production.
- The table schema:

```sql
CREATE TABLE IF NOT EXISTS shifts (
  id         TEXT PRIMARY KEY,
  date       TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time   TEXT NOT NULL,
  needed     INTEGER NOT NULL,
  applicants JSONB NOT NULL DEFAULT '[]'::jsonb
);
```

## Deploying to Vercel

1. Push this repo to GitHub.
2. In the Vercel project, add environment variables:
   - `DATABASE_URL` — your Neon connection string (from Neon console → Connection string → **Pooled**).
   - `AUTH_SECRET` (optional) — any long random string.
3. Deploy. No other config needed.

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
  store.ts      Postgres storage (Neon)
  actions.ts    Server Actions (login, create shift, apply, withdraw…)
```
