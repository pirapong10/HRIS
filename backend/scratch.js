const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const roles = await prisma.role.findMany({ orderBy: { level: 'desc' }});
  console.log('--- Roles ---');
  roles.forEach(r => console.log(`${r.name.padEnd(25)} | Level: ${r.level}`));

  const users = await prisma.user.findMany({
    include: { userRoles: { include: { role: true } } }
  });
  console.log('\n--- Test Users ---');
  let userList = [];
  users.forEach(u => {
    if (u.userRoles.length > 0) {
      userList.push({ email: u.email, role: u.userRoles[0].role.name, level: u.userRoles[0].role.level });
    }
  });
  userList.sort((a,b) => b.level - a.level);
  userList.forEach(u => console.log(`${u.email.padEnd(30)} | Role: ${u.role}`));
}
run().catch(console.error);
