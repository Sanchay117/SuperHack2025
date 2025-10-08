async function getFlags() {
  const res = await fetch(process.env.API_BASE_URL + '/v1/flags', { cache: 'no-store' });
  return res.json();
}

export default async function SettingsPage() {
  const flags = await getFlags();
  return (
    <main>
      <h2 className="text-xl font-semibold mb-3">Feature Flags</h2>
      <ul className="text-sm">
        {flags.map((f: any) => (
          <li key={f.id} className="py-2 border-b border-zinc-800 flex items-center justify-between">
            <span>{f.key}</span>
            <span className="text-xs">{f.enabled ? 'ENABLED' : 'disabled'}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}

