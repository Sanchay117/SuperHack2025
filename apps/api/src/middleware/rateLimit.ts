import { Request, Response, NextFunction } from 'express';

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

export function rateLimit({ windowMs = 60_000, max = 60 }: { windowMs?: number; max?: number }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = (req.ip || 'ip') + ':' + (req.user?.id || 'anon');
    const now = Date.now();
    const entry = store.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > entry.resetAt) {
      entry.count = 0; entry.resetAt = now + windowMs;
    }
    entry.count += 1;
    store.set(key, entry);
    if (entry.count > max) return res.status(429).json({ error: 'rate_limited' });
    next();
  };
}

