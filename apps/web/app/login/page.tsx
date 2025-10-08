'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Button } from '@ninjas/ui';

export default function Login() {
  const [email, setEmail] = useState('admin@ninja.local');
  return (
    <main className="max-w-sm mx-auto mt-24">
      <h2 className="text-xl font-semibold mb-4">Login</h2>
      <input className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-700" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
      <div className="mt-3 flex gap-2">
        <Button className="w-full" onClick={() => signIn('credentials', { email, callbackUrl: '/dashboard' })}>Sign in (viewer)</Button>
        <Button className="w-full" onClick={() => signIn('credentials', { email: 'tech@ninja.local', callbackUrl: '/dashboard' })}>Tech</Button>
        <Button className="w-full" onClick={() => signIn('credentials', { email: 'admin@ninja.local', callbackUrl: '/dashboard' })}>Admin</Button>
      </div>
    </main>
  );
}

