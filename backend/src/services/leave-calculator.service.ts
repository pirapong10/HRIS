import { prisma } from '../prisma';
import { LeaveBalanceCalculator } from '../utils/leaveCalculator';

interface ReconciliationResult {
  empId: number;
  leavePolicyId: number;
  leaveType: string;
  previousCachedBalance: number;
  newEntitlement: number;
  adjustmentInjected: number | null;
}

export class LeaveCalculatorService {
  /**
   * Reconcile all active EmployeeLeaveAccounts for a given employee.
   * Called when probation passes, service tier changes, or manually triggered.
   * Injects a correction transaction only when the calculated entitlement
   * exceeds what has already been allocated — never removes days.
   */
  static async reconcileEmployeeAccounts(empId: number): Promise<ReconciliationResult[]> {
    const year = new Date().getFullYear();

    const accounts = await prisma.employeeLeaveAccount.findMany({
      where: { employeeId: empId, isActive: true },
      include: {
        leavePolicy: true,
        transactions: {
          where: {
            year,
            transactionType: { in: ['annual_allocation', 'tier_upgrade', 'MANUAL_ADJUSTMENT'] }
          }
        }
      }
    });

    if (accounts.length === 0) {
      return [];
    }

    const results: ReconciliationResult[] = [];

    for (const account of accounts) {
      try {
        const entitled = await LeaveBalanceCalculator.calculateEntitlement(
          empId,
          account.leavePolicy.leaveType,
          year
        );

        // Sum all positive allocations so far this year
        const currentAllocated = account.transactions
          .filter(t => t.amount > 0)
          .reduce((sum, t) => sum + t.amount, 0);

        const diff = Number((entitled - currentAllocated).toFixed(4));

        if (diff > 0) {
          // Inject correction in a transaction
          await prisma.$transaction(async (tx) => {
            const txType = currentAllocated === 0 ? 'annual_allocation' : 'tier_upgrade';

            await tx.leaveBalanceTransaction.create({
              data: {
                empId,
                leavePolicyId: account.leavePolicyId,
                year,
                transactionType: txType,
                amount: diff,
                employeeLeaveAccountId: account.id,
                remarks: `Reconciliation — entitled: ${entitled}, previously allocated: ${currentAllocated}`
              }
            });

            // Update cachedBalance via increment (never direct overwrite)
            await tx.employeeLeaveAccount.update({
              where: { id: account.id },
              data: { cachedBalance: { increment: diff } }
            });

            // Keep legacy LeaveBalance cache in sync for backwards compatibility
            await tx.leaveBalance.upsert({
              where: {
                employeeId_year_leaveType: {
                  employeeId: empId,
                  year,
                  leaveType: account.leavePolicy.leaveType
                }
              },
              create: {
                employeeId: empId,
                year,
                leaveType: account.leavePolicy.leaveType,
                entitled: diff,
                used: 0,
                pending: 0,
                remaining: diff
              },
              update: {
                entitled: { increment: diff },
                remaining: { increment: diff }
              }
            });
          });

          results.push({
            empId,
            leavePolicyId: account.leavePolicyId,
            leaveType: account.leavePolicy.leaveType,
            previousCachedBalance: account.cachedBalance,
            newEntitlement: entitled,
            adjustmentInjected: diff
          });
        } else {
          results.push({
            empId,
            leavePolicyId: account.leavePolicyId,
            leaveType: account.leavePolicy.leaveType,
            previousCachedBalance: account.cachedBalance,
            newEntitlement: entitled,
            adjustmentInjected: null
          });
        }
      } catch (err: any) {
        console.error(`[reconcileEmployeeAccounts] EmpID ${empId}, PolicyID ${account.leavePolicyId}: ${err.message}`);
      }
    }

    return results;
  }

  /**
   * Get a real-time snapshot of all leave balances for an employee,
   * sourced from EmployeeLeaveAccount (new workflow) + LeaveBalance (legacy fallback).
   */
  static async getEmployeeLeaveSnapshot(empId: number, year: number) {
    const accounts = await prisma.employeeLeaveAccount.findMany({
      where: { employeeId: empId, isActive: true },
      include: {
        leavePolicy: true,
        leaveTypeDef: true,
        transactions: { where: { year } }
      }
    });

    return accounts.map(account => {
      const totalAllocated = account.transactions
        .filter(t => ['annual_allocation', 'tier_upgrade', 'MANUAL_ADJUSTMENT'].includes(t.transactionType) && t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);

      const totalUsed = account.transactions
        .filter(t => t.transactionType === 'used')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalPending = account.transactions
        .filter(t => t.transactionType === 'pending')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        accountId: account.id,
        leaveType: account.leavePolicy.leaveType,
        leaveName: account.leaveTypeDef?.name ?? account.leavePolicy.leaveType,
        entitled: totalAllocated,
        used: totalUsed,
        pending: totalPending,
        remaining: totalAllocated - totalUsed - totalPending,
        cachedBalance: account.cachedBalance
      };
    });
  }
}
