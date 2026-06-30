// Payroll Functions Registry
// Port of calcThaiTax from utils/payroll.ts — exact bracket boundaries preserved.
// Do NOT delete the original calcThaiTax from utils/payroll.ts until Sprint 3.

type PayrollFunction = (vars: Record<string, number>) => number;

const TAX_BRACKETS = [
  { min: 0,       max: 150000,   rate: 0 },
  { min: 150000,  max: 300000,   rate: 0.05 },
  { min: 300000,  max: 500000,   rate: 0.10 },
  { min: 500000,  max: 750000,   rate: 0.15 },
  { min: 750000,  max: 1000000,  rate: 0.20 },
  { min: 1000000, max: 2000000,  rate: 0.25 },
  { min: 2000000, max: 5000000,  rate: 0.30 },
  { min: 5000000, max: Infinity, rate: 0.35 },
];

/**
 * Calculate Thai personal income tax (monthly withholding).
 *
 * Input vars:
 *   vars.TaxableIncome — monthly taxable gross (sum of taxable earning components)
 *   vars.SSO — monthly SSO deduction (if any)
 *   vars.PVF — monthly PVF deduction (if any)
 *
 * Logic (mirrors calcThaiTax in utils/payroll.ts):
 *   1. Annualise: annualGross = TaxableIncome * 12
 *   2. Apply expense deduction: min(annualGross * 0.5, 100,000)
 *   3. Apply personal deduction: 60,000
 *   4. Deduct annual SSO & PVF
 *   5. Apply progressive brackets
 *   6. Divide annual tax by 12 → return monthly WHT (rounded)
 */
function calculateThaiTax(vars: Record<string, number>): number {
  const monthly = vars.TaxableIncome || 0;
  const annualGross = monthly * 12;
  const deductExpense = Math.min(annualGross * 0.5, 100000);
  const deductPersonal = 60000;
  
  const annualSso = (vars.SSO || 0) * 12;
  const annualPvf = (vars.PVF || 0) * 12;
  
  const taxable = Math.max(0, annualGross - deductExpense - deductPersonal - annualSso - annualPvf);

  let annualTax = 0;
  for (const b of TAX_BRACKETS) {
    if (taxable <= b.min) break;
    const portion = Math.min(taxable, b.max) - b.min;
    annualTax += portion * b.rate;
  }

  return Math.round(annualTax / 12); // Monthly WHT
}

export const PAYROLL_FUNCTIONS: Record<string, PayrollFunction> = {
  calculateThaiTax,
};
