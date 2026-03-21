'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Variable {
  name: string;
  env_variable?: string;
  env?: string;
  description?: string;
  value: string;
  default_value?: string;
  user_viewable?: boolean;
  user_editable?: boolean;
  field_type?: string;
  rules?: string;
}

interface Props {
  serverId: string;
  startCommand: string;
  variables: Variable[];
  allowEdit: boolean;
}

export default function StartupClient({ serverId, startCommand, variables, allowEdit }: Props) {
  const router = useRouter();
  const [cmd, setCmd] = useState(startCommand);
  const [vars, setVars] = useState(variables);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/server/${serverId}/startup`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startCommand: cmd, variables: vars }),
      });
      if (res.ok) {
        window.showToast?.('Startup configuration saved', 'success');
        router.refresh();
      } else {
        window.showToast?.('Failed to save startup config', 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  function updateVar(idx: number, value: string) {
    const next = [...vars];
    next[idx] = { ...next[idx], value };
    setVars(next);
  }

  const editableVars = vars.filter((v) => v.user_viewable !== false);

  return (
    <div className="max-w-2xl space-y-6">
      {allowEdit && (
        <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">Startup command</h2>
          <input
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/3 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-white/25 transition"
          />
        </div>
      )}

      {editableVars.length > 0 && (
        <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">Variables</h2>
          <div className="space-y-4">
            {editableVars.map((v, i) => {
              const realIdx = vars.indexOf(v);
              const editable = v.user_editable !== false;
              return (
                <div key={i}>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    {v.name}
                    <span className="ml-1.5 text-neutral-400 font-mono text-xs">({v.env_variable || v.env})</span>
                  </label>
                  {v.description && (
                    <p className="text-xs text-neutral-500 mb-1.5">{v.description}</p>
                  )}
                  <input
                    value={v.value ?? v.default_value ?? ''}
                    onChange={(e) => updateVar(realIdx, e.target.value)}
                    disabled={!editable}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/3 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-white/25 transition disabled:opacity-50"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(allowEdit || editableVars.some((v) => v.user_editable !== false)) && (
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl hover:bg-neutral-700 dark:hover:bg-neutral-200 transition disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      )}
    </div>
  );
}
