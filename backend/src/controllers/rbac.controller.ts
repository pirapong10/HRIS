import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { writeAudit } from '../utils/audit';
import redisClient from '../utils/redis';

// ── List all Roles with permission counts ────────────────────────────
export const getRoles = async (req: AuthRequest, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      include: { _count: { select: { permissions: true, userRoles: true } } },
      orderBy: { level: 'desc' }
    });
    res.json(roles);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

// ── Get single role with full permissions ────────────────────────────
export const getRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const role = await prisma.role.findUnique({
      where: { id: Number(id) },
      include: { permissions: { include: { permission: true } } }
    });
    if (!role) return res.status(404).json({ message: 'Role not found' });
    res.json(role);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

// ── Update role permissions ──────────────────────────────────────────
export const updateRolePermissions = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { permissionIds } = req.body; // array of permission IDs

    const queries: any[] = [
      prisma.rolePermission.deleteMany({ where: { roleId: Number(id) } })
    ];

    if (permissionIds?.length) {
      queries.push(
        prisma.rolePermission.createMany({
          data: permissionIds.map((pid: number) => ({ roleId: Number(id), permissionId: pid })),
          skipDuplicates: true
        })
      );
    }

    queries.push(
      prisma.auditLog.create({
        data: { userId: req.user!.id, action: 'PERMISSION_CHANGED', module: 'access_control', recordId: String(id), ipAddress: req.ip ? String(req.ip) : undefined }
      })
    );

    await prisma.$transaction(queries);

    if (redisClient.isReady) {
      const usersWithRole = await prisma.userRole.findMany({ where: { roleId: Number(id) } });
      for (const ur of usersWithRole) {
        await redisClient.del(`permissions:user:${ur.userId}`);
      }
    }

    res.json({ message: 'Permissions updated' });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

// ── Get all permissions grouped by module ────────────────────────────
export const getPermissions = async (_req: AuthRequest, res: Response) => {
  try {
    const perms = await prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { action: 'asc' }] });
    // Group by module
    const grouped: Record<string, any[]> = {};
    for (const p of perms) {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    }
    res.json(grouped);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

// ── List all Users with their roles ─────────────────────────────────
export const getUsers = async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        userRoles: { include: { role: true } },
        employee: { select: { name: true, empCode: true, department: { select: { name: true } } } },
        dataScope: true,
        payrollScope: true
      },
      orderBy: { id: 'asc' }
    });
    res.json(users.map(u => ({
      id: u.id, email: u.email, isActive: u.isActive,
      roles: u.userRoles.map(ur => ({ id: ur.role.id, code: ur.role.code, name: ur.role.name, deptIds: ur.deptIds })),
      employee: u.employee,
      dataScope: u.dataScope,
      payrollScope: u.payrollScope
    })));
  } catch { res.status(500).json({ message: 'Server error' }); }
};

// ── Assign roles to a user ───────────────────────────────────────────
export const assignUserRoles = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { roles } = req.body; // [{ roleId, deptIds? }]

    const queries: any[] = [
      prisma.userRole.deleteMany({ where: { userId: Number(id) } })
    ];

    if (roles?.length) {
      queries.push(
        prisma.userRole.createMany({
          data: roles.map((r: any) => ({
            userId: Number(id),
            roleId: r.roleId,
            deptIds: r.deptIds ? JSON.stringify(r.deptIds) : null
          })),
          skipDuplicates: true
        })
      );
    }

    queries.push(
      prisma.auditLog.create({
        data: { userId: req.user!.id, action: 'ROLE_ASSIGNED', module: 'access_control', recordId: String(id), ipAddress: req.ip ? String(req.ip) : null }
      })
    );

    await prisma.$transaction(queries);

    if (redisClient.isReady) {
      await redisClient.del(`permissions:user:${id}`);
    }

    res.json({ message: 'Roles assigned successfully' });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

// ── Set DataScope for a user ──────────────────────────────────────────
export const setDataScope = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { departmentIds, costCenterIds, employeeTypes, jobGrades } = req.body;

    const scope = await prisma.dataScope.upsert({
      where: { userId: Number(id) },
      update: {
        departmentIds: departmentIds ? JSON.stringify(departmentIds) : null,
        costCenterIds: costCenterIds ? JSON.stringify(costCenterIds) : null,
        employeeTypes: employeeTypes ? JSON.stringify(employeeTypes) : null,
        jobGrades: jobGrades ? JSON.stringify(jobGrades) : null
      },
      create: {
        userId: Number(id),
        departmentIds: departmentIds ? JSON.stringify(departmentIds) : null,
        costCenterIds: costCenterIds ? JSON.stringify(costCenterIds) : null,
        employeeTypes: employeeTypes ? JSON.stringify(employeeTypes) : null,
        jobGrades: jobGrades ? JSON.stringify(jobGrades) : null
      }
    });
    res.json(scope);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

// ── Set PayrollScope for a user ───────────────────────────────────────
export const setPayrollScope = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { employeeTypes, grades, departments, costCenters } = req.body;

    const scope = await prisma.payrollScope.upsert({
      where: { userId: Number(id) },
      update: {
        employeeTypes: employeeTypes ? JSON.stringify(employeeTypes) : null,
        grades: grades ? JSON.stringify(grades) : null,
        departments: departments ? JSON.stringify(departments) : null,
        costCenters: costCenters ? JSON.stringify(costCenters) : null
      },
      create: {
        userId: Number(id),
        employeeTypes: employeeTypes ? JSON.stringify(employeeTypes) : null,
        grades: grades ? JSON.stringify(grades) : null,
        departments: departments ? JSON.stringify(departments) : null,
        costCenters: costCenters ? JSON.stringify(costCenters) : null
      }
    });
    res.json(scope);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

// ── Get Audit Logs ────────────────────────────────────────────────────
export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, module, action } = req.query;
    const where: any = {};
    if (module) where.module = module;
    if (action) where.action = { contains: String(action), mode: 'insensitive' };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { email: true, userRoles: { include: { role: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit)
      }),
      prisma.auditLog.count({ where })
    ]);
    res.json({ logs, total, page: Number(page), limit: Number(limit) });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

// ── Create new user ───────────────────────────────────────────────────
export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const bcrypt = require('bcrypt');
    const { email, password, roleIds, empId } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, empId: empId ? Number(empId) : null }
    });

    if (roleIds?.length) {
      await prisma.userRole.createMany({
        data: roleIds.map((rid: number) => ({ userId: user.id, roleId: rid })),
        skipDuplicates: true
      });
    }

    await writeAudit({
      userId: req.user!.id,
      action: 'USER_CREATED',
      module: 'access_control',
      recordId: String(user.id),
      details: `Created user ${user.email}`,
      ipAddress: req.ip ? String(req.ip) : undefined
    });

    res.status(201).json({ id: user.id, email: user.email });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

// ── Toggle user active ────────────────────────────────────────────────
export const toggleUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const updated = await prisma.user.update({ where: { id: Number(id) }, data: { isActive: !user.isActive } });
    
    // Best-effort token revocation: If deactivated, revoke all refresh tokens
    if (!updated.isActive) {
      await prisma.refreshToken.updateMany({
        where: { userId: updated.id },
        data: { isRevoked: true }
      });
    }
    
    await writeAudit({
      userId: req.user!.id,
      action: 'UPDATE',
      module: 'access_control',
      recordId: String(user.id),
      details: `Toggled user ${user.email} to ${updated.isActive ? 'active' : 'inactive'}`,
      ipAddress: req.ip ? String(req.ip) : undefined
    });

    res.json({ isActive: updated.isActive });
  } catch { res.status(500).json({ message: 'Server error' }); }
};
