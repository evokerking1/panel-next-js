import prisma from './prisma';
import axios from 'axios';
import { daemonSchemeSync } from './daemon';

const COLLECTION_INTERVAL = 5 * 60 * 1000;
const MAX_DATA_POINTS = 48 * 12;

async function collectPlayerStats() {
  try {
    const servers = await prisma.server.findMany({ include: { node: true } });

    let totalPlayers = 0;
    let maxPlayers = 0;
    let onlineServers = 0;

    await Promise.all(
      servers.map(async (server) => {
        try {
          const ports = JSON.parse(server.Ports || '[]');
          const primaryPort = ports.find((p: any) => p.primary)?.Port;
          if (!primaryPort) return;

          const response = await axios({
            method: 'GET',
            url: `${daemonSchemeSync()}://${server.node.address}:${server.node.port}/container/players`,
            auth: { username: 'Airlink', password: server.node.key },
            params: { id: server.UUID },
            timeout: 3000,
          });

          if (response.data) {
            totalPlayers += response.data.online || 0;
            maxPlayers += response.data.max || 0;
            if ((response.data.online || 0) > 0) onlineServers++;
          }
        } catch {
          // server offline or doesn't support player endpoint
        }
      }),
    );

    await prisma.playerStats.create({
      data: {
        totalPlayers,
        maxPlayers,
        onlineServers,
        totalServers: servers.length,
      },
    });

    const count = await prisma.playerStats.count();
    if (count > MAX_DATA_POINTS) {
      const oldest = await prisma.playerStats.findMany({
        orderBy: { timestamp: 'asc' },
        take: count - MAX_DATA_POINTS,
        select: { id: true },
      });
      await prisma.playerStats.deleteMany({
        where: { id: { in: oldest.map((r) => r.id) } },
      });
    }
  } catch (error) {
    console.error('Player stats collection error:', error);
  }
}

export function startPlayerStatsCollection() {
  collectPlayerStats();
  setInterval(collectPlayerStats, COLLECTION_INTERVAL);
}
