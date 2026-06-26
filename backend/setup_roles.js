const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const plainPassword = 'password123';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  
  const superAdminRole = await prisma.role.findFirst({ where: { code: 'SUPER_ADMIN' } });
  const hrManagerRole = await prisma.role.findFirst({ where: { code: 'HR_MANAGER' } });
  const employeeRole = await prisma.role.findFirst({ where: { code: 'EMPLOYEE' } });
  
  // 1. admin@company.com (SUPER_ADMIN)
  let admin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: { password: hashedPassword, isActive: true },
    create: { email: 'admin@company.com', password: hashedPassword, isActive: true }
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: superAdminRole.id } },
    update: {}, create: { userId: admin.id, roleId: superAdminRole.id }
  });

  // 2. hr@company.com (HR_MANAGER)
  let hr = await prisma.user.upsert({
    where: { email: 'hr@company.com' },
    update: { password: hashedPassword, isActive: true },
    create: { email: 'hr@company.com', password: hashedPassword, isActive: true }
  });
  await prisma.userRole.deleteMany({ where: { userId: hr.id } });
  await prisma.userRole.create({
    data: { userId: hr.id, roleId: hrManagerRole.id, deptIds: '[1, 29]' }
  });

  // 3. emp@company.com (EMPLOYEE)
  const newEmp = await prisma.employee.create({
    data: { name: 'Test Emp', deptId: 29, posId: 36, shiftId: 10, empCode: 'TEST001', type: 'fulltime', hireDate: '2026-06-26', salary: 20000, status: 'active' }
  });
  let emp = await prisma.user.upsert({
    where: { email: 'emp@company.com' },
    update: { password: hashedPassword, isActive: true, empId: newEmp.id },
    create: { email: 'emp@company.com', password: hashedPassword, isActive: true, empId: newEmp.id }
  });
  await prisma.userRole.deleteMany({ where: { userId: emp.id } });
  await prisma.userRole.create({
    data: { userId: emp.id, roleId: employeeRole.id }
  });

  console.log("Users setup complete. Password for all is 'password123'");
}

main().catch(console.error).finally(() => prisma.$disconnect());
