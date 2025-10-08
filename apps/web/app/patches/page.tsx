'use client';
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export default function PatchesPage() {
  const [logs, setLogs] = useState<string[]>([]);
  useEffect(() => {
    const socket = io(process.env.API_BASE_URL || 'http://localhost:4000');
    socket.on('patch_run_update', (m: any) => setLogs((l) => [...l, m.message]));
    return () => socket.disconnect();
  }, []);
  const createPlan = async () => {
    const res = await fetch((process.env.API_BASE_URL || 'http://localhost:4000') + '/v1/patch-plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: 'seed', products: ['KB500001'] }) });
    const plan = await res.json();
    await fetch((process.env.API_BASE_URL || 'http://localhost:4000') + '/v1/patch-runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: plan.id }) });
  };
  return (
    <main>
      <h2 className="text-xl font-semibold mb-3">Patches</h2>
      <button className="bg-blue-600 hover:bg-blue-500 rounded px-3 py-2 text-sm" onClick={createPlan}>Create plan (dry-run) & Run</button>
      <div className="mt-4 bg-zinc-900 p-3 rounded text-xs min-h-[120px]">
        {logs.map((l, i) => (<div key={i}>{l}</div>))}
      </div>
    </main>
  );
}

