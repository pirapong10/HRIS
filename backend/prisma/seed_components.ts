// Standalone: seed only payroll components (idempotent, no data deletion)
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const components = [
    { code: 'BASIC',    name: 'เงินเดือนฐาน',          type: 'earning',   calcMethod: 'formula',   formula: 'Salary',                              isTaxable: true,  isSSOBase: true,  sortOrder: 1 },
    { code: 'OT_PAY',  name: 'ค่าล่วงเวลา',            type: 'earning',   calcMethod: 'formula',   formula: '(Salary / 30 / 8) * OTHours * 1.5',   isTaxable: true,  isSSOBase: false, sortOrder: 2 },
    { code: 'BONUS',   name: 'โบนัส',                  type: 'earning',   calcMethod: 'formula',   formula: '0',                                   isTaxable: true,  isSSOBase: false, sortOrder: 3 },
    { code: 'SSO',     name: 'ประกันสังคม',             type: 'deduction', calcMethod: 'formula',   formula: 'MIN(BASIC * 0.05, 750)',               isTaxable: false, isSSOBase: false, sortOrder: 4 },
    { code: 'PVF',     name: 'กองทุนสำรองเลี้ยงชีพ',       type: 'deduction', calcMethod: 'formula',   formula: 'BASIC * 0.05',                        isTaxable: false, isSSOBase: false, sortOrder: 4.5 },
    { code: 'TAX',     name: 'ภาษีหัก ณ ที่จ่าย',     type: 'deduction', calcMethod: 'function',  functionName: 'calculateThaiTax',               isTaxable: false, isSSOBase: false, sortOrder: 5 },
    { code: 'LATE_DED',name: 'หักมาสาย',               type: 'deduction', calcMethod: 'formula',   formula: '(Salary / 30 / 8 / 60) * LateMinutes',isTaxable: false, isSSOBase: false, sortOrder: 6 },
    { code: 'LOAN_DED',name: 'หักเงินกู้',              type: 'deduction', calcMethod: 'formula',   formula: 'LoanDeduction',                       isTaxable: false, isSSOBase: false, sortOrder: 7 },
  ];

  for (const comp of components) {
    const result = await prisma.payrollComponent.upsert({
      where: { code: comp.code },
      update: { ...comp },
      create: { ...comp },
    });
    console.log(`✅ ${result.code} (id=${result.id}): ${result.name}`);
  }
  console.log('\n✅ Payroll components seeded successfully.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
