const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const empRole = await p.role.findFirst({ where: { code: 'EMPLOYEE' } });
  const empUser = await p.user.findUnique({ where: { email: 'emp@company.com' } });
  
  await p.userRole.deleteMany({ where: { userId: empUser.id } });
  await p.userRole.create({ data: { userId: empUser.id, roleId: empRole.id } });
  
  console.log("Fixed emp@company.com to EMPLOYEE role.");
}

main().catch(console.error).finally(() => p.$disconnect());
