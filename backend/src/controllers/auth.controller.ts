import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../prisma';
import speakeasy from 'speakeasy';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-hris-key';

// Helper: load full permissions for a user
async function loadUserPermissions(userId: number) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } }
        }
      }
    }
  });

  const permSet = new Set<string>();
  const roles: string[] = [];
  let maxLevel = 0;
  let deptIds: number[] = [];

  for (const ur of userRoles) {
    roles.push(ur.role.code);
    if (ur.role.level > maxLevel) maxLevel = ur.role.level;
    if (ur.deptIds) {
      try { deptIds = [...deptIds, ...JSON.parse(ur.deptIds)]; } catch {}
    }
    for (const rp of ur.role.permissions) {
      permSet.add(rp.permission.code);
    }
  }

  return {
    roles,
    permissions: Array.from(permSet),
    level: maxLevel,
    deptIds: [...new Set(deptIds)]
  };
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, mfaCode } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is suspended' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await prisma.auditLog.create({
        data: { action: 'LOGIN_FAILED', details: `Failed login for: ${email}`, ipAddress: req.ip ? String(req.ip) : null }
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.mfaEnabled) {
      if (!mfaCode) {
        return res.json({ requireMfa: true, message: 'MFA code required' });
      }

      if (!user.mfaSecret) {
         return res.status(500).json({ message: 'MFA secret missing' });
      }

      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: mfaCode
      });

      if (!verified) {
        await prisma.auditLog.create({
          data: { action: 'LOGIN_FAILED', details: `Failed MFA for: ${email}`, ipAddress: req.ip ? String(req.ip) : null }
        });
        return res.status(401).json({ message: 'Invalid MFA code' });
      }
    }

    // Load RBAC permissions
    const rbac = await loadUserPermissions(user.id);

    await prisma.auditLog.create({
      data: { userId: user.id, action: 'LOGIN_SUCCESS', module: 'auth', ipAddress: req.ip ? String(req.ip) : null }
    });

    const tokenPayload = {
      jti: uuidv4(),
      id: user.id,
      email: user.email,
      role: user.role, // legacy
      roles: rbac.roles,
      permissions: rbac.permissions,
      level: rbac.level,
      deptIds: rbac.deptIds,
      empId: user.empId
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        roles: rbac.roles,
        permissions: rbac.permissions,
        level: rbac.level,
        deptIds: rbac.deptIds,
        empId: user.empId
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, role: true, empId: true, isActive: true }
    });
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Return fresh permissions
    const rbac = await loadUserPermissions(user.id);
    res.json({ ...user, roles: rbac.roles, permissions: rbac.permissions, level: rbac.level, deptIds: rbac.deptIds });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const logout = async (req: any, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded: any = jwt.decode(token);
      
      if (decoded && decoded.exp && decoded.jti) {
        await prisma.tokenBlacklist.create({
          data: {
            jti: decoded.jti,
            userId: decoded.id,
            expiresAt: new Date(decoded.exp * 1000)
          }
        });
      }
    }

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'LOGOUT', module: 'auth', ipAddress: req.ip ? String(req.ip) : null }
    });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.json({ message: 'Logged out' });
  }
};
