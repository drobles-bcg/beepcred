# BeepCred

Community-driven license plate cred: photograph plates, rate driver behavior (+1 / -1), comment, and browse the feed.

## Stack

- **Frontend:** React 19, Vite, Metronic (starter kit), TanStack Query, Axios, Recharts, Tailwind 4, React Router 7
- **Backend:** Node.js, Express, Sequelize, SQLite, express-session (SQLite store), bcrypt, multer, sharp

## Setup

1. Copy environment:

   ```bash
   cp .env.example .env
   ```

   Adjust `PORT` (default `3010`), `SESSION_SECRET`, and `CLIENT_ORIGIN` (`http://localhost:5180`).

2. Install dependencies:

   ```bash
   npm install
   cd server && npm install
   cd ../client && npm install
   ```

   Client uses `legacy-peer-deps` (see `client/.npmrc`) for React 19 + `react-helmet-async`.

3. Create database and seed:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. Run both apps:

   ```bash
   npm run dev
   ```

- **Frontend:** http://localhost:5180  
- **API:** http://localhost:3010  
- Vite proxies `/api` and `/uploads` to the API.

## Seed users

| Username | Password | Role   |
|----------|----------|--------|
| admin    | admin    | admin  |
| mod      | mod      | moderator |
| user     | user     | user   |

## Metronic template

The UI is based on **Metronic v9.4.2** React TypeScript Vite starter kit. Your copy can live anywhere; this repo’s `client/` was initialized from that starter and wired to BeepCred routes.

## Project layout

```
beepcred/
├── client/          # Vite React app
├── server/          # Express API, Sequelize models, uploads
├── package.json     # concurrently: dev, db:migrate, db:seed
└── .env
```

## API overview

- `POST /api/auth/register|login|logout` — session cookies (`httpOnly`, `sameSite: lax`)
- `GET /api/auth/me`
- `GET|POST /api/plates` — feed and create plate
- `GET /api/plates/:state/:plate` — plate by state + number
- `GET|POST /api/plates/:id/images` — list / upload image
- `GET|POST /api/plates/:id/votes|comments|sentiment|stats`
- `GET /api/users/:username`, `PUT /api/users/me`, `POST /api/users/me/avatar`
- `GET /api/search/plates`, `/api/search/users`
- `POST /api/reports`
- `GET /api/admin/*` — admin/moderator only

## Notes

- Uploaded files live under `server/uploads/` (gitignored except `.gitkeep`).
- SQLite files: `server/db/database.sqlite`, `server/db/sessions.sqlite`.
- For production, set `secure: true` on session cookies and use HTTPS.
