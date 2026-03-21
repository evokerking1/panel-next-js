import axios from 'axios';
import prisma from './prisma';
import { checkNodeStatus } from './nodeStatus';
import { daemonSchemeSync } from './daemon';

export async function checkEulaStatus(serverId: string): Promise<{ accepted: boolean; error?: string }> {
  try {
    const server = await prisma.server.findUnique({
      where: { UUID: serverId },
      include: { node: true },
    });
    if (!server) return { accepted: false };

    const nodeStatus = await checkNodeStatus(server.node);
    if (nodeStatus.status === 'Offline') return { accepted: true };

    const response = await axios({
      method: 'GET',
      url: `${daemonSchemeSync()}://${server.node.address}:${server.node.port}/fs/file/content`,
      responseType: 'text',
      params: { id: server.UUID, path: 'eula.txt' },
      auth: { username: 'Airlink', password: server.node.key },
    });

    return { accepted: (response.data as string).includes('eula=true') };
  } catch (error: any) {
    if (error.response?.status === 404) return { accepted: false };
    return { accepted: false, error: 'An error occurred while checking the EULA status.' };
  }
}

const EXCLUDED_WORLD_FOLDERS = new Set([
  'plugins', 'config', 'cache', 'versions', 'logs', 'libraries',
  'mods', 'bin', 'crash-reports', 'screenshots', 'resourcepacks',
  'texturepacks', 'server', 'backups', 'airlink',
]);

const REQUIRED_WORLD_FILES = ['uid.dat', 'level.dat'];

export function isWorld(folder: { name: string; contents?: string[] }): boolean {
  if (EXCLUDED_WORLD_FOLDERS.has(folder.name.toLowerCase())) return false;
  if (!folder.contents || folder.contents.length === 0) return false;
  return REQUIRED_WORLD_FILES.some((f) => folder.contents!.includes(f));
}
