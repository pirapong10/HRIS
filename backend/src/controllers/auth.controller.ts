import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../prisma';
import speakeasy from 'speakeasy';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-hris-key';

import { loadUserPermissions } from '../utils/rbac';

export const login = async (req: Request, res: Response) => {
  try {
    // Purge expired tokens from TokenBlacklist
    await prisma.tokenBlacklist.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    }).catch(console.error);

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
      roles: rbac.roles,
      permissions: rbac.permissions,
      level: rbac.level,
      deptIds: rbac.deptIds,
      empId: user.empId
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '15m' });
    
    // Generate Refresh Token
    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
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
      select: { id: true, email: true, empId: true, isActive: true }
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

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) return res.status(401).json({ message: 'No refresh token provided' });

    const tokenDoc = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });

    if (!tokenDoc || tokenDoc.isRevoked || new Date() > tokenDoc.expiresAt) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const { user } = tokenDoc;
    if (!user.isActive) return res.status(401).json({ message: 'Account suspended' });

    const rbac = await loadUserPermissions(user.id);

    const tokenPayload = {
      jti: uuidv4(),
      id: user.id,
      email: user.email,
      roles: rbac.roles,
      permissions: rbac.permissions,
      level: rbac.level,
      deptIds: rbac.deptIds,
      empId: user.empId
    };

    const newAccessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '15m' });
    res.json({ token: newAccessToken });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
