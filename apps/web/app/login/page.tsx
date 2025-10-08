'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('admin@ninja.local');
  return (
    <main className="max-w-sm mx-auto mt-24">
      <h2 className="text-xl font-semibold mb-4">Login</h2>
      <input className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-700" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
      <button className="mt-3 w-full bg-blue-600 hover:bg-blue-500 rounded px-3 py-2" onClick={() => signIn('credentials', { email, callbackUrl: '/dashboard' })}>Sign in</button>
    </main>
  );
}

