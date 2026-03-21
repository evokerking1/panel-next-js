'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Props {
  server: {
    UUID: string;
    name: string;
    description: string | null;
    Memory: number;
    Cpu: number;
    Storage: number;
    Suspended: boolean;
    Installing: boolean;
    Queued: boolean;
  };
  node: { address: string; port: number };
  serverStatus: { online: boolean; uptime: number | null; daemonOffline?: boolean };
  installed: { installed: boolean; state?: string; failed?: boolean };
  features: string[];
  primaryPort?: number;
}

type PowerAction = 'start' | 'stop' | 'restart' | 'kill';

function formatUptime(seconds: number | null) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function ServerConsole({ server, node, serverStatus, installed, primaryPort }: Props) {
  const termRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [lines, setLines] = useState<{ text: string; ts: number }[]>([]);
  const [status, setStatus] = useState<'running' | 'stopped' | 'unknown' | 'starting' | 'stopping'>(
    serverStatus.online ? 'running' : 'stopped',
  );
  const [uptime, setUptime] = useState(serverStatus.uptime);
  const [powering, setPowering] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [stats, setStats] = useState<{ cpu: string; ram: string; ramUsed: string } | null>(null);

  const addLine = useCallback((text: string) => {
    setLines((prev) => [...prev.slice(-500), { text, ts: Date.now() }]);
  }, []);

  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [lines]);

  useEffect(() => {
    const ws = new WebSocket(`ws://${location.host}/ws/console/${server.UUID}`);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => { setWsConnected(false); addLine('\x1b[31mDisconnected from console.\x1b[0m'); };
    ws.onerror = () => addLine('\x1b[31mWebSocket error.\x1b[0m');

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'console' && data.args?.[0]) addLine(data.args[0]);
        if (data.event === 'stats') {
          setStats({ cpu: data.args?.[0] ?? '0', ram: data.args?.[1] ?? '0', ramUsed: data.args?.[2] ?? '0MB' });
        }
        if (data.event === 'status') {
          setStatus(data.args?.[0] ?? 'unknown');
        }
      } catch {
        if (typeof e.data === 'string') addLine(e.data);
      }
    };

    return () => ws.close();
  }, [server.UUID, addLine]);

  // Poll status every 5s
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/server/${server.UUID}/status`);
        const data = await res.json();
        setStatus(data.online ? 'running' : 'stopped');
        setUptime(data.uptime);
      } catch { /* offline */ }
    };
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [server.UUID]);

  const sendPower = useCallback(async (action: PowerAction) => {
    setPowering(true);
    if (action === 'stop') setStatus('stopping');
    if (action === 'start' || action === 'restart') setStatus('starting');
    try {
      await fetch(`/api/server/${server.UUID}/power`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
    } catch {
      window.showToast?.('Failed to send power action', 'error');
    } finally {
      setTimeout(() => setPowering(false), 2000);
    }
  }, [server.UUID]);

  function sendCommand(e: React.FormEvent) {
    e.preventDefault();
    const cmd = inputRef.current?.value.trim();
    if (!cmd || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ event: 'command', args: [cmd] }));
    if (inputRef.current) inputRef.current.value = '';
  }

  if (!installed.installed) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-12 w-12 rounded-full border-2 border-neutral-200 dark:border-neutral-700 border-t-neutral-600 dark:border-t-neutral-300 animate-spin mb-6" />
        <h2 className="text-base font-medium text-neutral-800 dark:text-white mb-1">
          {installed.failed ? 'Installation failed' : 'Installing…'}
        </h2>
        <p className="text-sm text-neutral-500">
          {installed.failed
            ? 'Something went wrong during installation. Contact an administrator.'
            : `State: ${installed.state ?? 'queued'}`}
        </p>
      </div>
    );
  }

  if (server.Suspended) {
    return (
      <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-6 py-5 mt-4">
        <p className="text-sm font-medium text-red-700 dark:text-red-400">This server is suspended.</p>
        <p className="text-xs text-red-600/70 dark:text-red-400/60 mt-1">Contact an administrator for assistance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${
            status === 'running' ? 'bg-emerald-500' :
            status === 'starting' ? 'bg-amber-400 animate-pulse' :
            status === 'stopping' ? 'bg-orange-400 animate-pulse' :
            'bg-neutral-400'
          }`} />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 capitalize">{status}</span>
        </div>
        {uptime !== null && status === 'running' && (
          <span className="text-xs text-neutral-500 bg-neutral-100 dark:bg-white/5 px-2 py-1 rounded-lg">
            Uptime {formatUptime(uptime)}
          </span>
        )}
        {stats && (
          <>
            <span className="text-xs text-neutral-500 bg-neutral-100 dark:bg-white/5 px-2 py-1 rounded-lg">
              CPU {stats.cpu}%
            </span>
            <span className="text-xs text-neutral-500 bg-neutral-100 dark:bg-white/5 px-2 py-1 rounded-lg">
              RAM {stats.ramUsed}
            </span>
          </>
        )}
        {primaryPort && (
          <span className="text-xs text-neutral-500 bg-neutral-100 dark:bg-white/5 px-2 py-1 rounded-lg">
            :{primaryPort}
          </span>
        )}

        {/* Power buttons */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => sendPower('start')}
            disabled={powering || status === 'running' || status === 'starting'}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition"
          >
            Start
          </button>
          <button
            onClick={() => sendPower('restart')}
            disabled={powering || status !== 'running'}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 transition"
          >
            Restart
          </button>
          <button
            onClick={() => sendPower('stop')}
            disabled={powering || status === 'stopped' || status === 'stopping'}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-40 transition"
          >
            Stop
          </button>
          <button
            onClick={() => sendPower('kill')}
            disabled={powering || status === 'stopped'}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 transition"
          >
            Kill
          </button>
        </div>
      </div>

      {/* Terminal */}
      <div className="rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-neutral-100 dark:bg-white/3 border-b border-neutral-200 dark:border-white/5">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
          </div>
          <span className="text-xs text-neutral-500 ml-2">Console</span>
          <span className={`ml-auto text-xs ${wsConnected ? 'text-emerald-500' : 'text-neutral-400'}`}>
            {wsConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div
          ref={termRef}
          className="h-80 overflow-y-auto bg-neutral-950 p-4 font-mono text-xs leading-5"
          style={{ color: '#e5e5e5' }}
        >
          {lines.length === 0 && (
            <span className="text-neutral-600">Waiting for output…</span>
          )}
          {lines.map((line, i) => (
            <div key={i} dangerouslySetInnerHTML={{ __html: ansiToHtml(line.text) }} />
          ))}
        </div>

        <form onSubmit={sendCommand} className="flex border-t border-neutral-200 dark:border-white/5">
          <span className="px-3 py-2.5 text-xs text-neutral-500 bg-neutral-50 dark:bg-white/3 border-r border-neutral-200 dark:border-white/5 font-mono">
            &gt;
          </span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter command…"
            className="flex-1 px-3 py-2.5 text-xs font-mono bg-transparent text-neutral-800 dark:text-white placeholder:text-neutral-400 outline-none"
            disabled={!wsConnected || status !== 'running'}
          />
          <button
            type="submit"
            disabled={!wsConnected || status !== 'running'}
            className="px-4 py-2.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white disabled:opacity-40 transition"
          >
            Send
          </button>
        </form>
      </div>

      {/* Server info */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Memory', value: `${server.Memory} MB` },
          { label: 'CPU', value: `${server.Cpu}%` },
          { label: 'Storage', value: `${server.Storage} GB` },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-neutral-200 dark:border-white/5 px-4 py-3 bg-white dark:bg-white/[0.02]"
          >
            <p className="text-xs text-neutral-500 mb-1">{item.label}</p>
            <p className="text-sm font-medium text-neutral-800 dark:text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Minimal ANSI-to-HTML converter for the terminal
function ansiToHtml(text: string): string {
  const colorMap: Record<string, string> = {
    '30': '#404040', '31': '#ef4444', '32': '#22c55e', '33': '#eab308',
    '34': '#3b82f6', '35': '#a855f7', '36': '#06b6d4', '37': '#e5e5e5',
    '90': '#737373', '91': '#f87171', '92': '#4ade80', '93': '#facc15',
    '94': '#60a5fa', '95': '#c084fc', '96': '#22d3ee', '97': '#ffffff',
    '1': 'bold',
  };

  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped.replace(/\x1b\[([0-9;]*)m/g, (_, codes: string) => {
    if (!codes || codes === '0') return '</span>';
    const parts = codes.split(';');
    const styles: string[] = [];
    const classes: string[] = [];
    for (const code of parts) {
      if (code === '1') { classes.push('font-bold'); continue; }
      const color = colorMap[code];
      if (color) styles.push(`color:${color}`);
    }
    const style = styles.length ? ` style="${styles.join(';')}"` : '';
    const cls = classes.length ? ` class="${classes.join(' ')}"` : '';
    return `<span${cls}${style}>`;
  });
}
