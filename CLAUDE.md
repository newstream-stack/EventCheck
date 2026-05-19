# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Backend (from backend/)
npm run dev       # nodemon hot-reload on port 3001
npm start         # production start

# Frontend (from frontend/)
npm run dev       # Vite dev server on port 5173
npm run build     # production build
```

Both must run simultaneously. Vite proxies `/api/*` → `http://localhost:3001`.

## Architecture

Monorepo with two independent packages: `backend/` (Express) and `frontend/` (React + Vite). No shared package.json at root.

### Database: Google Sheets as a flat-file DB

All persistence goes through `backend/src/services/sheetsService.js`. Every read/write hits the Sheets API directly — there is no local cache or ORM.

Sheet layout:
- `users` — system accounts (staff/admin)
- `events` — event list
- `event_{event_id}` — one sheet per event, auto-created on first access; contains participant rows

**Row indexing convention in sheetsService:** `updateRow` and `deleteRow` take a 1-based data-row index (header = row 1, first data row = 2). Callers pass `arrayIndex + 1` because `getSheetData` returns a 0-based array without the header.

`getSheetData(sheetName)` reads all rows, treats row 0 as headers, returns `Array<Object>` keyed by header names.

### Backend

- **ES modules** (`"type": "module"` in package.json) — use `.js` extensions on all imports.
- `src/index.js` — Express entry; calls `ensureBaseSheets()` before `app.listen()` to guarantee `users` and `events` sheets exist.
- `src/config/googleSheets.js` — creates `GoogleAuth` at module level using env vars. Safe because `import 'dotenv/config'` in `index.js` is resolved before transitive deps in the ES module graph.
- `src/services/emailService.js` — **must** use `getTransporter()` (lazy factory) not a module-level transporter, because env vars must be read at call time, not at import time.
- Participants router uses `mergeParams: true` to access `:eid` from the parent route (`/api/events/:eid/participants`).

### Auth flow

JWT issued on login (8h expiry, secret from `JWT_SECRET` env). All routes except `/api/auth/login` require `Authorization: Bearer <token>`. Admin-only routes additionally call `requireAdmin`. The frontend axios client (`src/api/client.js`) auto-redirects to `/login` on 401.

### QR Code check-in

Each participant has a `qr_token` (UUID stored in their sheet row). The QR code encodes only the raw token string. `POST /api/events/:eid/participants/checkin` looks up the token, rejects duplicates, writes `checked_in=TRUE` and `checkin_time` back to Sheets. The scanner page uses `@zxing/browser` with the device camera.

### Registration ID format

`generateRegId(eventId, seq)` → `first 6 chars of event_id (uppercased) + "-" + 4-digit zero-padded seq`. Seq is derived from `existing.length + 1` at insertion time, so deleting rows can cause gaps but never duplicates.

### Excel import column mapping

Accepted column headers (Chinese or English):
- 姓名 / name
- email / Email
- 電話 / phone
- 單位 / unit

### Frontend

- `AuthContext` stores `user` and `token` in `localStorage`. `PrivateRoute` wraps protected pages.
- Each page co-locates its CSS file (e.g. `Events.jsx` + `Events.css`).
- Shared form field styles (`.field`, `.field input`, etc.) are defined in `App.css` and apply globally.
- Toast notifications via `react-hot-toast`.

## Environment variables (backend/.env)

| Variable | Description |
|---|---|
| `JWT_SECRET` | Sign/verify JWT tokens |
| `GOOGLE_SHEETS_ID` | Spreadsheet ID from URL |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email |
| `GOOGLE_PRIVATE_KEY` | Private key with literal `\n` (sheetsService replaces them) |
| `SMTP_HOST` | SMTP server host (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (default 587) |
| `SMTP_USER` | SMTP username / Gmail address |
| `SMTP_PASS` | SMTP password / Gmail App Password |
| `SMTP_FROM` | Sender email address |
| `FRONTEND_URL` | Used in email links (default `http://localhost:5173`) |

## First-run bootstrap

1. Fill `backend/.env`
2. Start backend — `ensureBaseSheets()` creates `users` and `events` tabs automatically
3. Manually insert first admin row into the `users` sheet (see SETUP.md for hash generation)
