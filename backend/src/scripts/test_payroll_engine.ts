import { runPayrollEngine } from '../utils/payrollEngine';
import { calcThaiTax } from '../utils/payroll'; // OLD function

async function runTest() {
  const baseVariables = { Salary: 30000, OTHours: 10, LateMinutes: 0 };
  console.log('Testing Payroll Engine with baseVariables:', baseVariables);
  
  try {
    const engineOutput = await runPayrollEngine(baseVariables);
    console.log('\n--- NEW ENGINE OUTPUT ---');
    console.log('Gross:', engineOutput.gross);
    console.log('Deductions:', engineOutput.deductions);
    console.log('Net:', engineOutput.net);
    console.log('\nComputed values:', engineOutput.computed);
    console.log('\nResults array:', engineOutput.results);

    // Old calcThaiTax expects annual income, sso, pvf
    const sso = engineOutput.computed['SSO'] || 0;
    const oldTaxResult = calcThaiTax(baseVariables.Salary * 12, sso * 12, 0) / 12;

    console.log('\n--- TAX COMPARISON ---');
    console.log('New Engine (calculateThaiTax):', engineOutput.computed['TAX']);
    console.log('Old Function (calcThaiTax):', oldTaxResult);
  } catch (err) {
    console.error('Error running payroll engine:', err);
  }
}

runTest();
