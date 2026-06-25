import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import redisClient from '../utils/redis';
import { loadUserPermissions } from '../utils/rbac';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-hris-key';

export interface AuthRequest extends Request {
  user?: {
    jti: string;
    id: number;
    email: string;
    role: string;          // legacy
    roles: string[];       // RBAC roles e.g. ['SUPER_ADMIN']
    permissions: string[]; // e.g. ['employee:view', 'payroll:approve']
    level: number;         // hierarchy level
    deptIds: number[];     // dept scope for DEPT_MANAGER
    empId: number | null;
  };
}

// ── Authenticate JWT ─────────────────────────────────────────────────
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const isBlacklisted = await prisma.tokenBlacklist.findUnique({
      where: { jti: decoded.jti }
    });
    if (isBlacklisted) {
      return res.status(401).json({ message: 'Unauthorized: Token is revoked' });
    }
    
    // Instant Revocation Check: Ensure user still exists and is active
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { isActive: true }
    });
    
    if (!dbUser || !dbUser.isActive) {
      return res.status(401).json({ message: 'Unauthorized: Account is suspended or deleted' });
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

// ── Permission Guard ─────────────────────────────────────────────────
// Usage: requirePermission('employee:create')
export const requirePermission = (permCode: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    // Admins bypass
    if (['superadmin', 'admin', 'hr_admin'].includes(req.user.role)) return next();

    try {
      let perms: string[] = [];
      const cacheKey = `permissions:user:${req.user.id}`;
      
      if (redisClient.isReady) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          perms = JSON.parse(cached);
        }
      }

      if (perms.length === 0) {
        const rbac = await loadUserPermissions(req.user.id);
        perms = rbac.permissions;
        if (redisClient.isReady) {
          await redisClient.setEx(cacheKey, 3600, JSON.stringify(perms));
        }
      }

      if (perms.includes(permCode) || req.user.roles.includes('SUPER_ADMIN')) return next();
      
      return res.status(403).json({ 
        message: `Forbidden: requires permission '${permCode}'`,
        required: permCode
      });
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ message: 'Server error during permission check' });
    }
  };
};

// ── Role Guard ───────────────────────────────────────────────────────
// Usage: requireRole(['SUPER_ADMIN', 'HR_DIRECTOR'])
export const requireRole = (roleCodes: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const userRoles = req.user.roles || [];
    if (userRoles.some(r => roleCodes.includes(r))) return next();
    return res.status(403).json({ message: `Forbidden: requires role ${roleCodes.join(' or ')}` });
  };
};

// ── Min Level Guard ──────────────────────────────────────────────────
// Usage: requireLevel(60) — must have role level ≥ 60
export const requireLevel = (minLevel: number) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if ((req.user.level || 0) >= minLevel) return next();
    return res.status(403).json({ message: `Forbidden: insufficient access level` });
  };
};
