import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const users = [
    { email: 'admin@company.com', password: 'admin123', roleCode: 'SUPER_ADMIN' },
    { email: 'hr@company.com', password: 'hr123', roleCode: 'HR_MANAGER' },
    { email: 'emp@company.com', password: 'emp123', roleCode: 'EMPLOYEE' }
  ];

  for (const u of users) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    
    let role = await prisma.role.findUnique({ where: { code: u.roleCode } });
    if (!role) {
      console.log(`Role ${u.roleCode} not found in DB! Creating fallback...`);
      role = await prisma.role.create({
        data: {
          code: u.roleCode,
          name: u.roleCode,
          isSystem: true
        }
      });
    }

    const empCode = 'TEST-' + u.email.split('@')[0];
    let empId = existing?.empId;
    if (!empId) {
      let emp = await prisma.employee.findUnique({ where: { empCode } });
      if (!emp) {
        emp = await prisma.employee.create({
          data: {
            empCode,
            name: 'Test ' + u.email.split('@')[0],
            salary: 15000
          }
        });
      }
      empId = emp.id;
    }

    if (existing) {
      await prisma.user.update({
        where: { email: u.email },
        data: { 
          password: hashedPassword, 
          empId,
          userRoles: {
            deleteMany: {},
            create: [{ roleId: role.id }]
          }
        }
      });
      console.log('Updated ' + u.email);
    } else {
      await prisma.user.create({
        data: {
          email: u.email,
          password: hashedPassword,
          empId,
          userRoles: {
            create: [{ roleId: role.id }]
          }
        }
      });
      console.log('Created ' + u.email);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
