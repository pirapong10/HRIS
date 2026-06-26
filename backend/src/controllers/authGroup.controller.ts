import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { writeAudit } from '../utils/audit';

export const getAuthGroups = async (req: Request, res: Response) => {
  try {
    const groups = await prisma.authGroup.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { members: true } },
        permissions: { include: { permission: true } }
      }
    });
    
    const formatted = groups.map(g => ({
      ...g,
      memberCount: g._count.members,
      permissions: g.permissions.map(p => p.permission.code)
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error('getAuthGroups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createAuthGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, color, scopeDeptIds, scopeCostCenterIds, scopeEmpTypes, scopeJobGrades, permissionIds } = req.body;

    const group = await prisma.authGroup.create({
      data: {
        name,
        description,
        color,
        scopeDeptIds,
        scopeCostCenterIds,
        scopeEmpTypes,
        scopeJobGrades,
        permissions: {
          create: (permissionIds || []).map((pid: number) => ({ permissionId: pid }))
        }
      }
    });

    if (req.user) {
      await writeAudit({
        userId: req.user.id,
        action: 'CREATE',
        module: 'access_control',
        recordId: String(group.id),
        details: `Created AuthGroup: ${name}`,
        ipAddress: req.ip ? String(req.ip) : undefined
      });
    }

    res.status(201).json(group);
  } catch (error: any) {
    console.error('createAuthGroup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAuthGroupDetails = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const group = await prisma.authGroup.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        members: { include: { user: true } }
      }
    });

    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json(group);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateAuthGroup = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { name, description, color, scopeDeptIds, scopeCostCenterIds, scopeEmpTypes, scopeJobGrades, permissionIds } = req.body;

    await prisma.authGroupPermission.deleteMany({ where: { groupId: id } });

    const group = await prisma.authGroup.update({
      where: { id },
      data: {
        name,
        description,
        color,
        scopeDeptIds,
        scopeCostCenterIds,
        scopeEmpTypes,
        scopeJobGrades,
        permissions: {
          create: (permissionIds || []).map((pid: number) => ({ permissionId: pid }))
        }
      }
    });

    if (req.user) {
      await writeAudit({
        userId: req.user.id,
        action: 'UPDATE',
        module: 'access_control',
        recordId: String(id),
        details: `Updated AuthGroup: ${name}`,
        ipAddress: req.ip ? String(req.ip) : undefined
      });
    }

    res.json(group);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteAuthGroup = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const group = await prisma.authGroup.update({
      where: { id },
      data: { isActive: false }
    });

    if (req.user) {
      await writeAudit({
        userId: req.user.id,
        action: 'DELETE',
        module: 'access_control',
        recordId: String(id),
        details: `Soft deleted AuthGroup: ${group.name}`,
        ipAddress: req.ip ? String(req.ip) : undefined
      });
    }

    res.json({ message: 'Group deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const addMembers = async (req: AuthRequest, res: Response) => {
  try {
    const groupId = Number(req.params.id);
    const { userIds } = req.body;
    
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    for (const userId of userIds) {
      await prisma.authGroupMember.upsert({
        where: { groupId_userId: { groupId, userId } },
        update: {},
        create: {
          groupId,
          userId,
          assignedBy: req.user.id
        }
      });
    }

    await writeAudit({
      userId: req.user.id,
      action: 'UPDATE',
      module: 'access_control',
      recordId: String(groupId),
      details: `Added users ${userIds.join(',')} to group ${groupId}`,
      ipAddress: req.ip ? String(req.ip) : undefined
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('addMembers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    const groupId = Number(req.params.id);
    const userId = Number(req.params.userId);

    await prisma.authGroupMember.delete({
      where: { groupId_userId: { groupId, userId } }
    });

    if (req.user) {
      await writeAudit({
        userId: req.user.id,
        action: 'UPDATE',
        module: 'access_control',
        recordId: String(groupId),
        details: `Removed user ${userId} from group ${groupId}`,
        ipAddress: req.ip ? String(req.ip) : undefined
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMembers = async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.id);
    const members = await prisma.authGroupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            empId: true,
            userRoles: {
              include: { role: { select: { code: true } } }
            }
          }
        }
      }
    });

    const formatted = members.map(m => ({
      ...m,
      user: {
        id: m.user.id,
        email: m.user.email,
        empId: m.user.empId,
        roles: m.user.userRoles.map(ur => ur.role.code)
      }
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};
