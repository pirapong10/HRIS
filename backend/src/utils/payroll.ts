// Thai progressive tax brackets (annual)
export const TAX_BRACKETS = [
  { min: 0,       max: 150000,   rate: 0 },
  { min: 150000,  max: 300000,   rate: 0.05 },
  { min: 300000,  max: 500000,   rate: 0.10 },
  { min: 500000,  max: 750000,   rate: 0.15 },
  { min: 750000,  max: 1000000,  rate: 0.20 },
  { min: 1000000, max: 2000000,  rate: 0.25 },
  { min: 2000000, max: 5000000,  rate: 0.30 },
  { min: 5000000, max: Infinity, rate: 0.35 },
];

export function calcThaiTax(annualIncome: number, annualSso: number = 0, annualPvf: number = 0): number {
  const deductExpense = Math.min(annualIncome * 0.5, 100000);
  const deductPersonal = 60000;
  const taxable = Math.max(0, annualIncome - deductExpense - deductPersonal - annualSso - annualPvf);
  let tax = 0;
  for (const b of TAX_BRACKETS) {
    if (taxable <= b.min) break;
    const portion = Math.min(taxable, b.max) - b.min;
    tax += portion * b.rate;
  }
  return Math.round(tax);
}

export function calcOTPay(emp: any, otHours: number, isHoliday = false, shift: any, settings: any = null): number {
  // Divisor is 30 for monthly employees as per Labor Protection Act Section 68
  const dailyRate = emp.salary / 30;
  const hourlyRate = dailyRate / 8;
  const weekdayRate = settings?.otRate ? parseFloat(settings.otRate) : (shift?.otRate || 1.5);
  const rate = isHoliday ? (shift?.otRateHoliday || 3.0) : weekdayRate;
  return Math.round(hourlyRate * rate * otHours);
}

export function calcSso(salary: number, settings: any = null): { sso: number, employerSso: number } {
  const ssoBaseCap = settings?.ssoBaseCap ? parseFloat(settings.ssoBaseCap) : 17500;
  const ssoRate = settings?.ssoRate ? parseFloat(settings.ssoRate) / 100 : 0.05;
  const maxSso = Math.round(ssoBaseCap * ssoRate);
  
  const ssoBase = Math.min(salary, ssoBaseCap);
  const sso = Math.min(Math.round(ssoBase * ssoRate), maxSso);
  const employerSso = sso; // Employer matches employee contribution
  
  return { sso, employerSso };
}
