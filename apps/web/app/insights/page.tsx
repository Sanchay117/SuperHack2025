async function getSummary() {
  const res = await fetch(process.env.API_BASE_URL + '/v1/insights/summary', { cache: 'no-store' });
  return res.json();
}

export default async function InsightsPage() {
  const data = await getSummary();
  return (
    <main>
      <h2 className="text-xl font-semibold mb-3">Insights</h2>
      <pre className="bg-zinc-900 p-3 rounded text-xs">{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}

