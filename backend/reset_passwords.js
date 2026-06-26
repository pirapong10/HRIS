const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash('admin123', 10);
  const hrPass = await bcrypt.hash('hr123', 10);
  const empPass = await bcrypt.hash('emp123', 10);
  
  await prisma.user.updateMany({ where: { email: 'admin@company.com' }, data: { password: adminPass } });
  await prisma.user.updateMany({ where: { email: 'hr@company.com' }, data: { password: hrPass } });
  await prisma.user.updateMany({ where: { email: 'emp@company.com' }, data: { password: empPass } });

  console.log("Passwords have been successfully reset to:");
  console.log("- admin@company.com / admin123");
  console.log("- hr@company.com / hr123");
  console.log("- emp@company.com / emp123");
}

main().catch(console.error).finally(() => prisma.$disconnect());
