import { Request, Response, NextFunction } from 'express';

export type Role = 'admin' | 'technician' | 'viewer';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  // Dev-friendly token mapping. In production, verify JWT.
  const role: Role = token === 'dev-admin' ? 'admin' : token === 'dev-tech' ? 'technician' : 'viewer';
  req.user = { id: 'service', role };
  next();
}

export function requireRole(minRole: Role) {
  const order: Role[] = ['viewer', 'technician', 'admin'];
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role || 'viewer';
    if (order.indexOf(userRole) < order.indexOf(minRole)) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

