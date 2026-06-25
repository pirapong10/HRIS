"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPayroll = exports.runPayroll = void 0;
const prisma_1 = require("../prisma");
const scopeFilter_1 = require("../utils/scopeFilter");
const payroll_1 = require("../utils/payroll");
const runPayroll = async (req, res) => {
    try {
        const { period } = req.body;
        if (!period)
            return res.status(400).json({ message: 'Period is required (YYYY-MM)' });
        // 1. Enforce PayrollScope
        const scopeWhere = req.user ? await (0, scopeFilter_1.buildPayrollWhereClause)(req.user) : {};
        // 2. Fetch employees under scope
        const employees = await prisma_1.prisma.employee.findMany({
            where: scopeWhere.employee || {},
            include: {
                shift: true,
                department: true,
                position: true
            }
        });
        if (employees.length === 0) {
            return res.status(404).json({ message: 'No employees found in your scope' });
        }
        const monthStr = period.split("-")[1];
        const currentMonthNum = monthStr ? parseInt(monthStr) : new Date().getMonth() + 1;
        const pastMonths = currentMonthNum - 1;
        const remainingMonths = 12 - currentMonthNum;
        // Temporary settings (should come from DB)
        const settings = { ssoBaseCap: 17500, ssoRate: 5 };
        // Create or find PayrollRun
        const payrollRun = await prisma_1.prisma.payrollRun.upsert({
            where: { period },
            update: {},
            create: { period, status: 'draft' }
        });
        // Clean up old details for this run to re-calculate
        await prisma_1.prisma.payrollRunDetail.deleteMany({
            where: { payrollRunId: payrollRun.id }
        });
        const payrollResults = [];
        for (const emp of employees) {
            // Find OT hours from attendance (mock or fetch from DB)
            // Fetch OT from OT model
            const ots = await prisma_1.prisma.oT.findMany({
                where: {
                    empId: emp.id,
                    date: { startsWith: period },
                    status: 'approved'
                }
            });
            const otHours = ots.reduce((sum, o) => sum + o.requestedHours, 0);
            const currentMonthGross = emp.salary + (0, payroll_1.calcOTPay)(emp, otHours, false, emp.shift, settings);
            const { sso, employerSso } = (0, payroll_1.calcSso)(emp.salary, settings);
            const providentFund = Math.round(emp.salary * 0.05);
            const loan = emp.id === 1 ? 1500 : 0; // Mock loan
            const pastYtdIncome = emp.salary * pastMonths;
            const projectedAnnualIncome = pastYtdIncome + currentMonthGross + (emp.salary * remainingMonths);
            const annualSso = sso * 12;
            const annualPvf = providentFund * 12;
            const totalAnnualTax = (0, payroll_1.calcThaiTax)(projectedAnnualIncome, annualSso, annualPvf);
            const pastAnnualTax = (0, payroll_1.calcThaiTax)(emp.salary * 12, sso * 12, providentFund * 12);
            const pastMonthlyTax = Math.round(pastAnnualTax / 12);
            const pastYtdTax = pastMonthlyTax * pastMonths;
            let currentTax = Math.round((totalAnnualTax - pastYtdTax) / (remainingMonths + 1));
            if (currentTax < 0)
                currentTax = 0;
            const net = currentMonthGross - currentTax - sso - providentFund - loan;
            payrollResults.push({
                payrollRunId: payrollRun.id,
                empId: emp.id,
                gross: currentMonthGross,
                otHours,
                otPay: (0, payroll_1.calcOTPay)(emp, otHours, false, emp.shift, settings),
                baseSalary: emp.salary,
                tax: currentTax,
                sso,
                employerSso,
                providentFund,
                loan,
                other_deduct: 0,
                net,
                status: "paid",
                paidDate: `${period}-30`
            });
        }
        await prisma_1.prisma.payrollRunDetail.createMany({
            data: payrollResults
        });
        const totalGross = payrollResults.reduce((s, r) => s + r.gross, 0);
        const totalNet = payrollResults.reduce((s, r) => s + r.net, 0);
        const totalTax = payrollResults.reduce((s, r) => s + r.tax, 0);
        const totalSso = payrollResults.reduce((s, r) => s + r.sso, 0);
        const totalEmployerSso = payrollResults.reduce((s, r) => s + r.employerSso, 0);
        await prisma_1.prisma.payrollRun.update({
            where: { id: payrollRun.id },
            data: { totalGross, totalNet, totalTax, totalSso, totalEmployerSso, status: "draft" }
        });
        const savedDetails = await prisma_1.prisma.payrollRunDetail.findMany({
            where: { payrollRunId: payrollRun.id },
            include: { employee: true, payrollRun: true }
        });
        const mapped = savedDetails.map(d => ({
            ...d,
            period: d.payrollRun.period
        }));
        res.json(mapped);
    }
    catch (error) {
        console.error("Run Payroll Error:", error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
};
exports.runPayroll = runPayroll;
const getPayroll = async (req, res) => {
    try {
        const scopeWhere = req.user ? await (0, scopeFilter_1.buildPayrollWhereClause)(req.user) : {};
        const details = await prisma_1.prisma.payrollRunDetail.findMany({
            where: {
                employee: scopeWhere.employee || {}
            },
            include: {
                employee: true,
                payrollRun: true
            }
        });
        const mapped = details.map(d => ({
            ...d,
            period: d.payrollRun.period
        }));
        res.json(mapped);
    }
    catch (error) {
        console.error("Get Payroll Error:", error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
};
exports.getPayroll = getPayroll;
