import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getDashboardSummary = async (req: AuthRequest, res: Response) => {
  try {
    // Basic aggregated statistics for charts
    // 1. Monthly OT Costs (Bar Chart)
    const payrolls = await prisma.payrollRunDetail.findMany({
      include: { payrollRun: true },
      orderBy: { payrollRun: { period: 'desc' } },
      take: 1000 // Last few periods
    });

    const monthlyOT: Record<string, number> = {};
    const monthlyNet: Record<string, number> = {};
    
    payrolls.forEach(p => {
      const period = p.payrollRun.period;
      if (!monthlyOT[period]) monthlyOT[period] = 0;
      if (!monthlyNet[period]) monthlyNet[period] = 0;
      monthlyOT[period] += p.otPay;
      monthlyNet[period] += p.net;
    });

    const otCostsData = Object.keys(monthlyOT).sort().map(period => ({
      period,
      otCost: monthlyOT[period],
      netPay: monthlyNet[period]
    }));

    // 2. Leave Quota Usage / Types (Pie Chart)
    const leaves = await prisma.leave.findMany({
      where: { status: 'approved' }
    });
    
    const leaveTypes: Record<string, number> = {};
    leaves.forEach(l => {
      leaveTypes[l.type] = (leaveTypes[l.type] || 0) + l.days;
    });

    const leaveData = Object.keys(leaveTypes).map(type => ({
      name: type,
      value: leaveTypes[type]
    }));

    // 3. Employee Headcounts by Department
    const employees = await prisma.employee.findMany({
      include: { department: true }
    });

    const deptCounts: Record<string, number> = {};
    employees.forEach(e => {
      const deptName = e.department?.name || 'Unknown';
      deptCounts[deptName] = (deptCounts[deptName] || 0) + 1;
    });

    const departmentData = Object.keys(deptCounts).map(dept => ({
      name: dept,
      count: deptCounts[dept]
    }));

    res.json({
      otCostsData: otCostsData.slice(-6), // Last 6 months
      leaveData,
      departmentData
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
