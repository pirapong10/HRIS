const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const email = 'admin@ps-trading.com';
  let user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    const password = await bcrypt.hash('admin123', 10);
    user = await prisma.user.create({
      data: { email, password, role: 'admin', isActive: true }
    });
    console.log('Created admin user:', email);
  }

  const superAdminRole = await prisma.role.findUnique({ where: { code: 'SUPER_ADMIN' } });
  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: superAdminRole.id } },
      update: {},
      create: { userId: user.id, roleId: superAdminRole.id }
    });
    console.log('Assigned SUPER_ADMIN role to', email);
  } else {
    console.log('SUPER_ADMIN role not found. Did you run seed_rbac.js?');
  }
}

main().finally(() => prisma.$disconnect());
