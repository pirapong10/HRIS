import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { buildPayrollWhereClause } from '../utils/scopeFilter';
import { AuthRequest } from '../middlewares/auth.middleware';
import PDFDocument from 'pdfkit';

import { runPayrollEngine } from '../utils/payrollEngine';

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

    const payrollRun = await prisma.payrollRun.upsert({
      where: { period },
      update: {},
      create: { period, status: 'draft' }
    });

    const payrollResults = await prisma.$transaction(async (tx) => {
      // Clean up old details for this run to re-calculate
      await tx.payrollRunDetail.deleteMany({
        where: { payrollRunId: payrollRun.id }
      });

      const results = [];

      for (const emp of employees) {
        // Find OT hours from attendance
        const ots = await tx.oT.findMany({
          where: {
            empId: emp.id,
            date: { startsWith: period },
            status: 'approved'
          }
        });
        const otHours = ots.reduce((sum, o) => sum + o.requestedHours, 0);

        const activeLoan = await tx.employeeLoan.findFirst({
          where: { empId: emp.id, status: 'active' }
        });
        const loanDeduct = activeLoan ? Math.min(activeLoan.monthlyDeduct, activeLoan.remainingBal) : 0;

        const baseVariables = {
          Salary: emp.salary,
          OTHours: otHours,
          LateMinutes: 0, // Not tracked yet. LATE_DED always = 0 until attendance clock-in vs shift.startTime is implemented.
          LoanDeduction: loanDeduct,
        };

        const result = await runPayrollEngine(baseVariables);

        const detail = await tx.payrollRunDetail.create({
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
        results.push(detail);

        // Update Loan balance
        if (activeLoan && loanDeduct > 0) {
          const newBal = activeLoan.remainingBal - loanDeduct;
          await tx.employeeLoan.update({
            where: { id: activeLoan.id },
            data: {
              remainingBal: newBal,
              status: newBal <= 0 ? 'completed' : 'active'
            }
          });
        }
      }

      const totalGross = results.reduce((s, r) => s + r.gross, 0);
      const totalNet = results.reduce((s, r) => s + r.net, 0);
      const totalTax = results.reduce((s, r) => s + r.tax, 0);
      const totalSso = results.reduce((s, r) => s + r.sso, 0);
      const totalEmployerSso = results.reduce((s, r) => s + r.employerSso, 0);

      await tx.payrollRun.update({
        where: { id: payrollRun.id },
        data: { totalGross, totalNet, totalTax, totalSso, totalEmployerSso, status: "draft" }
      });

      return results;
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
    const { id } = req.params;
    const details = await prisma.payrollRunDetail.findMany({
      where: { payrollRunId: Number(id) },
      include: { employee: true }
    });

    if (details.length === 0) {
      return res.status(404).json({ message: 'No payroll details found' });
    }

    const payrollRun = await prisma.payrollRun.findUnique({ 
      where: { id: Number(id) } 
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    let txt = `0140000000 ${dateStr} COMPANY_NAME\n`;
    
    details.forEach(detail => {
      if (!detail.employee?.bankAcc) return;
      const bankAcc = detail.employee.bankAcc.replace(/-/g, '').padEnd(15, ' ');
      const amount = Math.round(detail.net).toString().padStart(10, '0');
      const empCode = detail.employee?.empCode || '';
      txt += `${bankAcc} ${amount} ${empCode}\n`;
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 
      `attachment; filename="bank_transfer_${payrollRun?.period || id}.txt"`);
    res.send(txt);
  } catch (error) {
    res.status(500).json({ message: 'Export failed' });
  }
};

export const getPayrollDetailById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const detail = await prisma.payrollRunDetail.findUnique({
      where: { id: parseInt(id as string) },
      include: { employee: true, components: true }
    });
    if (!detail) return res.status(404).json({ message: 'Payroll detail not found' });
    res.json(detail);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const generatePayslipPdf = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const detail = await prisma.payrollRunDetail.findUnique({
      where: { id: Number(id) },
      include: { employee: true, payrollRun: true, componentResults: { include: { component: true } } }
    });

    if (!detail) {
      return res.status(404).json({ message: 'Payroll detail not found' });
    }

    const doc = new PDFDocument({ margin: 50 });
    const filename = `payslip_${detail.employee.empCode}_${detail.payrollRun.period}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    doc.pipe(res);
    
    doc.fontSize(20).text('COMPANY NAME', { align: 'center' });
    doc.fontSize(14).text('Payslip', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12).text(`Name: ${detail.employee.name}`);
    doc.text(`Employee ID: ${detail.employee.empCode}`);
    doc.text(`Period: ${detail.payrollRun.period}`);
    doc.moveDown();
    
    doc.fontSize(14).text('Earnings', { underline: true });
    doc.fontSize(12).text(`Base Salary: ${detail.baseSalary.toFixed(2)} THB`);
    if (detail.otPay > 0) doc.text(`Overtime Pay: ${detail.otPay.toFixed(2)} THB`);
    
    detail.componentResults.filter((c: any) => c.component?.type === 'earning').forEach((c: any) => {
      doc.text(`${c.component?.name || 'Earning'}: ${c.amount.toFixed(2)} THB`);
    });
    doc.moveDown();

    doc.fontSize(14).text('Deductions', { underline: true });
    doc.fontSize(12).text(`Tax: ${detail.tax.toFixed(2)} THB`);
    doc.text(`SSO: ${detail.sso.toFixed(2)} THB`);
    if (detail.providentFund > 0) doc.text(`Provident Fund: ${detail.providentFund.toFixed(2)} THB`);
    if (detail.loan > 0) doc.text(`Loan Deduction: ${detail.loan.toFixed(2)} THB`);
    
    detail.componentResults.filter((c: any) => c.component?.type === 'deduction').forEach((c: any) => {
      doc.text(`${c.component?.name || 'Deduction'}: ${c.amount.toFixed(2)} THB`);
    });
    doc.moveDown();

    doc.fontSize(16).text(`Net Pay: ${detail.net.toFixed(2)} THB`, { align: 'right' });
    
    doc.end();

  } catch (error) {
    res.status(500).json({ message: 'Error generating PDF' });
  }
};
