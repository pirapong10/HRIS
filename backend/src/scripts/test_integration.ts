import { prisma } from '../prisma';

async function testIntegration() {
  try {
    // 1. Setup employee
    let emp = await prisma.employee.findFirst({ where: { status: 'active' } });
    if (!emp) throw new Error('No active employee found');
    
    await prisma.employee.update({
      where: { id: emp.id },
      data: { salary: 30000 }
    });

    // 2. Setup OT
    await prisma.oT.deleteMany({ where: { empId: emp.id, date: { startsWith: '2026-02' } } });
    await prisma.oT.create({
      data: {
        empId: emp.id,
        date: '2026-02-15',
        requestedHours: 10,
        status: 'approved'
      }
    });

    // 3. Setup Loan
    await prisma.employeeLoan.deleteMany({ where: { empId: emp.id } });
    await prisma.employeeLoan.create({
      data: {
        empId: emp.id,
        amount: 10000,
        monthlyDeduct: 2000,
        remainingBal: 2000,
        startDate: new Date(),
        status: 'active'
      }
    });

    // 4. Run API Request (assume admin login)
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@company.com', password: 'admin123' })
    });
    const { token } = await loginRes.json();
    
    console.log('\n--- EmployeeLoan BEFORE Run ---');
    let loanBefore = await prisma.employeeLoan.findFirst({ where: { empId: emp.id } });
    console.log(`RemainingBal: ${loanBefore?.remainingBal}, Status: ${loanBefore?.status}`);

    console.log('\n--- Running Payroll for 2026-02 ---');
    const runRes = await fetch('http://localhost:3000/api/payroll/run', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ period: '2026-02' })
    });
    console.log(`Status: ${runRes.status}`);

    console.log('\n--- EmployeeLoan AFTER Run ---');
    let loanAfter = await prisma.employeeLoan.findFirst({ where: { empId: emp.id } });
    console.log(`RemainingBal: ${loanAfter?.remainingBal}, Status: ${loanAfter?.status}`);

    // 5. Query Results
    const runDetail = await prisma.payrollRunDetail.findFirst({
      where: { empId: emp.id, payrollRun: { period: '2026-02' } }
    });
    
    if (!runDetail) {
        console.log("No detail found!");
        return;
    }
    
    console.log('\n--- PayrollRunDetail ---');
    console.log(`Gross: ${runDetail.gross}, Net: ${runDetail.net}`);
    console.log(`OTPay: ${runDetail.otPay}, Tax: ${runDetail.tax}, SSO: ${runDetail.sso}, PVF: ${runDetail.providentFund}, LOAN: ${runDetail.loan}`);
    console.log(`PaidDate: ${runDetail.paidDate}`);

    console.log('\n--- PayrollComponentResult Breakdown ---');
    const results = await prisma.payrollComponentResult.findMany({
      where: { payrollDetailId: runDetail.id },
      include: { component: true },
      orderBy: { component: { sortOrder: 'asc' } }
    });
    
    results.forEach(r => {
      console.log(`${r.component.code} (${r.component.name}): ${r.amount} [Formula: ${r.formulaUsed}]`);
    });

    // 6. Test DENIED scope
    console.log('\n--- Testing DENIED scope (Employee without Payroll scope) ---');
    const poLogin = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'emp@company.com', password: 'emp123' }) // Using emp@company.com from DB
    });
    const poData = await poLogin.json();
    if (poData.token) {
        const poRun = await fetch('http://localhost:3000/api/payroll/run', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${poData.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ period: '2026-02' })
        });
        console.log(`Status: ${poRun.status}`);
        const poResult = await poRun.json();
        console.log(poResult);
    } else {
        console.log("Could not log in as officer.");
    }
    
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

testIntegration();
