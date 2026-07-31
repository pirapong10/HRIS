import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function migrate() {
  const types = await prisma.employeeType.findMany();
  const typeMap = new Map(types.map(t => [t.code, t.id]));

  const employees = await prisma.employee.findMany({
    select: { id: true, type: true, employeeTypeId: true }
  });

  let updated = 0;
  for (const emp of employees) {
    const typeId = typeMap.get(emp.type);
    if (typeId && emp.employeeTypeId !== typeId) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { employeeTypeId: typeId }
      });
      updated++;
    }
  }
  console.log(`Migrated ${updated} / ${employees.length} employees`);

  // Verify
  const unmapped = await prisma.employee.count({ where: { employeeTypeId: null } });
  console.log(`Employees without employeeTypeId: ${unmapped}`);
}

migrate().finally(() => prisma.$disconnect());
