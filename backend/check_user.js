const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findUnique({where:{email:'emp@company.com'}, include: {userRoles: {include: {role: true}}}}).then(u => {
  console.log('empId:', u.empId, 'level:', u.userRoles[0].role.level);
  p.$disconnect();
});
