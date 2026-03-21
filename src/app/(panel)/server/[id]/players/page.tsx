import { requireServerAccess } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import axios from 'axios';
import { daemonSchemeSync } from '@/lib/daemon';
import PageTitle from '@/components/PageTitle';

export const dynamic = 'force-dynamic';

interface Props { params: Promise<{ id: string }> }

export default async function PlayersPage({ params }: Props) {
  const { id } = await params;
  await requireServerAccess(id);
  const server = await prisma.server.findUnique({ where: { UUID: id }, include: { node: true } });
  if (!server) notFound();

  const ports = (() => { try { return JSON.parse(server.Ports); } catch { return []; } })();
  const primaryPort = ports.find((p: any) => p.primary)?.Port;

  let players: { name: string; uuid: string }[] = [];
  let serverInfo = { maxPlayers: 0, onlinePlayers: 0, version: 'Unknown' };
  let error = '';

  if (primaryPort) {
    try {
      const res = await axios({
        method: 'GET',
        url: `${daemonSchemeSync()}://${server.node.address}:${server.node.port}/minecraft/players`,
        params: { id, host: server.node.address, port: parseInt(String(primaryPort).split(':')[1] ?? primaryPort, 10) },
        auth: { username: 'Airlink', password: server.node.key },
        timeout: 8000,
      });
      if (res.data) {
        players = res.data.players ?? [];
        serverInfo = { maxPlayers: res.data.max ?? 0, onlinePlayers: res.data.online ?? 0, version: res.data.version ?? 'Unknown' };
      }
    } catch { error = 'Could not fetch player data. Server may be offline.'; }
  } else {
    error = 'No primary port found.';
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="rounded-xl border border-neutral-200 dark:border-white/5 px-4 py-3 bg-white dark:bg-white/[0.02]">
          <p className="text-xs text-neutral-500 mb-0.5">Online</p>
          <p className="text-lg font-semibold text-neutral-800 dark:text-white">{serverInfo.onlinePlayers} / {serverInfo.maxPlayers}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-white/5 px-4 py-3 bg-white dark:bg-white/[0.02]">
          <p className="text-xs text-neutral-500 mb-0.5">Version</p>
          <p className="text-sm font-medium text-neutral-800 dark:text-white">{serverInfo.version}</p>
        </div>
      </div>
      {error && <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-4 py-3"><p className="text-sm text-amber-700 dark:text-amber-400">{error}</p></div>}
      {players.length === 0 && !error && <p className="text-sm text-neutral-500 py-8 text-center">No players online.</p>}
      {players.length > 0 && (
        <div className="rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
          {players.map((p) => (
            <div key={p.uuid} className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100 dark:border-white/3 last:border-0">
              <img src={`https://mc-heads.net/avatar/${p.uuid}/32`} alt="" className="h-8 w-8 rounded-lg" />
              <p className="text-sm font-medium text-neutral-800 dark:text-white">{p.name}</p>
              <p className="text-xs text-neutral-400 font-mono ml-auto">{p.uuid}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
