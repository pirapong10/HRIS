import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const prisma = new PrismaClient();

async function getReq(path: string, token: string) {
  const res = await fetch(`http://localhost:3000${path}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return { status: res.status, data: await res.json() };
}

async function main() {
  const adminUser = await prisma.user.findFirst({ where: { email: 'admin@company.com' } });
  const hrUser = await prisma.user.findFirst({ where: { email: 'hr@company.com' } });
  const empUser = await prisma.user.findFirst({ where: { email: 'emp@company.com' } });

  // Add missing permissions
  const p1 = await prisma.permission.upsert({ where: { code: 'employee:view' }, update: {}, create: { code: 'employee:view', module: 'employee', action: 'view' } });
  const p2 = await prisma.permission.upsert({ where: { code: 'leave:view' }, update: {}, create: { code: 'leave:view', module: 'leave', action: 'view' } });
  const p3 = await prisma.permission.upsert({ where: { code: 'attendance:view' }, update: {}, create: { code: 'attendance:view', module: 'attendance', action: 'view' } });
  const empRole = await prisma.role.findFirst({ where: { code: 'EMPLOYEE' } });
  if (empRole) {
    await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: empRole.id, permissionId: p1.id } }, update: {}, create: { roleId: empRole.id, permissionId: p1.id } });
    await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: empRole.id, permissionId: p2.id } }, update: {}, create: { roleId: empRole.id, permissionId: p2.id } });
    if (empUser) await prisma.userRole.upsert({ where: { userId_roleId: { userId: empUser.id, roleId: empRole.id } }, update: {}, create: { userId: empUser.id, roleId: empRole.id } });
  }
  const hrRole = await prisma.role.findFirst({ where: { code: 'HR_DIRECTOR' } });
  if (hrRole) {
    await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: hrRole.id, permissionId: p2.id } }, update: {}, create: { roleId: hrRole.id, permissionId: p2.id } });
    await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: hrRole.id, permissionId: p3.id } }, update: {}, create: { roleId: hrRole.id, permissionId: p3.id } });
    if (hrUser) await prisma.userRole.upsert({ where: { userId_roleId: { userId: hrUser.id, roleId: hrRole.id } }, update: {}, create: { userId: hrUser.id, roleId: hrRole.id } });
  }
  if (hrUser) {
    await prisma.dataScope.upsert({
      where: { userId: hrUser.id },
      update: { departmentIds: '["3"]' },
      create: { userId: hrUser.id, departmentIds: '["3"]' }
    });
  }

  // Clear redis
  const { default: redisClient } = require('../utils/redis');
  await redisClient.flushAll();

  const adminToken = jwt.sign({ jti: 'admin-jti', id: adminUser?.id, email: 'admin@company.com', roles: ['SUPER_ADMIN'], permissions: [], level: 100, deptIds: [], empId: adminUser?.empId }, JWT_SECRET);
  const hrToken = jwt.sign({ jti: 'hr-jti', id: hrUser?.id, email: 'hr@company.com', roles: ['HR_MANAGER'], permissions: ['leave:view', 'attendance:view'], level: 50, deptIds: [3], empId: hrUser?.empId }, JWT_SECRET);
  const empToken = jwt.sign({ jti: 'emp-jti', id: empUser?.id, email: 'emp@company.com', roles: ['EMPLOYEE'], permissions: ['employee:view', 'leave:view', 'attendance:view'], level: 10, deptIds: [], empId: empUser?.empId }, JWT_SECRET);

  console.log('--- 2 & 3. Test Leave/OT Scope as HR (dept limited) ---');
  const hrLeaves = await getReq('/api/leaves', hrToken);
  console.log(`HR Leaves: GET /api/leaves -> Status ${hrLeaves.status}, Data: ${hrLeaves.data.data?.length || 0} items`);
  const hrOts = await getReq('/api/ot', hrToken);
  console.log(`HR OTs: GET /api/ot -> Status ${hrOts.status}, Data: ${hrOts.data.data?.length || 0} items`);

  console.log('\n--- 4. Test Ownership as EMPLOYEE ---');
  console.log(`Employee is empId=${empUser?.empId}`);
  
  const ownEmpRes = await getReq(`/api/employees/${empUser?.empId}`, empToken);
  console.log(`GET /api/employees/${empUser?.empId} (own) -> Status ${ownEmpRes.status}`);
  const otherEmpRes = await getReq(`/api/employees/${adminUser?.empId}`, empToken);
  console.log(`GET /api/employees/${adminUser?.empId} (other) -> Status ${otherEmpRes.status}`);

  // Try to create leave for emp and admin to test
  await prisma.leave.create({ data: { empId: empUser!.empId!, type: 'vacation', startDate: '2026-07-01', endDate: '2026-07-02', reason: 'test', status: 'pending', days: 1 } }).catch(() => {});
  await prisma.leave.create({ data: { empId: adminUser!.empId!, type: 'sick', startDate: '2026-07-01', endDate: '2026-07-02', reason: 'test', status: 'pending', days: 1 } }).catch(() => {});
  
  const leaves = await prisma.leave.findMany();
  const ownL = leaves.find((l: any) => l.empId === empUser?.empId);
  const otherL = leaves.find((l: any) => l.empId === adminUser?.empId);

  if (ownL) {
    const ownLRes = await getReq(`/api/leaves/${ownL.id}`, empToken);
    console.log(`GET /api/leaves/${ownL.id} (own) -> Status ${ownLRes.status}`);
  }
  if (otherL) {
    const otherLRes = await getReq(`/api/leaves/${otherL.id}`, empToken);
    console.log(`GET /api/leaves/${otherL.id} (other) -> Status ${otherLRes.status}`);
  }

  console.log('\n--- 5. Test SUPER_ADMIN bypass ---');
  const adminEmpRes = await getReq(`/api/employees/${empUser?.empId}`, adminToken);
  console.log(`GET /api/employees/${empUser?.empId} as SUPER_ADMIN -> Status ${adminEmpRes.status}`);
}

main().catch(console.error);
