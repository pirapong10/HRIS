const { runPayrollEngine } = require('./src/utils/payrollEngine');

async function test() {
  const result = await runPayrollEngine({
    Salary: 30000,
    OTHours: 10,
    LateMinutes: 0,
    LoanDeduction: 0
  }, 1); // 1 is fulltime (assuming ID 1 is fulltime)
  
  console.log(`SSO: ${result.computed.SSO}, TAX: ${result.computed.TAX}`);
}

test().catch(console.error).finally(() => process.exit(0));
