import axios from 'axios';
import { daemonSchemeSync } from './daemon';

export interface NodeLike {
  address: string;
  port: number;
  key: string;
  status?: string;
  versionFamily?: string;
  versionRelease?: string;
  remote?: boolean;
  error?: string;
}

export async function checkNodeStatus<T extends NodeLike>(node: T): Promise<T & NodeLike> {
  try {
    const response = await axios({
      method: 'get',
      url: `${daemonSchemeSync()}://${node.address}:${node.port}`,
      auth: { username: 'Airlink', password: node.key },
      headers: { 'Content-Type': 'application/json' },
      timeout: 3000,
    });

    const { versionFamily, versionRelease, status, remote } = response.data;

    return {
      ...node,
      status: status || 'Online',
      versionFamily,
      versionRelease,
      remote,
      error: undefined,
    };
  } catch (error) {
    let errorMsg = 'An unexpected error occurred';

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') errorMsg = 'Connection refused — daemon may be offline';
      else if (error.code === 'ETIMEDOUT') errorMsg = 'Connection timed out';
      else if (error.code === 'ENOTFOUND') errorMsg = 'Host not found — check address';
      else errorMsg = error.response?.data?.message || 'Connection failed';
    }

    return { ...node, status: 'Offline', error: errorMsg };
  }
}
