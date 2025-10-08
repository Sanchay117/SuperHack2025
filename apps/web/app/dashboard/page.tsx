async function getSummary() {
  const res = await fetch(process.env.API_BASE_URL + '/v1/insights/summary', { cache: 'no-store' });
  return res.json();
}

export default async function Dashboard() {
  const data = await getSummary();
  return (
    <main>
      <h2 className="text-xl font-semibold mb-4">Org KPIs</h2>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-zinc-900 p-4 rounded">SLA %: {Math.round((data.sla ?? 0) * 100)}%</div>
        <div className="bg-zinc-900 p-4 rounded">Utilization: {Math.round((data.utilization ?? 0) * 100)}%</div>
        <div className="bg-zinc-900 p-4 rounded">Profitability: {Math.round((data.profitability ?? 0) * 100)}%</div>
        <div className="bg-zinc-900 p-4 rounded">MTTR (h): {data.mttrHours ?? 0}</div>
      </div>
    </main>
  );
}

