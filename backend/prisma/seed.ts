import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data...');

  // Clean up existing data to prevent duplicates on re-seed
  await prisma.headcountRequest.deleteMany({});
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

  // 6. Users & Roles Setup (Blueprint §4.2)
  const defaultHash = await bcrypt.hash('admin1234', 10);

  // Define 66 Permissions (11 modules * 6 actions)
  const modules = ['employee', 'attendance', 'leave', 'organization', 'reports', 'dashboard', 'payroll', 'shift', 'ot', 'settings', 'headcount'];
  const actions = ['view', 'create', 'edit', 'delete', 'approve', 'export'];
  const permIds: Record<string, number> = {};
  for (const m of modules) {
    for (const a of actions) {
      const code = `${m}:${a}`;
      const perm = await prisma.permission.upsert({
        where: { code },
        update: {},
        create: { code, module: m, action: a, description: `${a} ${m}` }
      });
      permIds[code] = perm.id;
    }
  }

  // Define 8 Roles
  const rolesDef = [
    { code: 'SUPER_ADMIN', name: 'Super Administrator', level: 100,
      perms: Object.keys(permIds) }, // All 66
    { code: 'SYSTEM_ADMIN', name: 'System Administrator', level: 90,
      perms: Object.keys(permIds).filter(p => !p.startsWith('payroll:')) },
    { code: 'HR_DIRECTOR', name: 'HR Director', level: 80,
      perms: Object.keys(permIds).filter(p => p.startsWith('employee:') || p.startsWith('attendance:') || p.startsWith('leave:') || p.startsWith('organization:') || ['reports:view', 'reports:export', 'dashboard:view'].includes(p)) },
    { code: 'HR_MANAGER', name: 'HR Manager', level: 60,
      perms: ['employee:view', 'employee:edit', 'attendance:view', 'attendance:edit', 'leave:view', 'leave:approve', 'dashboard:view', 'shift:view', 'shift:edit', 'shift:approve', 'ot:view', 'ot:approve'] },
    { code: 'PAYROLL_MANAGER', name: 'Payroll Manager', level: 65,
      perms: [...Object.keys(permIds).filter(p => p.startsWith('payroll:') || p.startsWith('reports:')), 'employee:view'] },
    { code: 'PAYROLL_OFFICER', name: 'Payroll Officer', level: 55,
      perms: ['payroll:view', 'payroll:create', 'payroll:export', 'employee:view'] },
    { code: 'DEPT_MANAGER', name: 'Department Manager', level: 50,
      perms: ['employee:view', 'attendance:view', 'leave:view', 'leave:approve', 'shift:view', 'shift:approve', 'ot:view', 'ot:approve', 'dashboard:view'] },
    { code: 'EMPLOYEE', name: 'Employee', level: 10,
      perms: ['employee:view', 'attendance:view', 'attendance:create', 'leave:view', 'leave:create', 'ot:view', 'ot:create', 'payroll:view', 'dashboard:view'] }
  ];

  for (const r of rolesDef) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: { level: r.level, name: r.name },
      create: { code: r.code, name: r.name, level: r.level, description: r.name }
    });
    // Assign permissions
    for (const p of r.perms) {
      if (permIds[p]) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permIds[p] } },
          update: {},
          create: { roleId: role.id, permissionId: permIds[p] }
        });
      }
    }
    
    // Create test user and employee for this role
    const emailPrefix = r.code.toLowerCase();
    const email = `${emailPrefix}@company.com`;
    
    // Create an employee if not exists
    let testEmp = await prisma.employee.findFirst({ where: { email } });
    if (!testEmp) {
      testEmp = await prisma.employee.create({
        data: {
          empCode: `E-${r.code}`, name: `Test ${r.name}`, deptId: dept1.id, posId: pos1.id, type: 'fulltime', hireDate: '2023-01-01', dob: '1990-01-01', gender: 'male', salary: 30000, email: email, shiftId: shift1.id
        }
      });
    }

    // Create user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email, password: defaultHash, empId: testEmp.id }
      });
    } else {
      await prisma.user.update({ where: { email }, data: { password: defaultHash, empId: testEmp.id } });
    }

    // Assign role to user
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id }
    });
  }

  // 6.5. Create immutable Bootstrap Superadmin
  const adminHash = await bcrypt.hash('Admin@123!', 10);
  const bootstrapAdminEmail = 'admin@company.com';
  
  let bootstrapEmp = await prisma.employee.findFirst({ where: { email: bootstrapAdminEmail } });
  if (!bootstrapEmp) {
    bootstrapEmp = await prisma.employee.create({
      data: {
        empCode: `EMP-ADMIN`, name: `Bootstrap Admin`, deptId: dept1.id, posId: pos1.id, type: 'fulltime', hireDate: '2023-01-01', dob: '1990-01-01', gender: 'male', salary: 100000, email: bootstrapAdminEmail, shiftId: shift1.id
      }
    });
  }
  
  const superAdminRole = await prisma.role.findUnique({ where: { code: 'SUPER_ADMIN' } });

  const bootstrapUser = await prisma.user.upsert({
    where: { email: bootstrapAdminEmail },
    update: { password: adminHash, empId: bootstrapEmp.id, isActive: true },
    create: { email: bootstrapAdminEmail, password: adminHash, empId: bootstrapEmp.id, isActive: true }
  });

  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: bootstrapUser.id, roleId: superAdminRole.id } },
      update: {},
      create: { userId: bootstrapUser.id, roleId: superAdminRole.id }
    });
  }

  console.log('Seeding completed! You can log in with:');
  console.log('Password for all test users: admin1234');
  for (const r of rolesDef) {
    console.log(`- ${r.name.padEnd(20)}: ${r.code.toLowerCase()}@company.com`);
  }

  // Seed default payroll components (idempotent via upsert)
  await upsertPayrollComponents();
  console.log('✅ Default payroll components seeded.');
  await upsertEmployeeTypes();
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

async function upsertEmployeeTypes() {
  const types = [
    {
      code: 'fulltime', name: 'พนักงานประจำ', color: '#3B82F6', sortOrder: 1,
      ssoEnabled: true, ssoRate: 0.05, ssoCap: 750, ssoEmployerRate: 0.05,
      taxMethod: 'progressive', taxFlatRate: null,
      otEligible: true, leaveEligible: true, annualLeave: 6, includeInPayroll: true
    },
    {
      code: 'parttime', name: 'พาร์ทไทม์', color: '#8B5CF6', sortOrder: 2,
      ssoEnabled: true, ssoRate: 0.05, ssoCap: 750, ssoEmployerRate: 0.05,
      taxMethod: 'progressive', taxFlatRate: null,
      otEligible: true, leaveEligible: false, annualLeave: 0, includeInPayroll: true
    },
    {
      code: 'contract', name: 'สัญญาจ้าง (Contractor)', color: '#F59E0B', sortOrder: 3,
      ssoEnabled: false, ssoRate: 0, ssoCap: 0, ssoEmployerRate: 0,
      taxMethod: 'wht', taxFlatRate: 0.03,
      otEligible: false, leaveEligible: false, annualLeave: 0, includeInPayroll: true
    },
    {
      code: 'intern', name: 'นักศึกษาฝึกงาน', color: '#10B981', sortOrder: 4,
      ssoEnabled: false, ssoRate: 0, ssoCap: 0, ssoEmployerRate: 0,
      taxMethod: 'exempt', taxFlatRate: null,
      otEligible: false, leaveEligible: false, annualLeave: 0, includeInPayroll: false
    },
  ];

  for (const t of types) {
    await prisma.employeeType.upsert({
      where: { code: t.code },
      update: t,
      create: t,
    });
  }
  console.log('✅ EmployeeType seeded');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
