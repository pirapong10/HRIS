import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateSso() {
  await prisma.payrollComponent.update({
    where: { code: 'SSO' },
    data: { formula: 'MIN(BASIC * SSO_RATE, SSO_CAP)' }
  });
  console.log('SSO formula updated to MIN(BASIC * SSO_RATE, SSO_CAP)');
}

updateSso().finally(() => prisma.$disconnect());
