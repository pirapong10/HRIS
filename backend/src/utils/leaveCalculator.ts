import { prisma } from '../prisma';

export class LeaveBalanceCalculator {
  static getDaysInYear(year: number): number {
    return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
  }

  static getProRataDays(hireDate: Date, targetYear: number, entitledDays: number): number {
    // Ensure accurate UTC boundaries
    const startOfYear = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));
    
    // Normalize hireDate to UTC midnight if not already
    const normalizedHireDate = new Date(Date.UTC(hireDate.getUTCFullYear(), hireDate.getUTCMonth(), hireDate.getUTCDate()));

    // If hired before this year, they get full entitlement
    if (normalizedHireDate < startOfYear) {
      return entitledDays;
    }

    // If hired after this year, they get 0
    if (normalizedHireDate > endOfYear) {
      return 0;
    }

    // Hired during the year, prorate based on days worked
    const daysInYear = this.getDaysInYear(targetYear);
    // Add 1 to inclusive days worked
    const msWorked = endOfYear.getTime() - normalizedHireDate.getTime();
    const daysWorked = Math.ceil(msWorked / (1000 * 60 * 60 * 24));
    
    const prorated = (daysWorked / daysInYear) * entitledDays;
    
    // Round to nearest half day
    return Math.round(prorated * 2) / 2;
  }

  static async calculateEntitlement(employeeId: number, leaveType: string, targetYear: number): Promise<number> {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });
    if (!employee || !employee.hireDate) return 0;
    
    const policy = await prisma.leavePolicy.findUnique({
      where: { leaveType },
      include: { entitlementRules: { orderBy: { minYearsOfService: 'asc' } } }
    });
    if (!policy) return 0;

    const hireDate = new Date(employee.hireDate);
    const now = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));
    
    // Exact leap-year aware difference might be complex, but for rules, usually 365.25 is acceptable or precise date diff.
    const msInYear = 1000 * 60 * 60 * 24 * 365.25;
    const yearsOfService = (now.getTime() - hireDate.getTime()) / msInYear;

    const applicableRule = policy.entitlementRules.find(r => {
      const max = r.maxYearsOfService ?? Infinity;
      return yearsOfService >= r.minYearsOfService && yearsOfService < max;
    });

    if (!applicableRule) return 0;

    if (policy.proRata) {
      return this.getProRataDays(hireDate, targetYear, applicableRule.entitledDays);
    }
    
    return applicableRule.entitledDays;
  }
}
