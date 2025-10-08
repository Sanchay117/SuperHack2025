import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100">
        <div className="max-w-6xl mx-auto p-4">
          <header className="flex items-center justify-between py-4">
            <h1 className="font-semibold">The Ninjas</h1>
            <nav className="space-x-4 text-sm">
              <a href="/dashboard">Dashboard</a>
              <a href="/alerts">Alerts</a>
              <a href="/tickets">Tickets</a>
              <a href="/patches">Patches</a>
              <a href="/insights">Insights</a>
              <a href="/settings">Settings</a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}

