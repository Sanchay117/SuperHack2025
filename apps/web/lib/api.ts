import { getServerSession } from 'next-auth';

export async function apiFetch(path: string, init?: RequestInit) {
  const session = await getServerSession();
  const role = (session as any)?.role as 'admin' | 'technician' | 'viewer' | undefined;
  const token = role === 'admin' ? 'dev-admin' : role === 'technician' ? 'dev-tech' : '';
  return fetch((process.env.API_BASE_URL || 'http://localhost:4000') + path, {
    ...(init || {}),
    headers: { ...(init?.headers || {}), Authorization: token ? `Bearer ${token}` : '' },
    cache: 'no-store'
  });
}

