import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { LeaveCalculatorService } from '../services/leave-calculator.service';
import { LeaveLedgerService } from '../services/leave-ledger.service';
import { AuthRequest } from '../middlewares/auth.middleware';

// ──────────────────────────────────────────────────────────────────────────────
// Leave Type Definition CRUD
// ──────────────────────────────────────────────────────────────────────────────

export const getLeaveTypes = async (_req: Request, res: Response) => {
  try {
    const types = await prisma.leaveTypeDefinition.findMany({
      orderBy: { code: 'asc' }
    });
    res.json(types);
  } catch (error: any) {
    console.error('[getLeaveTypes]', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

export const createLeaveType = async (req: Request, res: Response) => {
  try {
    const { code, name, description } = req.body;
    if (!code || !name) {
      return res.status(400).json({ message: 'code and name are required.' });
    }
    const leaveType = await prisma.leaveTypeDefinition.create({
      data: { code: code.toLowerCase().trim(), name, description }
    });
    res.status(201).json(leaveType);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: `Leave type code "${req.body.code}" already exists.` });
    }
    console.error('[createLeaveType]', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

export const updateLeaveType = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { name, description, isActive } = req.body;
    const updated = await prisma.leaveTypeDefinition.update({
      where: { id },
      data: { name, description, isActive }
    });
    res.json(updated);
  } catch (error: any) {
    console.error('[updateLeaveType]', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

export const deleteLeaveType = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    // Check if it has linked accounts before deleting
    const linked = await prisma.employeeLeaveAccount.count({ where: { leaveTypeDefId: id } });
    if (linked > 0) {
      return res.status(409).json({ message: `Cannot delete: ${linked} employee account(s) still reference this leave type. Deactivate instead.` });
    }
    await prisma.leaveTypeDefinition.delete({ where: { id } });
    res.json({ message: 'Deleted successfully.' });
  } catch (error: any) {
    console.error('[deleteLeaveType]', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Employee Leave Account Assignment
// ──────────────────────────────────────────────────────────────────────────────

export const getEmployeeLeaveAccounts = async (req: Request, res: Response) => {
  try {
    const empId = parseInt(req.params.empId as string, 10);
    const accounts = await prisma.employeeLeaveAccount.findMany({
      where: { employeeId: empId },
      include: {
        leavePolicy: {
          include: { entitlementRules: { orderBy: { minYearsOfService: 'asc' } } }
        },
        leaveTypeDef: true
      }
    });
    res.json(accounts);
  } catch (error: any) {
    console.error('[getEmployeeLeaveAccounts]', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

export const assignLeavePolicyToEmployee = async (req: Request, res: Response) => {
  try {
    const empId = parseInt(req.params.empId as string, 10);
    const { policyId, leaveTypeDefId } = req.body;

    if (!policyId) {
      return res.status(400).json({ message: 'policyId is required.' });
    }

    // Verify employee and policy exist
    const [employee, policy] = await Promise.all([
      prisma.employee.findUnique({ where: { id: empId } }),
      prisma.leavePolicy.findUnique({ where: { id: parseInt(policyId, 10) } })
    ]);

    if (!employee) return res.status(404).json({ message: 'Employee not found.' });
    if (!policy) return res.status(404).json({ message: 'Leave policy not found.' });

    const account = await prisma.employeeLeaveAccount.upsert({
      where: { employeeId_leavePolicyId: { employeeId: empId, leavePolicyId: parseInt(policyId, 10) } },
      create: {
        employeeId: empId,
        leavePolicyId: parseInt(policyId, 10),
        leaveTypeDefId: leaveTypeDefId ? parseInt(leaveTypeDefId, 10) : null,
        isActive: true
      },
      update: {
        isActive: true,
        leaveTypeDefId: leaveTypeDefId ? parseInt(leaveTypeDefId, 10) : undefined
      },
      include: { leavePolicy: true, leaveTypeDef: true }
    });

    res.status(201).json(account);
  } catch (error: any) {
    console.error('[assignLeavePolicyToEmployee]', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

export const revokeLeavePolicyFromEmployee = async (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId as string, 10);
    await prisma.employeeLeaveAccount.update({
      where: { id: accountId },
      data: { isActive: false }
    });
    res.json({ message: 'Leave account deactivated.' });
  } catch (error: any) {
    console.error('[revokeLeavePolicyFromEmployee]', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Manual Balance Adjustment (Ledger-safe — never overwrites cachedBalance directly)
// ──────────────────────────────────────────────────────────────────────────────

export const manualBalanceAdjustment = async (req: AuthRequest, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId as string, 10);
    const { amount, reason } = req.body;

    if (amount === undefined || amount === null) {
      return res.status(400).json({ message: 'amount is required.' });
    }
    if (!reason || String(reason).trim() === '') {
      return res.status(400).json({ message: 'A reason is mandatory for manual adjustments.' });
    }

    const adjustmentAmount = parseFloat(amount);
    if (isNaN(adjustmentAmount) || adjustmentAmount === 0) {
      return res.status(400).json({ message: 'amount must be a non-zero number.' });
    }

    const result = await LeaveLedgerService.applyManualAdjustment({
      accountId,
      amount: adjustmentAmount,
      reason: String(reason).trim(),
      actorId: req.user?.id ?? 0,
      actorRoles: req.user?.roles ?? [],
      actorIp: String(req.ip || req.socket?.remoteAddress || 'unknown')
    });

    res.json({
      message: 'Adjustment applied successfully.',
      transaction: result.ledgerEntry,
      newBalance: result.newBalance
    });
  } catch (error: any) {
    console.error('[manualBalanceAdjustment]', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Reconcile Employee Leave Accounts (called when probation passes / tier changes)
// ──────────────────────────────────────────────────────────────────────────────

export const reconcileEmployee = async (req: Request, res: Response) => {
  try {
    const empId = parseInt(req.params.empId as string, 10);
    const result = await LeaveCalculatorService.reconcileEmployeeAccounts(empId);
    res.json({ message: 'Reconciliation complete.', adjustments: result });
  } catch (error: any) {
    console.error('[reconcileEmployee]', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};
