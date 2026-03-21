// Custom HTTP server that runs Next.js alongside a WebSocket server.
// WebSockets can't be handled inside Next.js route handlers, so we attach
// the ws.Server to the same underlying HTTP server that Next.js uses.

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { settingsLoader } from './src/lib/settingsLoader';
import { startPlayerStatsCollection } from './src/lib/playerStatsCollector';
import { initEggCatalogue } from './src/lib/eggCatalogue';
import { getIronSession } from 'iron-session';
import { sessionOptions } from './src/lib/session';
import type { SessionData } from './src/lib/session';
import prisma from './src/lib/prisma';
import { daemonSchemeSync } from './src/lib/daemon';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

// Keep track of usernames with active WS connections
export const onlineUsers: Set<string> = new Set();
const userTimeouts: Map<string, NodeJS.Timeout> = new Map();

async function getUserFromRequest(req: IncomingMessage): Promise<{ id: number; username: string } | null> {
  try {
    // iron-session reads from the cookie header on the raw request
    const fakeRes = {
      getHeader: () => undefined,
      setHeader: () => {},
    } as any;

    const session = await getIronSession<SessionData>(req as any, fakeRes, sessionOptions);
    if (!session.user?.id) return null;

    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { id: true, username: true },
    });

    return user?.username ? { id: user.id, username: user.username } : null;
  } catch {
    return null;
  }
}

async function handleConsoleProxy(
  ws: WebSocket,
  req: IncomingMessage,
  serverId: string,
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    ws.close();
    return;
  }

  const server = await prisma.server.findUnique({
    where: { UUID: serverId },
    include: { node: true },
  });

  if (!server) {
    ws.send(JSON.stringify({ error: 'Server not found' }));
    ws.close();
    return;
  }

  // Check ownership or admin
  const fullUser = await prisma.users.findUnique({ where: { id: user.id } });
  if (!fullUser?.isAdmin && server.ownerId !== user.id) {
    ws.close();
    return;
  }

  const { node } = server;
  const scheme = daemonSchemeSync() === 'https' ? 'wss' : 'ws';
  const upstream = new WebSocket(
    `${scheme}://${node.address}:${node.port}/ws/console/${serverId}`,
  );

  upstream.onopen = () => {
    upstream.send(JSON.stringify({ event: 'auth', args: [node.key] }));
  };

  upstream.onmessage = (msg) => ws.send(msg.data);
  upstream.onerror = () => {
    ws.send('\x1b[31;1mThis instance is unavailable!\x1b[0m');
  };
  upstream.onclose = () => ws.close();

  ws.onmessage = (msg) => upstream.send(msg.data);
  ws.on('close', () => upstream.close());
}

async function handleStatsProxy(
  ws: WebSocket,
  req: IncomingMessage,
  serverId: string,
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    ws.close();
    return;
  }

  const server = await prisma.server.findUnique({
    where: { UUID: serverId },
    include: { node: true },
  });

  if (!server) {
    ws.close();
    return;
  }

  const fullUser = await prisma.users.findUnique({ where: { id: user.id } });
  if (!fullUser?.isAdmin && server.ownerId !== user.id) {
    ws.close();
    return;
  }

  const { node } = server;
  const scheme = daemonSchemeSync() === 'https' ? 'wss' : 'ws';
  const upstream = new WebSocket(
    `${scheme}://${node.address}:${node.port}/ws/stats/${serverId}`,
  );

  upstream.onopen = () => {
    upstream.send(JSON.stringify({ event: 'auth', args: [node.key] }));
  };

  upstream.onmessage = (msg) => ws.send(msg.data);
  upstream.onerror = () => ws.close();
  upstream.onclose = () => ws.close();

  ws.on('close', () => upstream.close());
}

async function handleOnlineCheck(ws: WebSocket, req: IncomingMessage) {
  const user = await getUserFromRequest(req);
  if (!user) {
    ws.close();
    return;
  }

  const { username } = user;

  const existingTimeout = userTimeouts.get(username);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
    userTimeouts.delete(username);
  }

  onlineUsers.add(username);
  ws.send(JSON.stringify({ online: true }));

  ws.on('close', () => {
    const timeout = setTimeout(() => {
      onlineUsers.delete(username);
      userTimeouts.delete(username);
    }, 1000);
    userTimeouts.set(username, timeout);
  });
}

app.prepare().then(async () => {
  await settingsLoader();

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    const parsedUrl = parse(req.url || '', true);
    const pathname = parsedUrl.pathname || '';

    const consoleMatch = pathname.match(/^\/ws\/console\/(.+)$/);
    const statsMatch = pathname.match(/^\/ws\/stats\/(.+)$/);
    const onlineMatch = pathname === '/ws/online-check';

    if (consoleMatch || statsMatch || onlineMatch) {
      wss.handleUpgrade(req, socket as any, head, (ws) => {
        if (consoleMatch) handleConsoleProxy(ws, req, consoleMatch[1]);
        else if (statsMatch) handleStatsProxy(ws, req, statsMatch[1]);
        else handleOnlineCheck(ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  httpServer.listen(port, () => {
    startPlayerStatsCollection();
    initEggCatalogue().catch(() => {});
    console.log(`> AirLink ready on http://localhost:${port}`);
  });
});
