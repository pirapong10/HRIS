import { prisma } from '../prisma';
import crypto from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LedgerTransactionType =
  | 'annual_allocation'
  | 'tier_upgrade'
  | 'pending'
  | 'pending_resolved'
  | 'used'
  | 'rejected_return'
  | 'MANUAL_ADJUSTMENT'
  | 'CARRY_OVER_ADD'
  | 'FORFEIT';

/** All transaction types that ADD entitlement to an account */
export const ALLOCATION_TYPES: LedgerTransactionType[] = [
  'annual_allocation', 'tier_upgrade', 'MANUAL_ADJUSTMENT', 'CARRY_OVER_ADD'
];

export interface CreateLedgerEntryInput {
  empId: number;
  leavePolicyId: number;
  year: number;
  transactionType: LedgerTransactionType;
  amount: number;
  remarks?: string;
  referenceId?: string;
  employeeLeaveAccountId?: number;
}

export interface AuditLogInput {
  actorId: number;
  actorRoles: any[];
  actorIp: string;
  module: string;
  action: string;
  recordId: string;
  previousState?: any;
  newState?: any;
  businessReason?: string | null;
}

// ─── LeaveLedgerService ──────────────────────────────────────────────────────
//
// Single Source of Truth for ALL ledger writes.
// Rules:
//   1. No controller or cron job may write to LeaveBalanceTransaction directly.
//   2. cachedBalance on EmployeeLeaveAccount is ALWAYS updated via { increment }
//      — never a direct $set / overwrite.
//   3. LeaveBalance (legacy) is always kept in sync through syncLegacyBalance().
//
export class LeaveLedgerService {
  // ── Private Primitives ──────────────────────────────────────────────────────

  /**
   * Write a single immutable ledger entry inside an existing Prisma tx.
   * Keeping it private forces callers to use the higher-level public methods.
   */
  private static async _writeLedgerEntry(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    input: CreateLedgerEntryInput
  ) {
    return tx.leaveBalanceTransaction.create({
      data: {
        empId: input.empId,
        leavePolicyId: input.leavePolicyId,
        year: input.year,
        transactionType: input.transactionType,
        amount: input.amount,
        remarks: input.remarks ?? null,
        referenceId: input.referenceId ?? null,
        employeeLeaveAccountId: input.employeeLeaveAccountId ?? null,
      }
    });
  }

  /**
   * Sync the legacy LeaveBalance cache inside an existing tx.
   * Uses upsert so it is safe to call whether the row exists or not.
   */
  private static async _syncLegacyBalance(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    employeeId: number,
    year: number,
    leaveType: string,
    entitledDelta: number,
    usedDelta = 0,
    pendingDelta = 0,
    remainingDelta?: number
  ) {
    const effectiveRemainingDelta = remainingDelta ?? (entitledDelta - usedDelta - pendingDelta);
    return tx.leaveBalance.upsert({
      where: { employeeId_year_leaveType: { employeeId, year, leaveType } },
      create: {
        employeeId,
        year,
        leaveType,
        entitled: Math.max(0, entitledDelta),
        used: Math.max(0, usedDelta),
        pending: Math.max(0, pendingDelta),
        remaining: entitledDelta - usedDelta - pendingDelta,
      },
      update: {
        ...(entitledDelta !== 0 && { entitled: { increment: entitledDelta } }),
        ...(usedDelta !== 0 && { used: { increment: usedDelta } }),
        ...(pendingDelta !== 0 && { pending: { increment: pendingDelta } }),
        ...(effectiveRemainingDelta !== 0 && { remaining: { increment: effectiveRemainingDelta } }),
      }
    });
  }

  /**
   * Write a tamper-evident EnterpriseAuditLog entry inside an existing tx.
   */
  private static async _writeAuditLog(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    input: AuditLogInput
  ) {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ ...input, ts: Date.now() }))
      .digest('hex');
    return tx.enterpriseAuditLog.create({
      data: {
        actorId: input.actorId,
        actorRoles: input.actorRoles ?? [],
        actorIp: input.actorIp,
        module: input.module,
        action: input.action,
        recordId: input.recordId,
        previousState: input.previousState ?? null,
        newState: input.newState ?? null,
        businessReason: input.businessReason ?? null,
        cryptographicHash: hash,
      }
    });
  }

  // ── Balance Derivation ──────────────────────────────────────────────────────

  /**
   * Derive remaining balance from the ledger (source of truth).
   * Does NOT use cachedBalance — always recalculates from transactions.
   */
  static deriveBalance(transactions: { transactionType: string; amount: number }[]) {
    let entitled = 0;
    let used = 0;
    let pending = 0;

    for (const t of transactions) {
      const type = t.transactionType as LedgerTransactionType;
      if ((ALLOCATION_TYPES as string[]).includes(type)) {
        entitled += t.amount;
      } else if (type === 'used') {
        used += t.amount;
      } else if (type === 'pending') {
        pending += t.amount;
      } else if (type === 'pending_resolved' || type === 'rejected_return') {
        pending -= Math.abs(t.amount);
      } else if (type === 'FORFEIT') {
        entitled += t.amount; // FORFEIT amount is negative
      }
    }

    const remaining = Number((entitled - used - Math.max(0, pending)).toFixed(4));
    return { entitled: Number(entitled.toFixed(4)), used: Number(used.toFixed(4)), pending: Number(Math.max(0, pending).toFixed(4)), remaining };
  }

  // ── Public Business Operations ──────────────────────────────────────────────

  /**
   * Allocate entitlement (annual_allocation or tier_upgrade).
   * Called by: leave-accrual.job.ts, reconcileEmployeeAccounts.
   */
  static async allocateEntitlement(params: {
    empId: number;
    leavePolicyId: number;
    leaveType: string;
    year: number;
    amount: number;
    employeeLeaveAccountId?: number;
    isUpgrade?: boolean;
    remarks?: string;
  }) {
    const txType = params.isUpgrade ? 'tier_upgrade' : 'annual_allocation';
    return prisma.$transaction(async (tx) => {
      await this._writeLedgerEntry(tx, {
        empId: params.empId,
        leavePolicyId: params.leavePolicyId,
        year: params.year,
        transactionType: txType,
        amount: params.amount,
        employeeLeaveAccountId: params.employeeLeaveAccountId,
        remarks: params.remarks ?? `Automated allocation: ${params.amount} days`
      });

      if (params.employeeLeaveAccountId) {
        await tx.employeeLeaveAccount.update({
          where: { id: params.employeeLeaveAccountId },
          data: { cachedBalance: { increment: params.amount } }
        });
      }

      await this._syncLegacyBalance(tx, params.empId, params.year, params.leaveType, params.amount);
    });
  }

  /**
   * Apply a manual balance adjustment (requires reason for audit).
   * Called by: admin-leave.controller.ts → manualBalanceAdjustment.
   */
  static async applyManualAdjustment(params: {
    accountId: number;
    amount: number;
    reason: string;
    actorId: number;
    actorRoles: any[];
    actorIp: string;
  }) {
    const account = await prisma.employeeLeaveAccount.findUnique({
      where: { id: params.accountId },
      include: { leavePolicy: true }
    });
    if (!account) throw new Error('Employee leave account not found.');

    const year = new Date().getFullYear();
    const previousBalance = account.cachedBalance;

    return prisma.$transaction(async (tx) => {
      const ledgerEntry = await this._writeLedgerEntry(tx, {
        empId: account.employeeId,
        leavePolicyId: account.leavePolicyId,
        year,
        transactionType: 'MANUAL_ADJUSTMENT',
        amount: params.amount,
        employeeLeaveAccountId: params.accountId,
        remarks: `Manual adjustment by admin (ID: ${params.actorId}): ${params.reason}`
      });

      const updatedAccount = await tx.employeeLeaveAccount.update({
        where: { id: params.accountId },
        data: { cachedBalance: { increment: params.amount } },
        include: { leavePolicy: true }
      });

      await this._syncLegacyBalance(
        tx, account.employeeId, year,
        account.leavePolicy.leaveType,
        params.amount, 0, 0, params.amount
      );

      await this._writeAuditLog(tx, {
        actorId: params.actorId,
        actorRoles: params.actorRoles,
        actorIp: params.actorIp,
        module: 'leave_admin',
        action: 'MANUAL_BALANCE_ADJUSTMENT',
        recordId: String(params.accountId),
        previousState: { cachedBalance: previousBalance },
        newState: { cachedBalance: updatedAccount.cachedBalance, adjustmentAmount: params.amount },
        businessReason: params.reason
      });

      return { ledgerEntry, newBalance: updatedAccount.cachedBalance };
    });
  }

  /**
   * Record a leave pending transaction (when request is created).
   * Called by: leave.service.ts → createLeaveRequest.
   */
  static async recordPending(params: {
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
    empId: number;
    leavePolicyId: number;
    year: number;
    days: number;
    leaveId: number;
    leaveType: string;
  }) {
    await this._writeLedgerEntry(params.tx, {
      empId: params.empId,
      leavePolicyId: params.leavePolicyId,
      year: params.year,
      transactionType: 'pending',
      amount: params.days,
      referenceId: String(params.leaveId),
      remarks: 'Leave requested'
    });
    // Legacy balance updated by the caller (leave.service.ts handles pending/remaining)
  }

  /**
   * Resolve a pending leave when approved or rejected.
   * Called by: leave.service.ts → processLeaveApproval.
   */
  static async resolvePending(params: {
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
    empId: number;
    leavePolicyId: number;
    year: number;
    days: number;
    leaveId: number;
    leaveType: string;
    action: 'APPROVED' | 'REJECTED';
  }) {
    if (params.action === 'APPROVED') {
      await this._writeLedgerEntry(params.tx, {
        empId: params.empId, leavePolicyId: params.leavePolicyId,
        year: params.year, transactionType: 'used',
        amount: params.days, referenceId: String(params.leaveId), remarks: 'Leave approved'
      });
      await this._writeLedgerEntry(params.tx, {
        empId: params.empId, leavePolicyId: params.leavePolicyId,
        year: params.year, transactionType: 'pending_resolved',
        amount: -params.days, referenceId: String(params.leaveId)
      });
    } else {
      await this._writeLedgerEntry(params.tx, {
        empId: params.empId, leavePolicyId: params.leavePolicyId,
        year: params.year, transactionType: 'rejected_return',
        amount: -params.days, referenceId: String(params.leaveId)
      });
    }
  }

  /**
   * Apply end-of-year carry-over and forfeit for a single account.
   * Called by: end-of-year.job.ts.
   */
  static async applyCarryOver(params: {
    account: {
      id: number;
      employeeId: number;
      leavePolicyId: number;
      cachedBalance: number;
      leavePolicy: { leaveType: string; isCarryForward: boolean; maxCarryDays: number };
    };
    year: number;
    remainingBalance: number;
  }) {
    const { account, year, remainingBalance } = params;
    const nextYear = year + 1;
    const maxCarry = account.leavePolicy.isCarryForward ? (account.leavePolicy.maxCarryDays ?? 0) : 0;
    const carryOverAmount = Number(Math.min(remainingBalance, maxCarry).toFixed(4));
    const forfeitAmount = Number((remainingBalance - carryOverAmount).toFixed(4));

    await prisma.$transaction(async (tx) => {
      if (forfeitAmount > 0) {
        await this._writeLedgerEntry(tx, {
          empId: account.employeeId, leavePolicyId: account.leavePolicyId,
          year, transactionType: 'FORFEIT', amount: -forfeitAmount,
          employeeLeaveAccountId: account.id,
          remarks: `End-of-year forfeit: ${forfeitAmount} days expired (max carry: ${maxCarry})`
        });
      }
      if (carryOverAmount > 0) {
        await this._writeLedgerEntry(tx, {
          empId: account.employeeId, leavePolicyId: account.leavePolicyId,
          year: nextYear, transactionType: 'CARRY_OVER_ADD', amount: carryOverAmount,
          employeeLeaveAccountId: account.id,
          remarks: `Carry-over from ${year}: ${carryOverAmount} of ${remainingBalance} days`
        });
        await tx.employeeLeaveAccount.update({
          where: { id: account.id },
          data: { cachedBalance: { decrement: remainingBalance - carryOverAmount } }
        });
        await this._syncLegacyBalance(tx, account.employeeId, nextYear, account.leavePolicy.leaveType, carryOverAmount);
      } else {
        await tx.employeeLeaveAccount.update({
          where: { id: account.id },
          data: { cachedBalance: 0 }
        });
      }
    });

    return { carryOverAmount, forfeitAmount };
  }

  /**
   * Write an audit log entry standalone (without an open transaction).
   * Used by approval controllers that create their own tx.
   */
  static async writeAuditLogStandalone(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    input: AuditLogInput
  ) {
    return this._writeAuditLog(tx, input);
  }
}
