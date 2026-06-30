import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data...');

  // Clean up existing data to prevent duplicates on re-seed
  await prisma.user.deleteMany({});
  await prisma.attendanceCorrection.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.leave.deleteMany({});
  await prisma.oT.deleteMany({});
  await prisma.shiftSwap.deleteMany({});
  await prisma.payrollRunDetail.deleteMany({});
  await prisma.payrollRun.deleteMany({});
  await prisma.empDoc.deleteMany({});
  await prisma.empHistory.deleteMany({});
  await prisma.onboardingTask.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.headcountRequest.deleteMany({});
  await prisma.position.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.shift.deleteMany({});
  await prisma.costCenter.deleteMany({});

  const passwordHash = await bcrypt.hash('admin1234', 10);

  // 1. Shifts
  const shift1 = await prisma.shift.create({ data: { name: 'กะเช้า', startTime: '08:00', endTime: '17:00', days: 'Mon,Tue,Wed,Thu,Fri' } });
  const shift2 = await prisma.shift.create({ data: { name: 'กะบ่าย', startTime: '13:00', endTime: '22:00', days: 'Mon,Tue,Wed,Thu,Fri,Sat', color: '#8B5CF6' } });
  const shift3 = await prisma.shift.create({ data: { name: 'กะดึก', startTime: '22:00', endTime: '07:00', days: 'Mon,Tue,Wed,Thu,Fri', color: '#F59E0B' } });

  // 2. Cost Centers
  const cc1 = await prisma.costCenter.create({ data: { code: 'CC-IT', name: 'Information Technology', budget: 1500000, fiscalYear: '2025' } });
  const cc2 = await prisma.costCenter.create({ data: { code: 'CC-HR', name: 'Human Resources', budget: 500000, fiscalYear: '2025' } });
  const cc3 = await prisma.costCenter.create({ data: { code: 'CC-SALE', name: 'Sales & Marketing', budget: 2000000, fiscalYear: '2025' } });

  // 3. Departments - Hierarchical Multi-Branch with International support
  // Level 0 — Country root (Phase A: International)
  const thailand = await prisma.department.create({ data: { code: 'TH', name: 'Thailand', type: 'Country', parentId: null, countryCode: 'TH', currency: 'THB', timezone: 'Asia/Bangkok' } });

  // Level 1 — Company under Country
  const hq = await prisma.department.create({ data: { code: 'HQ', name: 'สำนักงานใหญ่', type: 'Company', parentId: thailand.id, countryCode: 'TH', currency: 'THB', timezone: 'Asia/Bangkok' } });

  // Level 2 — Regions + HQ Division
  const regC = await prisma.department.create({ data: { code: 'REG-C', name: 'ภาคกลาง', type: 'Region', parentId: hq.id } });
  const regN = await prisma.department.create({ data: { code: 'REG-N', name: 'ภาคเหนือ', type: 'Region', parentId: hq.id } });
  const divHq = await prisma.department.create({ data: { code: 'DIV-HQ', name: 'ฝ่ายสนับสนุน HQ', type: 'Division', parentId: hq.id } });

  // Level 3 — Branches under regions (inherit country from parent)
  const bkk = await prisma.department.create({ data: { code: 'BKK', name: 'สาขากรุงเทพ', type: 'Branch', parentId: regC.id, countryCode: 'TH', currency: 'THB', timezone: 'Asia/Bangkok' } });
  const cnx = await prisma.department.create({ data: { code: 'CNX', name: 'สาขาเชียงใหม่', type: 'Branch', parentId: regN.id, countryCode: 'TH', currency: 'THB', timezone: 'Asia/Bangkok' } });
  const lpg = await prisma.department.create({ data: { code: 'LPG', name: 'สาขาลำปาง', type: 'Branch', parentId: regN.id, countryCode: 'TH', currency: 'THB', timezone: 'Asia/Bangkok' } });

  // Level 4 — Departments under branches
  const bkkHr = await prisma.department.create({ data: { code: 'BKK-HR', name: 'HR กรุงเทพ', type: 'Department', parentId: bkk.id, costCenterId: cc2.id } });
  const bkkIt = await prisma.department.create({ data: { code: 'BKK-IT', name: 'IT กรุงเทพ', type: 'Department', parentId: bkk.id, costCenterId: cc1.id } });
  const cnxHr = await prisma.department.create({ data: { code: 'CNX-HR', name: 'HR เชียงใหม่', type: 'Department', parentId: cnx.id, costCenterId: cc2.id } });
  const cnxIt = await prisma.department.create({ data: { code: 'CNX-IT', name: 'IT เชียงใหม่', type: 'Department', parentId: cnx.id, costCenterId: cc1.id } });

  // Level 5 — Sections (optional, for depth test)
  const cnxItSup = await prisma.department.create({ data: { code: 'CNX-IT-SUP', name: 'IT Support เชียงใหม่', type: 'Section', parentId: cnxIt.id, costCenterId: cc1.id } });

  // For compatibility with previous code, alias the leaf nodes
  const dept1 = bkkIt;
  const dept2 = bkkHr;
  const dept3 = cnxItSup;

  // 4. Positions
  const pos1 = await prisma.position.create({ data: { code: 'POS01', name: 'Software Engineer', deptId: dept1.id, level: 'Junior', salary: 35000 } });
  const pos2 = await prisma.position.create({ data: { code: 'POS02', name: 'Senior Software Engineer', deptId: dept1.id, level: 'Senior', salary: 55000 } });
  const pos3 = await prisma.position.create({ data: { code: 'POS03', name: 'HR Manager', deptId: dept2.id, level: 'Manager', salary: 65000 } });
  const pos4 = await prisma.position.create({ data: { code: 'POS04', name: 'HR Officer', deptId: dept2.id, level: 'Junior', salary: 45000 } });
  const pos5 = await prisma.position.create({ data: { code: 'POS05', name: 'Sales Representative', deptId: dept3.id, level: 'Junior', salary: 32000 } });

  // 5. Employees
  const emp1 = await prisma.employee.create({
    data: {
      empCode: 'EMP001', name: 'ธนพล ใจดี', deptId: dept1.id, posId: pos2.id, type: 'fulltime', hireDate: '2021-03-01', dob: '1990-05-15', gender: 'male', salary: 55000, bank: 'กสิกรไทย', bankAcc: 'xxx-x-xx001-x', phone: '081-234-5678', email: 'thanapol@company.com', shiftId: shift1.id, emName: 'คุณแม่', emRel: 'มารดา', emPhone: '089-999-9999'
    }
  });
  const emp2 = await prisma.employee.create({
    data: {
      empCode: 'EMP002', name: 'นิตยา สมบูรณ์', deptId: dept2.id, posId: pos4.id, type: 'fulltime', hireDate: '2020-06-15', dob: '1988-09-22', gender: 'female', salary: 45000, bank: 'ไทยพาณิชย์', bankAcc: 'xxx-x-xx002-x', phone: '082-345-6789', email: 'nittaya@company.com', shiftId: shift1.id
    }
  });
  const emp3 = await prisma.employee.create({
    data: {
      empCode: 'EMP003', name: 'สมชาย รักดี', deptId: dept1.id, posId: pos1.id, type: 'fulltime', hireDate: '2023-01-10', dob: '1995-12-01', gender: 'male', salary: 35000, bank: 'กรุงเทพ', bankAcc: 'xxx-x-xx003-x', phone: '083-456-7890', email: 'somchai@company.com', shiftId: shift2.id
    }
  });
  const emp4 = await prisma.employee.create({
    data: {
      empCode: 'EMP004', name: 'วิภา รักษ์งาน', deptId: dept3.id, posId: pos5.id, type: 'fulltime', hireDate: '2022-08-20', dob: '1992-03-14', gender: 'female', salary: 32000, bank: 'กรุงศรี', bankAcc: 'xxx-x-xx004-x', phone: '084-567-8901', email: 'wipa@company.com', shiftId: shift3.id
    }
  });

  // 6. Users (Logins)
  const adminHash = await bcrypt.hash('admin123', 10);
  const hrHash = await bcrypt.hash('hr123', 10);
  const empHash = await bcrypt.hash('emp123', 10);

  const adminRole = await prisma.role.findFirst({ where: { code: 'SUPER_ADMIN' } });
  const hrRole = await prisma.role.findFirst({ where: { code: 'HR_DIRECTOR' } });
  const empRole = await prisma.role.findFirst({ where: { code: 'EMPLOYEE' } });

  const adminUser = await prisma.user.create({
    data: { email: 'admin@company.com', password: adminHash, empId: emp1.id }
  });
  if (adminRole) await prisma.userRole.create({ data: { userId: adminUser.id, roleId: adminRole.id } });

  const hrUser = await prisma.user.create({
    data: { email: 'hr@company.com', password: hrHash, empId: emp2.id }
  });
  if (hrRole) await prisma.userRole.create({ data: { userId: hrUser.id, roleId: hrRole.id } });

  const empUser = await prisma.user.create({
    data: { email: 'emp@company.com', password: empHash, empId: emp3.id }
  });
  if (empRole) await prisma.userRole.create({ data: { userId: empUser.id, roleId: empRole.id } });

  console.log('Seeding completed! You can log in with:');
  console.log('👑 Admin: admin@company.com / admin123');
  console.log('👩💼 HR: hr@company.com / hr123');
  console.log('👤 Emp: emp@company.com / emp123');

  // Seed default payroll components (idempotent via upsert)
  await upsertPayrollComponents();
  console.log('✅ Default payroll components seeded.');
}

async function upsertPayrollComponents() {
  const components = [
    {
      code: 'BASIC',
      name: 'เงินเดือนฐาน',
      type: 'earning',
      calcMethod: 'formula',
      formula: 'Salary',
      isTaxable: true,
      isSSOBase: true,
      sortOrder: 1,
    },
    {
      code: 'OT_PAY',
      name: 'ค่าล่วงเวลา',
      type: 'earning',
      calcMethod: 'formula',
      formula: '(Salary / 30 / 8) * OTHours * 1.5',
      isTaxable: true,
      isSSOBase: false,
      sortOrder: 2,
    },
    {
      code: 'BONUS',
      name: 'โบนัส',
      type: 'earning',
      calcMethod: 'formula',
      formula: '0',
      isTaxable: true,
      isSSOBase: false,
      sortOrder: 3,
    },
    {
      code: 'SSO',
      name: 'ประกันสังคม',
      type: 'deduction',
      calcMethod: 'formula',
      formula: 'MIN(BASIC * 0.05, 750)',
      isTaxable: false,
      isSSOBase: false,
      sortOrder: 4,
    },
    {
      code: 'PVF',
      name: 'กองทุนสำรองเลี้ยงชีพ',
      type: 'deduction',
      calcMethod: 'formula',
      formula: 'BASIC * 0.05',
      isTaxable: false,
      isSSOBase: false,
      sortOrder: 4.5,
    },
    {
      code: 'TAX',
      name: 'ภาษีหัก ณ ที่จ่าย',
      type: 'deduction',
      calcMethod: 'function',
      functionName: 'calculateThaiTax',
      isTaxable: false,
      isSSOBase: false,
      sortOrder: 5,
    },
    {
      code: 'LATE_DED',
      name: 'หักมาสาย',
      type: 'deduction',
      calcMethod: 'formula',
      formula: '(Salary / 30 / 8 / 60) * LateMinutes',
      isTaxable: false,
      isSSOBase: false,
      sortOrder: 6,
    },
    {
      code: 'LOAN_DED',
      name: 'หักเงินกู้',
      type: 'deduction',
      calcMethod: 'formula',
      formula: 'LoanDeduction',
      isTaxable: false,
      isSSOBase: false,
      sortOrder: 7,
    },
  ];

  for (const comp of components) {
    await prisma.payrollComponent.upsert({
      where: { code: comp.code },
      update: { ...comp },
      create: { ...comp },
    });
    console.log(`  → Upserted component: ${comp.code} (${comp.name})`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
