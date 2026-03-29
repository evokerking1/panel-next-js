import axios from 'axios';

export function daemonScheme(): string {
  return process.env.ENFORCE_DAEMON_HTTPS === 'true' ? 'https' : 'http';
}

export function daemonUrl(address: string, port: number): string {
  return `${daemonScheme()}://${address}:${port}`;
}

export async function daemonGet<T = unknown>(
  address: string,
  port: number,
  key: string,
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const resp = await axios.get<T>(`${daemonUrl(address, port)}${path}`, {
    auth: { username: 'Airlink', password: key },
    params,
    timeout: 4000,
  });
  return resp.data;
}

export async function daemonPost<T = unknown>(
  address: string,
  port: number,
  key: string,
  path: string,
  data?: unknown
): Promise<T> {
  const resp = await axios.post<T>(`${daemonUrl(address, port)}${path}`, data, {
    auth: { username: 'Airlink', password: key },
    timeout: 8000,
  });
  return resp.data;
}

export async function checkNodeOnline(address: string, port: number, key: string): Promise<boolean> {
  try {
    await axios.get(daemonUrl(address, port), {
      auth: { username: 'Airlink', password: key },
      timeout: 3000,
    });
    return true;
  } catch {
    return false;
  }
}
