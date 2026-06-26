const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const email = 'testapi@company.com';
  const plainPassword = 'password123';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  
  const role = await prisma.role.findFirst({ where: { code: 'SUPER_ADMIN' } });
  
  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashedPassword, isActive: true },
    create: { email, password: hashedPassword, isActive: true }
  });
  
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {}, create: { userId: user.id, roleId: role.id }
  });

  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: plainPassword })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  if (!token) {
    console.log("Failed to login", loginData);
    return;
  }

  const createRes = await fetch("http://localhost:3000/api/employees", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      name: "Test Employee",
      deptId: 29,
      posId: 36,
      shiftId: 10,
      salary: 25000,
      type: "fulltime",
      hireDate: "2026-01-01"
    })
  });
  
  const createdData = await createRes.json();
  const match = JSON.stringify(createdData).match(/"empCode":"[^"]*"/);
  console.log(match ? match[0] : JSON.stringify(createdData));
}

main().catch(console.error).finally(() => prisma.$disconnect());
