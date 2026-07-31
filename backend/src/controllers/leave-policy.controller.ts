import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { LeaveBalanceCalculator } from '../utils/leaveCalculator';

export const getLeavePolicies = async (req: Request, res: Response) => {
  try {
    const policies = await prisma.leavePolicy.findMany({
      include: { entitlementRules: { orderBy: { minYearsOfService: 'asc' } } }
    });
    res.json(policies);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

export const updateLeavePolicy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rules, ...data } = req.body;

    const updateData: any = { ...data };

    if (rules && Array.isArray(rules)) {
      updateData.entitlementRules = {
        deleteMany: {},
        create: rules.map((r: any) => ({
          minYearsOfService: parseFloat(r.minYearsOfService),
          maxYearsOfService: r.maxYearsOfService === null || r.maxYearsOfService === undefined ? null : parseFloat(r.maxYearsOfService),
          entitledDays: parseFloat(r.entitledDays)
        }))
      };
    }

    const policy = await prisma.leavePolicy.update({
      where: { id: parseInt(id as string, 10) },
      data: updateData,
      include: {
        entitlementRules: true
      }
    });
    
    res.json(policy);
  } catch (error: any) {
    console.error('Error updating leave policy:', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

export const getProbationPolicy = async (req: Request, res: Response) => {
  try {
    const policy = await prisma.probationPolicy.findFirst();
    res.json(policy);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

export const updateProbationPolicy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const policy = await prisma.probationPolicy.update({
      where: { id: parseInt(id as string, 10) },
      data: req.body
    });
    res.json(policy);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

export const recalculateLeaveBalances = async (req: Request, res: Response) => {
  try {
    const { year } = req.body;
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();

    const activeEmployees = await prisma.employee.findMany({
      where: { status: 'active' }
    });

    const policies = await prisma.leavePolicy.findMany();

    for (const employee of activeEmployees) {
      for (const policy of policies) {
        const entitled = await LeaveBalanceCalculator.calculateEntitlement(employee.id, policy.leaveType, targetYear);
        
        const existingAllocation = await prisma.leaveBalanceTransaction.findFirst({
          where: { empId: employee.id, leavePolicyId: policy.id, year: targetYear, transactionType: 'allocation' }
        });

        if (!existingAllocation && entitled > 0) {
          await prisma.leaveBalanceTransaction.create({
            data: {
              empId: employee.id,
              leavePolicyId: policy.id,
              year: targetYear,
              transactionType: 'allocation',
              amount: entitled,
              remarks: 'Annual system allocation'
            }
          });
        }

        // Aggregate transactions to update LeaveBalance
        const txs = await prisma.leaveBalanceTransaction.findMany({
          where: { empId: employee.id, leavePolicyId: policy.id, year: targetYear }
        });

        let used = 0;
        let pending = 0;
        let adjustedEntitled = entitled;

        for (const t of txs) {
          if (t.transactionType === 'used') used += Math.abs(t.amount);
          if (t.transactionType === 'pending') pending += Math.abs(t.amount);
          if (t.transactionType === 'pending_resolved' || t.transactionType === 'rejected_return') pending -= Math.abs(t.amount);
          if (t.transactionType === 'adjustment') adjustedEntitled += t.amount;
        }

        const remaining = adjustedEntitled - used - pending;

        await prisma.leaveBalance.upsert({
          where: { employeeId_year_leaveType: { employeeId: employee.id, year: targetYear, leaveType: policy.leaveType } },
          create: {
            employeeId: employee.id,
            year: targetYear,
            leaveType: policy.leaveType,
            entitled: adjustedEntitled,
            used,
            pending,
            remaining
          },
          update: {
            entitled: adjustedEntitled,
            used,
            pending,
            remaining
          }
        });
      }
    }

    res.json({ message: 'Recalculation complete' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error recalculating', details: error.message });
  }
};
