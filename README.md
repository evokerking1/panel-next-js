# AirLink — Next.js

This is the Next.js port of the AirLink game server management panel.

## Setup

```bash
cp example.env .env
# Edit .env with your database URL and session secret

npm install
npm run dev
```

## Architecture

- **Framework**: Next.js 15 App Router
- **Database**: Prisma + SQLite (same schema as original)
- **Auth**: iron-session (replaces express-session)
- **WebSockets**: Custom server (`server.ts`) — Next.js doesn't support WebSockets natively, so we attach a `ws.Server` to the same HTTP server that Next.js uses.
- **Styling**: Tailwind CSS (same design system as original)

## Key differences from the Express version

| Express | Next.js |
|---|---|
| `express-session` | `iron-session` (cookie-based, no DB store needed) |
| EJS templates | React Server Components + Client Components |
| `express-ws` | Custom server with `ws` package |
| CSRF via `csurf` | Built-in — Next.js Server Actions use CSRF-safe POST |
| Module loader | Next.js App Router (file-based routing) |
| Mobile/desktop EJS split | Responsive CSS (one codebase) |

## WebSocket endpoints

- `ws://host/ws/console/:serverUUID` — proxies console to daemon
- `ws://host/ws/stats/:serverUUID` — proxies stats stream to daemon  
- `ws://host/ws/online-check` — tracks online users

## Addon system

Addons that registered Express routes will need updating. The addon API surface in `src/lib/addonHandler.ts` exposes `registerRoute` which can be called at server startup via `server.ts`. Addon views (EJS) are not supported — addons need React components.

## Production

```bash
npm run build
npm start
```
