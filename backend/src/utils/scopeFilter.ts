import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';

export interface PayrollScopeFilter {
  accessLevel: 'GLOBAL' | 'RESTRICTED' | 'DENIED';
  employeeWhere: Prisma.EmployeeWhereInput;
  payrollDetailWhere: Prisma.PayrollRunDetailWhereInput;
}

export interface RequestUser {
  id: number;
  email: string;
  roles: string[];
  permissions: string[];
  level: number;
  deptIds: number[];
  empId: number | null;
}

/**
 * Recursively expands a list of department IDs to include
 * all descendant departments (subtree).
 * 
 * Example: expandToSubtree([2]) where dept 2 has children [3,4]
 *          and dept 3 has children [5] → returns [2,3,4,5]
 */
export async function expandToSubtree(deptIds: number[]): Promise<number[]> {
  if (!deptIds || deptIds.length === 0) return [];
  
  const result = new Set<number>(deptIds);
  const queue = [...deptIds];

  let safetyCounter = 0; // prevent infinite loop
  const MAX_DEPTH = 10;

  while (queue.length > 0 && safetyCounter < MAX_DEPTH * result.size) {
    const parentId = queue.shift()!;
    const children = await prisma.department.findMany({
      where: { parentId, status: 'active' },
      select: { id: true }
    });
    children.forEach(c => {
      if (!result.has(c.id)) {
        result.add(c.id);
        queue.push(c.id);
      }
    });
    safetyCounter++;
  }

  console.log('[expandToSubtree] input:', deptIds, '→ expanded:', [...result]);
  return [...result];
}

export async function buildEmployeeWhereClause(user: RequestUser) {
  // SUPER_ADMIN / SYSTEM_ADMIN / HR_DIRECTOR → ไม่กรอง
  if (user.level >= 80) return {};

  const scope = await prisma.dataScope.findUnique({
    where: { userId: user.id }
  });

  // SOURCE 2: AuthGroup scopes (NEW)
  const authGroups = await prisma.authGroup.findMany({
    where: {
      isActive: true,
      members: { some: { userId: user.id } }
    },
    select: {
      scopeDeptIds: true,
      scopeCostCenterIds: true,
      scopeEmpTypes: true,
      scopeJobGrades: true
    }
  });

  const deptIds = new Set<number>();
  const empTypes = new Set<string>();
  const jobGrades = new Set<string>();
  const costCenterIds = new Set<number>();

  if (scope?.departmentIds) {
    try { JSON.parse(scope.departmentIds).forEach((id: number) => deptIds.add(Number(id))); } catch {}
  }
  if (scope?.employeeTypes) {
    try { JSON.parse(scope.employeeTypes).forEach((t: string) => empTypes.add(t)); } catch {}
  }
  if (scope?.jobGrades) {
    try { JSON.parse(scope.jobGrades).forEach((g: string) => jobGrades.add(g)); } catch {}
  }
  if (scope?.costCenterIds) {
    try { JSON.parse(scope.costCenterIds).forEach((id: number) => costCenterIds.add(Number(id))); } catch {}
  }

  authGroups.forEach(g => {
    if (g.scopeDeptIds) {
      try { JSON.parse(g.scopeDeptIds).forEach((id: number) => deptIds.add(Number(id))); } catch {}
    }
    if (g.scopeEmpTypes) {
      try { JSON.parse(g.scopeEmpTypes).forEach((t: string) => empTypes.add(t)); } catch {}
    }
    if (g.scopeJobGrades) {
      try { JSON.parse(g.scopeJobGrades).forEach((g: string) => jobGrades.add(g)); } catch {}
    }
    if (g.scopeCostCenterIds) {
      try { JSON.parse(g.scopeCostCenterIds).forEach((id: number) => costCenterIds.add(Number(id))); } catch {}
    }
  });

  // EMPLOYEE -> only self, ONLY if they have NO other scope
  if (user.level <= 10 && deptIds.size === 0 && empTypes.size === 0 && jobGrades.size === 0 && costCenterIds.size === 0) {
    return { id: user.empId || -1 };
  }

  if (deptIds.size === 0 && empTypes.size === 0 && jobGrades.size === 0 && costCenterIds.size === 0) {
    // Fall back to JWT deptIds
    if (user.deptIds && user.deptIds.length > 0) {
      const expandedDeptIds = await expandToSubtree(user.deptIds);
      return { deptId: { in: expandedDeptIds } };
    }
    return { id: -1 };
  }

  const where: any = {};

  if (deptIds.size > 0) {
    const expandedDeptIds = await expandToSubtree([...deptIds]);
    where.deptId = { in: expandedDeptIds };
  }
  if (empTypes.size > 0) where.type = { in: [...empTypes] };
  if (jobGrades.size > 0) where.position = { grade: { in: [...jobGrades] } };
  
  if (costCenterIds.size > 0) {
    where.department = {
      ...where.department,
      costCenterId: { in: [...costCenterIds] }
    };
  }

  return where;
}

export async function buildPayrollWhereClause(user: RequestUser): Promise<PayrollScopeFilter> {
  // SUPER_ADMIN / SYSTEM_ADMIN / HR_DIRECTOR → ไม่กรอง
  if (user.level >= 80) {
    return {
      accessLevel: 'GLOBAL',
      employeeWhere: {},
      payrollDetailWhere: {}
    };
  }

  const scope = await prisma.payrollScope.findUnique({
    where: { userId: user.id }
  });

  if (!scope) {
    // EMPLOYEE -> only self
    if (user.level <= 10 && user.empId) {
      return {
        accessLevel: 'RESTRICTED',
        employeeWhere: { id: user.empId },
        payrollDetailWhere: { empId: user.empId }
      };
    }
    // No scope → ไม่เห็นอะไรเลย (safe default)
    return {
      accessLevel: 'DENIED',
      employeeWhere: { id: -1 },
      payrollDetailWhere: { empId: -1 }
    };
  }

  const employeeWhere: Prisma.EmployeeWhereInput = {};
  const payrollDetailWhere: Prisma.PayrollRunDetailWhereInput = {};

  if (scope.departments) {
    const deptIds = JSON.parse(scope.departments);
    if (deptIds.length > 0) {
      const expandedDeptIds = await expandToSubtree(deptIds.map(Number));
      employeeWhere.deptId = { in: expandedDeptIds };
      payrollDetailWhere.employee = { deptId: { in: expandedDeptIds } };
    }
  }

  return {
    accessLevel: 'RESTRICTED',
    employeeWhere,
    payrollDetailWhere
  };
}
