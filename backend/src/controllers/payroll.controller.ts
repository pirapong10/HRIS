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

async function getEmployeeCurrency(empId: number, tx: any) {
  const emp = await tx.employee.findUnique({
    where: { id: empId },
    include: { department: true }
  });
  let dept = emp?.department;
  while (dept) {
    if (dept.currency) {
      return { currency: dept.currency, exchangeRate: dept.exchangeRate || 1.0 };
    }
    if (!dept.parentId) break;
    dept = await tx.department.findUnique({ where: { id: dept.parentId } });
  }
  return { currency: 'THB', exchangeRate: 1.0 };
}

// Distributed Execution Lock Guard to prevent race conditions on concurrent payroll runs
const activePayrollLocks = new Set<string>();

export const runPayroll = async (req: AuthRequest, res: Response) => {
  const { period } = req.body;
  if (!period) return res.status(400).json({ message: 'Period is required (YYYY-MM)' });
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  // Race Condition Protection: Lock execution for this period
  const lockKey = `payroll_lock_${period}_${req.user.id}`;
  if (activePayrollLocks.has(lockKey)) {
    return res.status(429).json({ message: 'การคำนวณเงินเดือนสำหรับงวดนี้กำลังดำเนินการอยู่ กรุณารอสักครู่' });
  }

  try {
    activePayrollLocks.add(lockKey);

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

        // Sum late minutes from attendance
        const [year, month] = period.split('-').map(Number);
        const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
        const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
        
        const attendances = await tx.attendance.findMany({
          where: { empId: emp.id, date: { gte: startOfMonth, lte: endOfMonth } }
        });
        const totalLateMins = attendances.reduce((sum: number, a: any) => sum + (a.lateMinutes || 0), 0);

        const baseVariables = {
          Salary: emp.salary,
          OTHours: otHours,
          LateMinutes: totalLateMins,
          LoanDeduction: loanDeduct,
        };

        const result = await runPayrollEngine(baseVariables, emp.employeeTypeId || undefined);
        const curr = await getEmployeeCurrency(emp.id, tx);

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
            currency: curr.currency,
            exchangeRate: curr.exchangeRate,
            grossLocal: result.gross * curr.exchangeRate,
            netLocal: result.net * curr.exchangeRate,
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
  } finally {
    const lockKey = `payroll_lock_${period}_${req.user.id}`;
    activePayrollLocks.delete(lockKey);
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

    const scope = await buildPayrollWhereClause(req.user);
    if (scope.accessLevel === 'DENIED') {
      return res.status(403).json({ message: 'No access' });
    }

    const { id } = req.params;
    const details = await prisma.payrollRunDetail.findMany({
      where: {
        payrollRunId: Number(id),
        ...scope.payrollDetailWhere
      },
      include: { employee: true }
    });

    if (details.length === 0) {
      return res.status(404).json({ message: 'No payroll details found in your scope' });
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

    await writeAudit({
      userId: req.user.id,
      action: 'EXPORT',
      module: 'payroll',
      recordId: String(id),
      details: `Exported bank transfer file for payroll run ${id} (${details.length} records)`,
      ipAddress: req.ip ? String(req.ip) : undefined
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
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const scope = await buildPayrollWhereClause(req.user);
    if (scope.accessLevel === 'DENIED') {
      return res.status(403).json({ message: 'No access' });
    }

    const { id } = req.params;
    const detail = await prisma.payrollRunDetail.findFirst({
      where: {
        id: parseInt(id as string),
        ...scope.payrollDetailWhere
      },
      include: { employee: true, componentResults: { include: { component: true } } }
    });
    if (!detail) return res.status(404).json({ message: 'Payroll detail not found or access denied' });

    const formattedDetail = {
      ...detail,
      components: detail.componentResults
    };

    res.json(formattedDetail);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const generatePayslipPdf = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const scope = await buildPayrollWhereClause(req.user);
    if (scope.accessLevel === 'DENIED') {
      return res.status(403).json({ message: 'No access' });
    }

    const { id } = req.params;
    const detail = await prisma.payrollRunDetail.findFirst({
      where: {
        id: Number(id),
        ...scope.payrollDetailWhere
      },
      include: { employee: true, payrollRun: true, componentResults: { include: { component: true } } }
    });

    if (!detail) {
      return res.status(404).json({ message: 'Payroll detail not found or access denied' });
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

export const exportSSOReport = async (req: AuthRequest, res: Response) => {
  try {
    const { period } = req.query;
    if (!period) return res.status(400).json({ message: 'Period query parameter is required (YYYY-MM)' });
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const scope = await buildPayrollWhereClause(req.user);
    if (scope.accessLevel === 'DENIED') {
      return res.status(403).json({ message: 'No access' });
    }

    const details = await prisma.payrollRunDetail.findMany({
      where: {
        payrollRun: { period: String(period) },
        ...scope.payrollDetailWhere
      },
      include: {
        employee: true,
        payrollRun: true
      }
    });

    // Generate Standard Social Security (สปส. 1-10) Export Data
    let ssoLines = [`เลขประจำตัวผู้เสียภาษี/เลขที่บัญชีนายจ้าง,เลขประจำตัวประชาชน,ชื่อ-นามสกุล,ค่าจ้างสุทธิ,เงินสมทบผู้ประกันตน`];

    details.forEach(d => {
      const ssoNo = d.employee.taxId || d.employee.empCode || 'N/A';
      const name = d.employee.name || '';
      const gross = d.gross.toFixed(2);
      const sso = d.sso.toFixed(2);
      ssoLines.push(`0105550000000,${ssoNo},"${name}",${gross},${sso}`);
    });

    const csvContent = ssoLines.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="sso_report_${period}.csv"`);
    res.send('\uFEFF' + csvContent); // Include UTF-8 BOM for Excel compatibility
  } catch (error: any) {
    res.status(500).json({ message: 'Error exporting SSO report', details: error.message });
  }
};
