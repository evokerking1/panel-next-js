import { ensureEnvLoaded } from './src/lib/env';
import { createServer } from 'http';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import { getIronSession } from 'iron-session';
import { IncomingMessage, ServerResponse } from 'http';
import { installDaemonRequestInterceptor, daemonScheme } from './src/lib/daemon';
import { normalizeHost } from './src/lib/server/network-address';
import { sessionOptions } from './src/lib/session/session-options';

ensureEnvLoaded();
installDaemonRequestInterceptor();

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

function color(code: number, text: string) {
  return `\x1b[${code}m${text}\x1b[0m`;
}

function hexToAnsi(hex: string, text: string) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
}

function printStartupBanner(serverPort: number) {
  const ascii = [
    '                                              ',
    '  /$$$$$$ /$$         /$$/$$         /$$      ',
    ' /$$__  $|__/        | $|__/        | $$      ',
    '| $$  \\ $$/$$ /$$$$$$| $$/$$/$$$$$$$| $$   /$$',
    '| $$$$$$$| $$/$$__  $| $| $| $$__  $| $$  /$$/',
    '| $$__  $| $| $$  \\__| $| $| $$  \\ $| $$$$$$/ ',
    '| $$  | $| $| $$     | $| $| $$  | $| $$_  $$ ',
    '| $$  | $| $| $$     | $| $| $$  | $| $$ \\  $$',
    '|__/  |__|__|__/     |__|__|__/  |__|__/  \\__/',
    '                                              ',
  ];

  const shades = ['#ffffff', '#f2f2f2', '#e8e8e8', '#dddddd', '#d2d2d2', '#c7c7c7', '#bcbcbc', '#b0b0b0', '#a4a4a4', '#9a9a9a'];
  for (const [index, line] of ascii.entries()) {
    console.log(hexToAnsi(shades[index] || '#ffffff', line));
  }

  const boxWidth = 55;
  const border = color(90, `+${'-'.repeat(boxWidth)}+`);
  const padLine = (text: string) => {
    const padding = ' '.repeat(Math.max(0, boxWidth - text.length));
    return `${color(92, '|')}${color(97, text)}${color(97, padding)}${color(92, '|')}`;
  };

  const publicHost = hostname === '0.0.0.0' ? 'localhost' : hostname;
  console.log(border);
  console.log(padLine(`Initializing ${dev ? 'development' : 'production'} panel server.`));
  console.log(padLine(`Server running on http://${publicHost}:${serverPort}`));
  console.log(border);
}

async function getSessionUser(req: IncomingMessage) {
  try {
    const res = new ServerResponse(req);
    const session = await getIronSession<{ user?: { id: number; isAdmin: boolean } }>(
      req as Parameters<typeof getIronSession>[0],
      res,
      sessionOptions,
    );
    return session.user ?? null;
  } catch {
    return null;
  }
}

async function proxyConsole(
  clientWs: WebSocket,
  daemonWsUrl: string,
  nodeKey: string,
) {
  const daemonWs = new WebSocket(daemonWsUrl);
  let receivedData = false;

  daemonWs.on('open', () => {
    daemonWs.send(JSON.stringify({ event: 'auth', args: [nodeKey] }));
  });

  daemonWs.on('message', (data, isBinary) => {
    receivedData = true;
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(isBinary ? data : data.toString());
    }
  });

  daemonWs.on('error', () => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send('\x1b[31;1mThis instance is unavailable!\x1b[0m');
    }
  });

  daemonWs.on('close', () => {
    if (clientWs.readyState !== WebSocket.OPEN) return;

    clientWs.send(
      receivedData
        ? '\x1b[90mContainer stream ended. Reconnecting...\x1b[0m\r\n'
        : '\x1b[90mWaiting for container...\x1b[0m\r\n',
    );

    setTimeout(() => {
      if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
    }, 1500);
  });

  clientWs.on('message', (data, isBinary) => {
    if (daemonWs.readyState === WebSocket.OPEN) daemonWs.send(isBinary ? data : data.toString());
  });

  clientWs.on('close', () => {
    if (daemonWs.readyState !== WebSocket.CLOSED) daemonWs.close();
  });
}

async function proxyStatus(
  clientWs: WebSocket,
  daemonWsUrl: string,
  nodeKey: string,
) {
  const daemonWs = new WebSocket(daemonWsUrl);

  daemonWs.on('open', () => {
    daemonWs.send(JSON.stringify({ event: 'auth', args: [nodeKey] }));
  });

  daemonWs.on('message', (data, isBinary) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(isBinary ? data : data.toString());
    }
  });

  daemonWs.on('error', () => {
    if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
  });

  daemonWs.on('close', () => {
    if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
  });

  clientWs.on('close', () => {
    if (daemonWs.readyState !== WebSocket.CLOSED) daemonWs.close();
  });
}

async function startServer() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const httpServer = createServer((req, res) => {
    const host = req.headers.host || `${hostname}:${port}`;
    const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const requestUrl = new URL(req.url || '/', `${protocol}://${host}`);
    const parsedUrl = {
      pathname: requestUrl.pathname,
      query: Object.fromEntries(requestUrl.searchParams),
    };
    handle(req, res, parsedUrl as Parameters<typeof handle>[2]);
  });

  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', async (req, socket, head) => {
    const url = req.url || '';

    const consoleMatch = url.match(/^\/api\/server\/([^/]+)\/console/);
    const statusMatch = url.match(/^\/api\/server\/([^/]+)\/status/);
    const eventsMatch = url.match(/^\/api\/server\/([^/]+)\/events/);

    if (!consoleMatch && !statusMatch && !eventsMatch) {
      socket.destroy();
      return;
    }

    const serverUUID = (consoleMatch || statusMatch || eventsMatch)![1];

    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, async (clientWs) => {
      try {
        const { default: prisma } = await import('./src/lib/prisma');
        const server = await prisma.server.findUnique({
          where: { UUID: serverUUID },
          include: { node: true },
        });

        if (!server) {
          clientWs.send(JSON.stringify({ error: 'Server not found' }));
          clientWs.close();
          return;
        }

        if (server.ownerId !== sessionUser.id && !sessionUser.isAdmin) {
          clientWs.send(JSON.stringify({ error: 'Forbidden' }));
          clientWs.close();
          return;
        }

        const httpScheme = await daemonScheme();
        const wsScheme = httpScheme === 'https' ? 'wss' : 'ws';
        const nodeHost = normalizeHost(server.node.address);

        if (consoleMatch) {
          const daemonWsUrl = `${wsScheme}://${nodeHost}:${server.node.port}/container/${serverUUID}`;
          await proxyConsole(clientWs, daemonWsUrl, server.node.key);
        } else if (eventsMatch) {
          const daemonWsUrl = `${wsScheme}://${nodeHost}:${server.node.port}/containerevents/${serverUUID}`;
          await proxyStatus(clientWs, daemonWsUrl, server.node.key);
        } else {
          const daemonWsUrl = `${wsScheme}://${nodeHost}:${server.node.port}/containerstatus/${serverUUID}`;
          await proxyStatus(clientWs, daemonWsUrl, server.node.key);
        }
      } catch (err) {
        console.error('[WS] Error setting up proxy:', err);
        clientWs.close();
      }
    });
  });

  httpServer.listen(port, hostname, () => {
    printStartupBanner(port);
  });
}

startServer().catch(console.error);
