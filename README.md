# Airlink Panel — Next.js

A one-to-one port of the Airlink Panel from Express to Next.js 15 / React 19.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and set values
cp .env.example .env
# Edit .env — set SESSION_SECRET to a random 32+ char string

# 3. Push the database schema
npm run db:push

# 4. Start in dev mode
npm run dev

# 5. Visit http://localhost:3000 — you will be redirected to /register to create the first admin account
```

## Production

```bash
npm run build
npm start
```

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLite path, e.g. `file:./prisma/dev.db` |
| `SESSION_SECRET` | At least 32 chars, keep private |
| `NODE_ENV` | `development` or `production` |
| `ENFORCE_DAEMON_HTTPS` | Set to `true` to use HTTPS/WSS for daemon connections |
| `HOST` | Bind address (default `0.0.0.0`) |
| `PORT` | Port (default `3000`) |
