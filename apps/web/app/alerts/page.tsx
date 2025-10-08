import { apiFetch } from '@/app/../lib/api';

async function getAlerts() {
  const res = await apiFetch('/v1/alerts');
  return res.json();
}

async function runTriage() {
  'use server';
  await apiFetch('/v1/alerts/cluster', { method: 'POST' });
}

export default async function AlertsPage() {
  const alerts = await getAlerts();
  return (
    <main>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Alerts</h2>
        <form action={runTriage}><button className="bg-blue-600 hover:bg-blue-500 rounded px-3 py-2 text-sm">Run triage</button></form>
      </div>
      <div className="text-xs grid grid-cols-6 gap-2 mb-1 text-zinc-400"><div>Source</div><div>External</div><div>Severity</div><div>Status</div><div>Fingerprint</div><div>Cluster</div></div>
      {alerts.map((a: any) => (
        <div key={a.id} className="grid grid-cols-6 gap-2 py-2 border-b border-zinc-800 text-sm">
          <div>{a.source}</div>
          <div>{a.externalId}</div>
          <div>{a.severity}</div>
          <div>{a.status}</div>
          <div>{a.fingerprint}</div>
          <div>{a.clusterId ? '✓' : '-'}</div>
        </div>
      ))}
    </main>
  );
}

