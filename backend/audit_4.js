const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.employee.count({where:{employeeTypeId:{not:null}}})
  .then(r => console.log('linked:', r))
  .catch(console.error)
  .finally(() => process.exit(0));
