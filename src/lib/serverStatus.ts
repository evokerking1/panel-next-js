import axios from 'axios';
import { daemonSchemeSync } from './daemon';

export interface ServerStatus {
  online: boolean;
  starting: boolean;
  stopping: boolean;
  uptime: number | null;
  startedAt: string | null;
  error?: string;
  daemonOffline?: boolean;
}

export async function getServerStatus(info: {
  nodeAddress: string;
  nodePort: number;
  serverUUID: string;
  nodeKey: string;
}): Promise<ServerStatus> {
  try {
    const response = await axios({
      method: 'GET',
      url: `${daemonSchemeSync()}://${info.nodeAddress}:${info.nodePort}/container/status`,
      auth: { username: 'Airlink', password: info.nodeKey },
      params: { id: info.serverUUID },
      timeout: 3000,
    });

    const data = response.data;

    if (data?.running === true) {
      return {
        online: true,
        starting: false,
        stopping: false,
        uptime: data.startedAt
          ? Math.floor((Date.now() - new Date(data.startedAt).getTime()) / 1000)
          : null,
        startedAt: data.startedAt ?? null,
      };
    }

    return { online: false, starting: false, stopping: false, uptime: null, startedAt: null };
  } catch (error: any) {
    let errorMsg = 'Connection failed';
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') errorMsg = 'Connection refused — daemon may be offline';
      else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') errorMsg = 'Connection timed out';
      else if (error.code === 'ENOTFOUND') errorMsg = 'Host not found — check node address';
      else if (error.response) errorMsg = `Daemon responded with ${error.response.status}`;
    }
    return {
      online: false,
      starting: false,
      stopping: false,
      uptime: null,
      startedAt: null,
      daemonOffline: true,
      error: errorMsg,
    };
  }
}
