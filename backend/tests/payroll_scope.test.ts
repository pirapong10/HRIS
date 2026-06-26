import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import { prisma } from '../src/prisma';
import { buildPayrollWhereClause, RequestUser } from '../src/utils/scopeFilter';

describe('PayrollScope Enforcement', () => {
  beforeAll(async () => {
    // We can clear relevant tables or just use the seed data
    // Assuming DB is already populated, we'll just mock RequestUser and test the queries.
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('HR_DIRECTOR sees all payroll (no scope restriction)', async () => {
    const hrDirector: RequestUser = {
      id: 999,
      email: 'hr@example.com',
      roles: ['HR_DIRECTOR'],
      permissions: [],
      level: 80,
      deptIds: [],
      empId: null
    };

    const scope = await buildPayrollWhereClause(hrDirector);
    expect(scope.accessLevel).toBe('GLOBAL');
    expect(scope.employeeWhere).toEqual({});
    expect(scope.payrollDetailWhere).toEqual({});
  });

  it('PAYROLL_MANAGER sees all payroll in assigned departments', async () => {
    // Mock user with PayrollScope restricted to departments [1, 2]
    const pmId = 888;
    
    // Create the mock user first to satisfy foreign key constraints
    await prisma.user.upsert({
      where: { id: pmId },
      update: {},
      create: { id: pmId, email: 'pm_mock@example.com', password: '123' }
    });
    
    // First, let's inject a mock PayrollScope for this test
    await prisma.payrollScope.upsert({
      where: { userId: pmId },
      update: { departments: JSON.stringify([1, 2]) },
      create: { userId: pmId, departments: JSON.stringify([1, 2]) }
    });

    const pm: RequestUser = {
      id: pmId,
      email: 'pm@example.com',
      roles: ['PAYROLL_MANAGER'],
      permissions: [],
      level: 50,
      deptIds: [],
      empId: null
    };

    const scope = await buildPayrollWhereClause(pm);
    expect(scope.accessLevel).toBe('RESTRICTED');
    expect(scope.employeeWhere).toEqual({ deptId: { in: [1, 2] } });
    expect(scope.payrollDetailWhere).toEqual({ employee: { deptId: { in: [1, 2] } } });
  });

  it('PAYROLL_OFFICER only sees assigned scope', async () => {
    const poId = 777;
    
    await prisma.user.upsert({
      where: { id: poId },
      update: {},
      create: { id: poId, email: 'po_mock@example.com', password: '123' }
    });

    await prisma.payrollScope.upsert({
      where: { userId: poId },
      update: { departments: JSON.stringify([3]) },
      create: { userId: poId, departments: JSON.stringify([3]) }
    });

    const po: RequestUser = {
      id: poId,
      email: 'po@example.com',
      roles: ['PAYROLL_OFFICER'],
      permissions: [],
      level: 40,
      deptIds: [],
      empId: null
    };

    const scope = await buildPayrollWhereClause(po);
    expect(scope.accessLevel).toBe('RESTRICTED');
    expect(scope.employeeWhere).toEqual({ deptId: { in: [3] } });
    expect(scope.payrollDetailWhere).toEqual({ employee: { deptId: { in: [3] } } });
  });

  it('EMPLOYEE sees only own payslip', async () => {
    const empId = 666;
    const actualEmpId = 100; // Refers to Employee.id

    const emp: RequestUser = {
      id: empId,
      email: 'emp@example.com',
      roles: ['EMPLOYEE'],
      permissions: [],
      level: 10,
      deptIds: [],
      empId: actualEmpId
    };

    // Make sure no PayrollScope exists for this EMPLOYEE
    await prisma.payrollScope.deleteMany({ where: { userId: empId } });

    const scope = await buildPayrollWhereClause(emp);
    expect(scope.accessLevel).toBe('RESTRICTED');
    expect(scope.employeeWhere).toEqual({ id: actualEmpId });
    expect(scope.payrollDetailWhere).toEqual({ empId: actualEmpId });
  });
});
