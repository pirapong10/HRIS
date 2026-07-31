const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.employeeType.findMany({orderBy:{sortOrder:'asc'}})
  .then(r => r.forEach(x => console.log(x.code, x.ssoEnabled, x.taxMethod, x.isActive)))
  .catch(console.error)
  .finally(() => process.exit(0));
