import { PrismaClient } from '@prisma/client';
import redisClient from '../utils/redis';

const prisma = new PrismaClient();

async function main() {
  // SEED EMPLOYEE ROLE PROPERLY FOR TEST
  const pView = await prisma.permission.upsert({ where: { code: 'employee:view' }, update: {}, create: { code: 'employee:view', module: 'employee', action: 'view' } });
  const lView = await prisma.permission.upsert({ where: { code: 'leave:view' }, update: {}, create: { code: 'leave:view', module: 'leave', action: 'view' } });
  
  const empRole = await prisma.role.upsert({
    where: { code: 'EMPLOYEE' },
    update: {},
    create: { name: 'EMPLOYEE', code: 'EMPLOYEE', level: 10 }
  });
  
  await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: empRole.id, permissionId: pView.id } }, update: {}, create: { roleId: empRole.id, permissionId: pView.id } });
  await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: empRole.id, permissionId: lView.id } }, update: {}, create: { roleId: empRole.id, permissionId: lView.id } });

  let emp = await prisma.user.findUnique({ where: { email: 'emp@company.com' } });
  if (emp) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: emp.id, roleId: empRole.id } },
      update: {},
      create: { userId: emp.id, roleId: empRole.id }
    });
  }

  console.log('--- 1. EMPLOYEE role permissions ---');
  const perms: any[] = await prisma.$queryRaw`
    SELECT p.code FROM "Permission" p
    JOIN "RolePermission" rp ON rp."permissionId" = p.id
    JOIN "Role" r ON r.id = rp."roleId"
    WHERE r.name = 'EMPLOYEE'
    ORDER BY p.code;
  `;
  console.log(perms.map(p => p.code));

  console.log('\n--- 2. User with empId=7 ---');
  const user: any[] = await prisma.$queryRaw`
    SELECT u.email, r.name as role FROM "User" u
    JOIN "UserRole" ur ON ur."userId" = u.id
    JOIN "Role" r ON r.id = ur."roleId"
    WHERE u."empId" = 7;
  `;
  console.log(user);

  console.log('\n--- 3. Test real EMPLOYEE login ---');


  // Clear redis cache to ensure fresh permissions are baked into JWT
  await redisClient.flushAll();

  const empTest = await prisma.user.findFirst({
    where: { userRoles: { some: { role: { name: 'EMPLOYEE' } } } },
    include: { userRoles: { include: { role: true } } }
  });
  if (!empTest) {
    console.log('No user with EMPLOYEE role found.');
    return;
  }
  console.log(`Found EMPLOYEE user: ${empTest.email}, empId: ${empTest.empId}`);
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: empTest.email, password: empTest.email.split('@')[0] + '123' })
  });
  const loginData = await loginRes.json();
  
  if (loginRes.status === 200) {
    const res = await fetch(`http://localhost:3000/api/employees/${empTest.empId}`, {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    console.log(`GET /api/employees/${empTest.empId} -> Status ${res.status}`);
    const resData = await res.json();
    console.log(resData);
    
    // Also test getting someone else's employee record to confirm 403
    const otherRes = await fetch(`http://localhost:3000/api/employees/5`, {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    console.log(`GET /api/employees/5 (other) -> Status ${otherRes.status}`);
  } else {
    console.log(`Login failed: ${loginRes.status}`, loginData);
  }
}

main().catch(console.error);
