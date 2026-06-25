import { PrismaClient } from '@prisma/client';
import { buildPayrollWhereClause } from './src/utils/scopeFilter';

const prisma = new PrismaClient();

async function run() {
  const hr = await prisma.user.findUnique({ where: { email: 'hr@company.com' }});
  
  if (!hr) {
    console.log("HR user not found.");
    return;
  }

  // Create mock RequestUser for HR
  const reqUser = {
    id: hr.id,
    email: hr.email,
    role: hr.role,
    roles: ['HR_MANAGER'], // mock
    permissions: [],
    level: 50, // Not super admin (which is 80+)
    deptIds: [],
    empId: hr.empId
  };

  const scopeWhere = await buildPayrollWhereClause(reqUser);
  console.log("Calculated scopeWhere:", JSON.stringify(scopeWhere, null, 2));

  let empWhere: any = {};
  if (scopeWhere.employee) {
    empWhere = scopeWhere.employee;
  } else if (scopeWhere.empId !== undefined) {
    empWhere.id = scopeWhere.empId;
  }

  console.log("Applied empWhere to query:", JSON.stringify(empWhere, null, 2));

  const employees = await prisma.employee.findMany({
    where: empWhere,
    include: { department: true }
  });

  console.log(`HR can see ${employees.length} employees for payroll.`);
  employees.forEach(e => console.log(` - ${e.name} (${e.department?.code})`));
}

run().catch(console.error).finally(() => prisma.$disconnect());
