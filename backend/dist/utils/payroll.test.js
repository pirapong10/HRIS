"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const payroll_1 = require("./payroll");
(0, globals_1.describe)('Payroll Calculation Utilities', () => {
    (0, globals_1.describe)('calcThaiTax', () => {
        (0, globals_1.it)('should return 0 tax for income <= 150k after deductions', () => {
            // Annual income 200k, expenses 100k (50%), personal 60k -> Net = 40k -> Tax 0
            (0, globals_1.expect)((0, payroll_1.calcThaiTax)(200000)).toBe(0);
        });
        (0, globals_1.it)('should correctly apply progressive brackets (basic)', () => {
            // Income = 400,000. Expenses = 100,000. Personal = 60,000.
            // Taxable = 400k - 160k = 240,000.
            // Bracket 0-150k: 0
            // Bracket 150k-300k: (240k - 150k) * 0.05 = 90,000 * 0.05 = 4,500
            (0, globals_1.expect)((0, payroll_1.calcThaiTax)(400000)).toBe(4500);
        });
        (0, globals_1.it)('should deduct SSO and PVF correctly', () => {
            // Income = 400,000. SSO = 10,500. PVF = 20,000.
            // Taxable = 400k - 100k(exp) - 60k(pers) - 10.5k(sso) - 20k(pvf) = 209,500.
            // Bracket 0-150k: 0
            // Bracket 150k-300k: (209,500 - 150,000) * 0.05 = 59,500 * 0.05 = 2,975
            (0, globals_1.expect)((0, payroll_1.calcThaiTax)(400000, 10500, 20000)).toBe(2975);
        });
    });
    (0, globals_1.describe)('calcOTPay', () => {
        (0, globals_1.it)('should use 30 days divisor for monthly employee', () => {
            // Salary 30,000. Daily = 1,000. Hourly = 125.
            // OT 2 hours at 1.5x (weekday)
            // Pay = 125 * 1.5 * 2 = 375.
            const emp = { salary: 30000 };
            const shift = { otRate: 1.5 };
            (0, globals_1.expect)((0, payroll_1.calcOTPay)(emp, 2, false, shift)).toBe(375);
        });
        (0, globals_1.it)('should apply holiday rates', () => {
            // Salary 30,000. Hourly = 125.
            // OT 2 hours at 3.0x (holiday)
            // Pay = 125 * 3.0 * 2 = 750.
            const emp = { salary: 30000 };
            const shift = { otRateHoliday: 3.0 };
            (0, globals_1.expect)((0, payroll_1.calcOTPay)(emp, 2, true, shift)).toBe(750);
        });
    });
    (0, globals_1.describe)('calcSso', () => {
        (0, globals_1.it)('should calculate 5% up to 15,000 cap by default if not 17.5k', () => {
            // Using standard 17500 cap
            const res = (0, payroll_1.calcSso)(20000);
            (0, globals_1.expect)(res.sso).toBe(875);
            (0, globals_1.expect)(res.employerSso).toBe(875);
        });
        (0, globals_1.it)('should calculate exactly 5% for salaries below cap', () => {
            const res = (0, payroll_1.calcSso)(10000);
            (0, globals_1.expect)(res.sso).toBe(500);
            (0, globals_1.expect)(res.employerSso).toBe(500);
        });
    });
});
