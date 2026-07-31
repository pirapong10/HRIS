import { PAYROLL_FUNCTIONS } from './src/utils/payrollFunctions';

function test() {
  const taxableIncome = 300000;
  // Note: calculateThaiTax expects monthly TaxableIncome and annualizes it.
  // To test taxable = 300000 annually AFTER deductions, we need to pass a monthly TaxableIncome
  // that results in 300000 annual taxable.
  // Taxable = (monthly * 12) - 100000 - 60000
  // 300000 = (monthly * 12) - 160000
  // 460000 = monthly * 12
  // monthly = 460000 / 12 = 38333.333333333336
  const monthly = 460000 / 12;

  const resultMonthly = PAYROLL_FUNCTIONS.calculateThaiTax({ TaxableIncome: monthly });
  
  console.log(`Manual Verification for Annual Taxable = 300,000`);
  console.log(`Monthly WHT Output: ${resultMonthly}`);
  console.log(`Annualized Tax: ${resultMonthly * 12}`);
  console.log(`Expected Annual Tax: 7500`);
}

test();
