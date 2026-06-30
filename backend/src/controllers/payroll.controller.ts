import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { buildPayrollWhereClause } from '../utils/scopeFilter';
import { AuthRequest } from '../middlewares/auth.middleware';

import { runPayrollEngine } from '../utils/payrollEngine';
import { calcThaiTax, calcOTPay, calcSso } from '../utils/payroll';
import { writeAudit } from '../utils/audit';

function getLastBusinessDay(period: string): string {
  const [year, month] = period.split('-').map(Number);
  const lastDay = new Date(year, month, 0); // last day of month
  
  const dow = lastDay.getDay();
  if (dow === 0) lastDay.setDate(lastDay.getDate() - 2); // Sun -> Fri
  if (dow === 6) lastDay.setDate(lastDay.getDate() - 1); // Sat -> Fri
  
  // Format as YYYY-MM-DD local
  const offset = lastDay.getTimezoneOffset();
  const localDate = new Date(lastDay.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
}

export const runPayroll = async (req: AuthRequest, res: Response) => {
  try {
    const { period } = req.body;
    if (!period) return res.status(400).json({ message: 'Period is required (YYYY-MM)' });

    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    // 1. Enforce PayrollScope
    const scope = await buildPayrollWhereClause(req.user);
    if (scope.accessLevel === 'DENIED') {
      return res.status(403).json({ message: 'No access' });
    }

    // 2. Fetch employees under scope
    const employees = await prisma.employee.findMany({
      where: scope.employeeWhere,
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
    const payrollRun = await prisma.payrollRun.upsert({
      where: { period },
      update: {},
      create: { period, status: 'draft' }
    });

    // Clean up old details for this run to re-calculate
    await prisma.payrollRunDetail.deleteMany({
      where: { payrollRunId: payrollRun.id }
    });

    const payrollResults = [];

    for (const emp of employees) {
      // Find OT hours from attendance
      const ots = await prisma.oT.findMany({
        where: {
          empId: emp.id,
          date: { startsWith: period },
          status: 'approved'
        }
      });
      const otHours = ots.reduce((sum, o) => sum + o.requestedHours, 0);

      const activeLoan = await prisma.employeeLoan.findFirst({
        where: { empId: emp.id, status: 'active' }
      });
      const loanDeduct = activeLoan ? Math.min(activeLoan.monthlyDeduct, activeLoan.remainingBal) : 0;

      const baseVariables = {
        Salary: emp.salary,
        OTHours: otHours,
        LateMinutes: 0,
        LoanDeduction: loanDeduct,
      };

      const result = await runPayrollEngine(baseVariables);

      const detail = await prisma.payrollRunDetail.create({
        data: {
          payrollRunId: payrollRun.id,
          empId: emp.id,
          gross: result.gross,
          otHours: otHours,
          otPay: result.computed.OT_PAY || 0,
          baseSalary: result.computed.BASIC || emp.salary,
          tax: result.computed.TAX || 0,
          sso: result.computed.SSO || 0,
          employerSso: result.computed.SSO || 0,
          providentFund: result.computed.PVF || 0,
          loan: result.computed.LOAN_DED || 0,
          other_deduct: 0,
          net: result.net,
          status: "paid",
          paidDate: getLastBusinessDay(period),
          componentResults: {
            create: result.results.map(r => ({
              componentId: r.componentId,
              amount: r.amount,
              formulaUsed: r.formulaUsed
            }))
          }
        },
        include: { componentResults: true }
      });
      payrollResults.push(detail);
    }

    const totalGross = payrollResults.reduce((s, r) => s + r.gross, 0);
    const totalNet = payrollResults.reduce((s, r) => s + r.net, 0);
    const totalTax = payrollResults.reduce((s, r) => s + r.tax, 0);
    const totalSso = payrollResults.reduce((s, r) => s + r.sso, 0);
    const totalEmployerSso = payrollResults.reduce((s, r) => s + r.employerSso, 0);

    await prisma.payrollRun.update({
      where: { id: payrollRun.id },
      data: { totalGross, totalNet, totalTax, totalSso, totalEmployerSso, status: "draft" }
    });

    if (req.user) {
      await writeAudit({
        userId: req.user.id,
        action: 'CREATE',
        module: 'payroll',
        recordId: String(payrollRun.id),
        details: `Processed payroll for period ${period} (${payrollResults.length} employees)`,
        ipAddress: req.ip ? String(req.ip) : undefined
      });
    }

    const savedDetails = await prisma.payrollRunDetail.findMany({
      where: { payrollRunId: payrollRun.id },
      include: { employee: true, payrollRun: true }
    });

    const mapped = savedDetails.map(d => ({
      ...d,
      period: d.payrollRun.period
    }));

    res.json(mapped);
  } catch (error: any) {
    console.error("Run Payroll Error:", error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

export const getPayroll = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    
    const scope = await buildPayrollWhereClause(req.user);
    if (scope.accessLevel === 'DENIED') {
      return res.status(403).json({ message: 'No access' });
    }

    const details = await prisma.payrollRunDetail.findMany({
      where: scope.payrollDetailWhere,
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
  } catch (error: any) {
    console.error("Get Payroll Error:", error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

export const approvePayroll = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const { id } = req.params;

    const payrollRun = await prisma.payrollRun.update({
      where: { id: Number(id) },
      data: { status: 'approved' }
    });

    await writeAudit({
      userId: req.user.id,
      action: 'UPDATE',
      module: 'payroll',
      recordId: String(payrollRun.id),
      details: `Approved payroll run for period ${payrollRun.period}`,
      ipAddress: req.ip ? String(req.ip) : undefined
    });

    res.json(payrollRun);
  } catch (error: any) {
    console.error("Approve Payroll Error:", error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

export const exportPayroll = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const { id } = req.params;

    const payrollRun = await prisma.payrollRun.findUnique({
      where: { id: Number(id) }
    });

    if (!payrollRun) return res.status(404).json({ message: 'Not found' });

    await writeAudit({
      userId: req.user.id,
      action: 'UPDATE',
      module: 'payroll',
      recordId: String(payrollRun.id),
      details: `Exported bank file for payroll run ${payrollRun.period}`,
      ipAddress: req.ip ? String(req.ip) : undefined
    });

    // Mock export response
    res.json({ message: 'Bank file exported successfully', url: `/downloads/payroll-${id}.csv` });
  } catch (error: any) {
    console.error("Export Payroll Error:", error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};
