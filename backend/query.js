const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const last = await prisma.employee.findFirst({
    orderBy: { empCode: 'desc' },
    select: { empCode: true }
  });
  console.log("Highest empCode:", last?.empCode);
}

main().catch(console.error).finally(() => prisma.$disconnect());
