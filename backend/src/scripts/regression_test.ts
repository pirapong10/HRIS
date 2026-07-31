import { runPayrollEngine } from '../utils/payrollEngine';

async function test() {
  const baseVariables = {
    Salary: 30000,
    OTHours: 10,
    LateMinutes: 0,
    LoanDeduction: 0
  };

  const result = await runPayrollEngine(baseVariables);
  console.log("=== Payroll Regression Test ===");
  console.log(`Gross: ${result.gross}`);
  console.log(`SSO: ${result.computed.SSO}`);
  console.log(`TAX: ${result.computed.TAX}`);
  console.log(`Net: ${result.net}`);
}
test();
