require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

async function main() {
  console.log("--- 1. Checking AuthGroup Table ---");
  const groups = await prisma.authGroup.findMany();
  console.log("AuthGroups in DB:", groups.length === 0 ? "Empty (Migration succeeded)" : groups.length);

  const adminLogin = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@company.com', password: 'admin123' })
  });
  const adminData = await adminLogin.json();
  const adminToken = adminData.token;

  const testUser = await prisma.user.findFirst({ where: { email: 'emp@company.com' } });
  if (!testUser) throw new Error("Test user not found");

  const pShiftView = await prisma.permission.findFirst({ where: { code: 'shift:view' } });
  const pShiftApprove = await prisma.permission.findFirst({ where: { code: 'shift:approve' } });
  const pOtApprove = await prisma.permission.findFirst({ where: { code: 'attendance:approve' } });
  const pLeaveApprove = await prisma.permission.findFirst({ where: { code: 'leave:approve' } });

  const firstDept = await prisma.department.findFirst({ orderBy: { id: 'asc' } });
  const targetDeptId = firstDept ? firstDept.id : 3;

  console.log(`\n--- 2. Create AuthGroup (Scope: Dept ${targetDeptId}) ---`);
  const res2 = await fetch('http://localhost:3000/api/auth-groups', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: "หัวหน้ากะ IT",
      color: "#3B82F6",
      scopeDeptIds: `[${targetDeptId}]`,
      permissionIds: [pShiftView.id, pShiftApprove.id, pOtApprove.id, pLeaveApprove.id]
    })
  });
  const group2 = await res2.json();
  console.log("Created Group:", group2);

  console.log("\n--- 3. Assign Member ---");
  const res3 = await fetch(`http://localhost:3000/api/auth-groups/${group2.id}/members`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userIds: [testUser.id] })
  });
  console.log("Assign Response:", await res3.json());

  console.log("\n--- 4. Check JWT Permissions ---");
  const res4 = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'emp@company.com', password: 'emp123' })
  });
  const loginData = await res4.json();
  const decoded = jwt.decode(loginData.token);
  console.log("JWT Permissions includes shift:approve?", decoded.permissions.includes('shift:approve'));
  console.log("JWT Permissions includes attendance:approve?", decoded.permissions.includes('attendance:approve'));

  console.log(`\n--- 5. Test Employee Scope (DeptId ${targetDeptId}) ---`);
  const res5 = await fetch('http://localhost:3000/api/employees', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${loginData.token}` }
  });
  const emps = await res5.json();
  const deptIds = [...new Set((emps.data || []).map(e => e.deptId))];
  console.log("Returned Employees count:", emps.data ? emps.data.length : 0);
  console.log("Returned Dept IDs:", deptIds);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
