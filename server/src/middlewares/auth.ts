import { Request, Response, NextFunction } from 'express';
import { getSession } from '../lib/auth-helper';

// Extend Express Request interface locally or cast requests
export interface AuthenticatedRequest extends Request {
  session?: any;
  user?: any;
}

export async function authenticateSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const session = await getSession(req);
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized: Access is denied due to invalid or missing credentials.' });
    }
    
    req.session = session;
    req.user = session.user;
    next();
  } catch (err: any) {
    console.error('[AUTH-MIDDLEWARE] Authentication error:', err);
    res.status(500).json({ error: 'Internal Server Error during authentication.' });
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Session is not authenticated.' });
    }
    
    const role = req.user.role;
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden: You do not have the required permissions to perform this action.' });
    }
    
    next();
  };
}

export const requireSuperAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Session is not authenticated.' });
  }
  
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden: This resource is restricted to system administrators.' });
  }
  
  next();
};
