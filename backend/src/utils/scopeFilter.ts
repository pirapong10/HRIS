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
  role: string;
  roles: string[];
  permissions: string[];
  level: number;
  deptIds: number[];
  empId: number | null;
}

export async function buildEmployeeWhereClause(user: RequestUser) {
  // SUPER_ADMIN / SYSTEM_ADMIN / HR_DIRECTOR → ไม่กรอง
  if (user.level >= 80) return {};

  const scope = await prisma.dataScope.findUnique({
    where: { userId: user.id }
  });

  if (!scope) {
    // ถ้าไม่มี scope → ใช้ deptIds จาก JWT (UserRole.deptIds)
    if (user.deptIds && user.deptIds.length > 0) {
      return { deptId: { in: user.deptIds } };
    }
    // EMPLOYEE → เห็นแค่ตัวเอง
    if (user.level <= 10) {
      return { id: user.empId || -1 }; // Match empId of current user
    }
    return { id: -1 }; // No access
  }

  const where: any = {};

  if (scope.departmentIds) {
    const deptIds = JSON.parse(scope.departmentIds);
    if (deptIds.length > 0) {
      where.deptId = { in: deptIds.map(Number) };
    }
  }

  if (scope.employeeTypes) {
    const types = JSON.parse(scope.employeeTypes);
    if (types.length > 0) {
      where.type = { in: types };
    }
  }

  if (scope.jobGrades) {
    const grades = JSON.parse(scope.jobGrades);
    if (grades.length > 0) {
      where.position = { grade: { in: grades } };
    }
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
      employeeWhere.deptId = { in: deptIds.map(Number) };
      payrollDetailWhere.employee = { deptId: { in: deptIds.map(Number) } };
    }
  }

  return {
    accessLevel: 'RESTRICTED',
    employeeWhere,
    payrollDetailWhere
  };
}
