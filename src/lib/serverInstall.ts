import axios from 'axios';
import prisma from './prisma';
import { checkNodeStatus } from './nodeStatus';
import { daemonSchemeSync } from './daemon';

const cache = new Map<string, { data: string; at: number }>();
const CACHE_TTL = 8000;

export async function checkForServerInstallation(serverId: string): Promise<{ installed: boolean; state?: string; failed?: boolean; error?: string }> {
  try {
    const server = await prisma.server.findUnique({
      where: { UUID: serverId },
      include: { node: true },
    });

    if (!server) return { installed: false, error: 'Server not found.' };

    if (!server.Installing && !server.Queued) return { installed: true, state: 'installed' };

    const now = Date.now();
    const cached = cache.get(serverId);
    if (cached && now - cached.at < CACHE_TTL) {
      return { installed: false, state: cached.data };
    }

    const nodeStatus = await checkNodeStatus(server.node);
    if (nodeStatus.status === 'Offline') return { installed: false, error: 'Node offline.' };

    const response = await axios({
      method: 'GET',
      url: `${daemonSchemeSync()}://${server.node.address}:${server.node.port}/container/status/${server.UUID}`,
      auth: { username: 'Airlink', password: server.node.key },
      timeout: 4000,
    });

    const state: string = response.data?.state ?? 'unknown';
    cache.set(serverId, { data: state, at: Date.now() });

    if (state === 'installed') {
      await prisma.server.update({ where: { UUID: serverId }, data: { Installing: false, Queued: false } });
      return { installed: true, state };
    }

    if (state === 'failed') return { installed: false, state, failed: true };

    return { installed: false, state };
  } catch (error: any) {
    if (error.response?.status === 404) return { installed: true, state: 'installed' };
    return { installed: false, error: 'Failed to check installation status.' };
  }
}
