const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const positions = [
    { name: 'IT Director', code: 'IT_DIR', level: 'Director', salary: 120000, description: 'Manage IT operations' },
    { name: 'Full Stack Developer', code: 'IT_DEV_FS', level: 'Senior', salary: 60000, description: 'Develop web apps' },
    { name: 'Sales Director', code: 'SAL_DIR', level: 'Director', salary: 130000, description: 'Manage global sales' },
    { name: 'Account Executive', code: 'SAL_AE', level: 'Senior', salary: 45000, description: 'B2B Sales' },
    { name: 'HR Recruiter', code: 'HR_REC', level: 'Junior', salary: 28000, description: 'Talent acquisition' }
  ];

  for (const pos of positions) {
    try {
      await prisma.position.upsert({
        where: { code: pos.code },
        update: {},
        create: pos
      });
      console.log('Created position:', pos.name);
    } catch (e) {
      console.log('Skipped/Error:', pos.name, e.message);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
