import { prisma } from '../prisma';

export async function loadUserPermissions(userId: number) {
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
