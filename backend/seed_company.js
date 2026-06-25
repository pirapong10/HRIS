/**
 * seed_company.js
 * ─────────────────────────────────────────────────────────────────
 * Full reset + seed for PS Trading org structure:
 *
 * PS (Company)
 *   └─ Product (Division)
 *         ├─ Product Management (Team)
 *         └─ Engineering (Department)
 *               ├─ Design (Team)
 *               └─ QA (Team)
 *   └─ Sales & Business (Division)
 *         ├─ Sales (Team)
 *         └─ Business Analysis (Team)
 *   └─ Support (Division)
 *         ├─ HR (Department)
 *         └─ IT Support (Department)
 * ─────────────────────────────────────────────────────────────────
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Clearing existing data...');

  // Delete in dependency order
  await prisma.payrollRunDetail.deleteMany();
  await prisma.oT.deleteMany();
  await prisma.leave.deleteMany();
  await prisma.attendanceCorrection.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.onboardingTask.deleteMany();
  await prisma.empHistory.deleteMany();
  await prisma.empDoc.deleteMany();
  await prisma.shiftSwap.deleteMany();
  await prisma.approvalLog.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.headcountRequest.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();

  // Unlink dept heads before deleting departments
  await prisma.department.updateMany({ data: { headId: null } });
  // Unlink employee dept/pos/shift before deleting
  await prisma.employee.updateMany({ data: { deptId: null, posId: null, shiftId: null } });
  await prisma.user.updateMany({ data: { empId: null } });

  await prisma.user.deleteMany({ where: { role: { not: 'admin' } } });
  await prisma.employee.deleteMany();
  await prisma.position.deleteMany();
  await prisma.department.deleteMany();
  await prisma.costCenter.deleteMany();

  console.log('✅ Data cleared.\n');

  // ──────────────────────────────────────────────
  // 1. SHIFTS (required for employees)
  // ──────────────────────────────────────────────
  console.log('⏰ Seeding Shifts...');
  const shift = await prisma.shift.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Office Hours',
      startTime: '09:00',
      endTime: '18:00',
      breakMins: 60,
      days: 'Mon,Tue,Wed,Thu,Fri',
      otRate: 1.5,
      otRateHoliday: 3.0,
      color: '#6366f1',
    }
  });
  console.log('  ✔ Shift:', shift.name);

  // ──────────────────────────────────────────────
  // 2. DEPARTMENTS (hierarchy)
  // ──────────────────────────────────────────────
  console.log('\n🏢 Seeding Departments...');

  // Level 1: Company
  const company = await prisma.department.create({
    data: { code: 'PS', name: 'PS Trading', type: 'Company', description: 'บริษัท PS Trading' }
  });

  // Level 2: Divisions
  const divProduct = await prisma.department.create({
    data: { code: 'DIV-PROD', name: 'Product', type: 'Division', parentId: company.id, description: 'สายงาน Product & Engineering' }
  });
  const divSales = await prisma.department.create({
    data: { code: 'DIV-SALES', name: 'Sales & Business', type: 'Division', parentId: company.id, description: 'สายงาน Sales และ Business' }
  });
  const divSupport = await prisma.department.create({
    data: { code: 'DIV-SUP', name: 'Support', type: 'Division', parentId: company.id, description: 'สายงาน HR & IT Support' }
  });

  // Level 3: Departments under Product
  const deptPM = await prisma.department.create({
    data: { code: 'DEPT-PM', name: 'Product Management', type: 'Team', parentId: divProduct.id, description: 'Product Owner / Product Manager' }
  });
  const deptEng = await prisma.department.create({
    data: { code: 'DEPT-ENG', name: 'Engineering', type: 'Department', parentId: divProduct.id, description: 'ทีม Software Development' }
  });

  // Level 4: Teams under Engineering
  const teamDesign = await prisma.department.create({
    data: { code: 'TEAM-UX', name: 'Design & UX', type: 'Team', parentId: deptEng.id, description: 'UI/UX Designer' }
  });
  const teamQA = await prisma.department.create({
    data: { code: 'TEAM-QA', name: 'QA & Testing', type: 'Team', parentId: deptEng.id, description: 'Quality Assurance' }
  });

  // Level 3: Teams under Sales
  const teamSales = await prisma.department.create({
    data: { code: 'TEAM-SALES', name: 'Sales', type: 'Team', parentId: divSales.id, description: 'Sales Representatives' }
  });
  const teamBA = await prisma.department.create({
    data: { code: 'TEAM-BA', name: 'Business Analysis', type: 'Team', parentId: divSales.id, description: 'Business Analysts' }
  });

  // Level 3: Departments under Support
  const deptHR = await prisma.department.create({
    data: { code: 'DEPT-HR', name: 'Human Resources', type: 'Department', parentId: divSupport.id, description: 'HR & Admin' }
  });
  const deptIT = await prisma.department.create({
    data: { code: 'DEPT-IT', name: 'IT Support', type: 'Department', parentId: divSupport.id, description: 'IT Infrastructure & Support' }
  });

  console.log('  ✔ Departments created:', 10);

  // ──────────────────────────────────────────────
  // 3. POSITIONS
  // ──────────────────────────────────────────────
  console.log('\n💼 Seeding Positions...');

  const positions = await Promise.all([
    // Product
    prisma.position.create({ data: { code: 'POS-PO', name: 'Product Owner / PM', deptId: deptPM.id, level: 'Senior', grade: 'M4', salary: 80000, salaryMin: 70000, salaryMax: 120000, approvedHeadcount: 1 } }),
    // Engineering
    prisma.position.create({ data: { code: 'POS-LEAD', name: 'Lead Developer', deptId: deptEng.id, level: 'Lead', grade: 'M3', salary: 75000, salaryMin: 65000, salaryMax: 110000, approvedHeadcount: 1 } }),
    prisma.position.create({ data: { code: 'POS-FS', name: 'Fullstack Developer', deptId: deptEng.id, level: 'Mid', grade: 'E2', salary: 55000, salaryMin: 40000, salaryMax: 80000, approvedHeadcount: 2 } }),
    prisma.position.create({ data: { code: 'POS-BE', name: 'Backend Developer', deptId: deptEng.id, level: 'Mid', grade: 'E2', salary: 55000, salaryMin: 40000, salaryMax: 80000, approvedHeadcount: 1 } }),
    // Design
    prisma.position.create({ data: { code: 'POS-UX', name: 'UI/UX Designer', deptId: teamDesign.id, level: 'Mid', grade: 'D2', salary: 50000, salaryMin: 35000, salaryMax: 70000, approvedHeadcount: 1 } }),
    // QA
    prisma.position.create({ data: { code: 'POS-QA', name: 'QA Engineer', deptId: teamQA.id, level: 'Junior', grade: 'E1', salary: 40000, salaryMin: 28000, salaryMax: 55000, approvedHeadcount: 1 } }),
    // Sales
    prisma.position.create({ data: { code: 'POS-HOS', name: 'Head of Sales', deptId: teamSales.id, level: 'Senior', grade: 'M3', salary: 75000, salaryMin: 60000, salaryMax: 100000, approvedHeadcount: 1 } }),
    prisma.position.create({ data: { code: 'POS-SR', name: 'Sales Representative', deptId: teamSales.id, level: 'Junior', grade: 'S1', salary: 30000, salaryMin: 20000, salaryMax: 45000, approvedHeadcount: 3 } }),
    // BA
    prisma.position.create({ data: { code: 'POS-BA', name: 'Business Analyst', deptId: teamBA.id, level: 'Mid', grade: 'B2', salary: 55000, salaryMin: 40000, salaryMax: 75000, approvedHeadcount: 1 } }),
    // HR
    prisma.position.create({ data: { code: 'POS-HR', name: 'HR Officer', deptId: deptHR.id, level: 'Mid', grade: 'H2', salary: 40000, salaryMin: 30000, salaryMax: 55000, approvedHeadcount: 1 } }),
    // IT
    prisma.position.create({ data: { code: 'POS-IT', name: 'IT Support Engineer', deptId: deptIT.id, level: 'Junior', grade: 'I1', salary: 38000, salaryMin: 28000, salaryMax: 52000, approvedHeadcount: 1 } }),
  ]);

  const [posPO, posLead, posFS, posBE, posUX, posQA, posHOS, posSR, posBA, posHR, posIT] = positions;
  console.log('  ✔ Positions created:', positions.length);

  // ──────────────────────────────────────────────
  // 4. EMPLOYEES
  // ──────────────────────────────────────────────
  console.log('\n👤 Seeding Employees...');

  const emps = await Promise.all([
    // Product Owner
    prisma.employee.create({ data: { empCode: 'EMP001', name: 'ธีรพงศ์ วงศ์ดี', gender: 'male', dob: '1988-03-15', type: 'fulltime', phone: '081-001-0001', email: 'theeraphong@pstrading.co.th', hireDate: '2022-01-10', salary: 85000, bank: 'กรุงเทพ', bankAcc: '123-4-56001-0', deptId: deptPM.id, posId: posPO.id, shiftId: shift.id } }),
    // Lead Dev
    prisma.employee.create({ data: { empCode: 'EMP002', name: 'ชัชชัย มั่นคง', gender: 'male', dob: '1990-07-22', type: 'fulltime', phone: '081-001-0002', email: 'chatchai@pstrading.co.th', hireDate: '2022-03-01', salary: 75000, bank: 'กสิกรไทย', bankAcc: '123-4-56002-0', deptId: deptEng.id, posId: posLead.id, shiftId: shift.id } }),
    // Fullstack Dev 1
    prisma.employee.create({ data: { empCode: 'EMP003', name: 'พิชิต ใจกล้า', gender: 'male', dob: '1994-11-05', type: 'fulltime', phone: '081-001-0003', email: 'pichit@pstrading.co.th', hireDate: '2023-02-15', salary: 58000, bank: 'ไทยพาณิชย์', bankAcc: '123-4-56003-0', deptId: deptEng.id, posId: posFS.id, shiftId: shift.id } }),
    // Fullstack Dev 2
    prisma.employee.create({ data: { empCode: 'EMP004', name: 'นิตยา สว่างใจ', gender: 'female', dob: '1996-04-18', type: 'fulltime', phone: '081-001-0004', email: 'nittaya@pstrading.co.th', hireDate: '2023-06-01', salary: 55000, bank: 'กรุงไทย', bankAcc: '123-4-56004-0', deptId: deptEng.id, posId: posFS.id, shiftId: shift.id } }),
    // Backend Dev
    prisma.employee.create({ data: { empCode: 'EMP005', name: 'วรากร สมบัติ', gender: 'male', dob: '1993-09-30', type: 'fulltime', phone: '081-001-0005', email: 'warakorn@pstrading.co.th', hireDate: '2023-01-20', salary: 58000, bank: 'กรุงเทพ', bankAcc: '123-4-56005-0', deptId: deptEng.id, posId: posBE.id, shiftId: shift.id } }),
    // UI/UX Designer
    prisma.employee.create({ data: { empCode: 'EMP006', name: 'อรอุมา พิมพ์สวย', gender: 'female', dob: '1997-01-12', type: 'fulltime', phone: '081-001-0006', email: 'ornuma@pstrading.co.th', hireDate: '2023-08-01', salary: 50000, bank: 'กสิกรไทย', bankAcc: '123-4-56006-0', deptId: teamDesign.id, posId: posUX.id, shiftId: shift.id } }),
    // QA Tester
    prisma.employee.create({ data: { empCode: 'EMP007', name: 'ภาคิน ทดสอบ', gender: 'male', dob: '1998-06-25', type: 'fulltime', phone: '081-001-0007', email: 'pakin@pstrading.co.th', hireDate: '2024-01-10', salary: 42000, bank: 'ไทยพาณิชย์', bankAcc: '123-4-56007-0', deptId: teamQA.id, posId: posQA.id, shiftId: shift.id } }),
    // Head of Sales
    prisma.employee.create({ data: { empCode: 'EMP008', name: 'สมชาย ปิดทอง', gender: 'male', dob: '1985-12-01', type: 'fulltime', phone: '081-001-0008', email: 'somchai@pstrading.co.th', hireDate: '2022-01-15', salary: 80000, bank: 'กรุงเทพ', bankAcc: '123-4-56008-0', deptId: teamSales.id, posId: posHOS.id, shiftId: shift.id } }),
    // Sales Rep 1
    prisma.employee.create({ data: { empCode: 'EMP009', name: 'มาลี วานิช', gender: 'female', dob: '1999-03-08', type: 'fulltime', phone: '081-001-0009', email: 'malee@pstrading.co.th', hireDate: '2024-03-01', salary: 30000, bank: 'กสิกรไทย', bankAcc: '123-4-56009-0', deptId: teamSales.id, posId: posSR.id, shiftId: shift.id } }),
    // Sales Rep 2
    prisma.employee.create({ data: { empCode: 'EMP010', name: 'ธนกร รักการขาย', gender: 'male', dob: '2000-07-14', type: 'fulltime', phone: '081-001-0010', email: 'tanakorn@pstrading.co.th', hireDate: '2024-05-15', salary: 30000, bank: 'ไทยพาณิชย์', bankAcc: '123-4-56010-0', deptId: teamSales.id, posId: posSR.id, shiftId: shift.id } }),
    // Business Analyst
    prisma.employee.create({ data: { empCode: 'EMP011', name: 'จิตรา วิเคราะห์', gender: 'female', dob: '1993-05-20', type: 'fulltime', phone: '081-001-0011', email: 'jittra@pstrading.co.th', hireDate: '2023-04-01', salary: 58000, bank: 'กรุงไทย', bankAcc: '123-4-56011-0', deptId: teamBA.id, posId: posBA.id, shiftId: shift.id } }),
    // HR Officer
    prisma.employee.create({ data: { empCode: 'EMP012', name: 'ปิยะมาศ บุคลากร', gender: 'female', dob: '1991-08-03', type: 'fulltime', phone: '081-001-0012', email: 'piyamas@pstrading.co.th', hireDate: '2022-07-01', salary: 42000, bank: 'กรุงเทพ', bankAcc: '123-4-56012-0', deptId: deptHR.id, posId: posHR.id, shiftId: shift.id } }),
    // IT Support
    prisma.employee.create({ data: { empCode: 'EMP013', name: 'ณัฐพล ไอทีดี', gender: 'male', dob: '1995-10-11', type: 'fulltime', phone: '081-001-0013', email: 'nuttaphon@pstrading.co.th', hireDate: '2022-09-01', salary: 40000, bank: 'กสิกรไทย', bankAcc: '123-4-56013-0', deptId: deptIT.id, posId: posIT.id, shiftId: shift.id } }),
  ]);

  console.log('  ✔ Employees created:', emps.length);

  // ──────────────────────────────────────────────
  // 5. ASSIGN DEPARTMENT HEADS
  // ──────────────────────────────────────────────
  console.log('\n👑 Assigning Department Heads...');
  const [e_PO, e_Lead, , , , , , e_HOS, , , , e_HR, e_IT] = emps;

  await Promise.all([
    prisma.department.update({ where: { id: divProduct.id }, data: { headId: e_PO.id } }),
    prisma.department.update({ where: { id: deptPM.id }, data: { headId: e_PO.id } }),
    prisma.department.update({ where: { id: deptEng.id }, data: { headId: e_Lead.id } }),
    prisma.department.update({ where: { id: divSales.id }, data: { headId: e_HOS.id } }),
    prisma.department.update({ where: { id: teamSales.id }, data: { headId: e_HOS.id } }),
    prisma.department.update({ where: { id: deptHR.id }, data: { headId: e_HR.id } }),
    prisma.department.update({ where: { id: deptIT.id }, data: { headId: e_IT.id } }),
  ]);
  console.log('  ✔ Heads assigned');

  // ──────────────────────────────────────────────
  // 6. SUMMARY
  // ──────────────────────────────────────────────
  console.log('\n─────────────────────────────────────');
  console.log('🎉 Seed Complete!');
  console.log(`  Departments : 10`);
  console.log(`  Positions   : ${positions.length}`);
  console.log(`  Employees   : ${emps.length}`);
  console.log('─────────────────────────────────────');
  console.log('\nOrg Structure:');
  console.log('  🏢 PS Trading (Company)');
  console.log('    ├─ 🏛️ Product (Division)');
  console.log('        ├─ 👥 Product Management (Team) — ธีรพงศ์ [PO]');
  console.log('        └─ 🗂️ Engineering (Department) — ชัชชัย [Lead Dev]');
  console.log('              ├─ 👥 Design & UX (Team)');
  console.log('              └─ 👥 QA & Testing (Team)');
  console.log('    ├─ 🏛️ Sales & Business (Division) — สมชาย [HoS]');
  console.log('        ├─ 👥 Sales (Team)');
  console.log('        └─ 👥 Business Analysis (Team)');
  console.log('    └─ 🏛️ Support (Division)');
  console.log('        ├─ 🗂️ Human Resources (Department)');
  console.log('        └─ 🗂️ IT Support (Department)');
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
