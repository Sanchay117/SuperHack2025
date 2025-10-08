async function getTickets() {
  const res = await fetch(process.env.API_BASE_URL + '/v1/tickets', { cache: 'no-store' });
  return res.json();
}

async function suggest(id: string) {
  'use server';
  await fetch(process.env.API_BASE_URL + `/v1/tickets/${id}/suggest`, { method: 'POST' });
}

export default async function TicketsPage() {
  const tickets = await getTickets();
  return (
    <main>
      <h2 className="text-xl font-semibold mb-3">Tickets</h2>
      <div className="text-xs grid grid-cols-5 gap-2 mb-1 text-zinc-400"><div>Source</div><div>External</div><div>Status</div><div>Summary</div><div>Actions</div></div>
      {tickets.map((t: any) => (
        <div key={t.id} className="grid grid-cols-5 gap-2 py-2 border-b border-zinc-800 text-sm">
          <div>{t.source}</div>
          <div>{t.externalId}</div>
          <div>{t.status}</div>
          <div>{t.summary}</div>
          <div>
            <form action={async () => suggest(t.id)}><button className="bg-blue-600 hover:bg-blue-500 rounded px-2 py-1 text-xs">Get suggestion</button></form>
          </div>
        </div>
      ))}
    </main>
  );
}

