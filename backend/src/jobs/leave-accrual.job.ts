import cron from 'node-cron';
import { prisma } from '../prisma';
import { LeaveBalanceCalculator } from '../utils/leaveCalculator';
import { LeaveLedgerService } from '../services/leave-ledger.service';

export const startLeaveAccrualJob = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running daily Leave Accrual Job...');
    const year = new Date().getFullYear();
    let processed = 0;
    let skipped = 0;

    try {
      const employees = await prisma.employee.findMany({
        where: { status: 'active', hireDate: { not: null } }
      });
      const policies = await prisma.leavePolicy.findMany();

      for (const emp of employees) {
        for (const policy of policies) {
          try {
            const entitled = await LeaveBalanceCalculator.calculateEntitlement(emp.id, policy.leaveType, year);
            if (entitled <= 0) { skipped++; continue; }

            // Use LeaveLedgerService.deriveBalance to check current allocation
            const existingTxs = await prisma.leaveBalanceTransaction.findMany({
              where: {
                empId: emp.id,
                leavePolicyId: policy.id,
                year,
                transactionType: { in: ['annual_allocation', 'tier_upgrade'] }
              }
            });
            const currentAllocated = existingTxs.reduce((sum, t) => sum + t.amount, 0);

            if (entitled > currentAllocated) {
              const diff = Number((entitled - currentAllocated).toFixed(4));
              await LeaveLedgerService.allocateEntitlement({
                empId: emp.id,
                leavePolicyId: policy.id,
                leaveType: policy.leaveType,
                year,
                amount: diff,
                isUpgrade: currentAllocated > 0,
                remarks: `Automated accrual. Total entitled: ${entitled}`
              });
              processed++;
            } else {
              skipped++;
            }
          } catch (err: any) {
            console.error(`[ACCRUAL ERROR] EmpID ${emp.id}, Policy ${policy.leaveType}: ${err.message}`);
          }
        }
      }
      console.log(`[CRON] Leave Accrual done. Processed: ${processed}, Skipped: ${skipped}`);
    } catch (error: any) {
      console.error('[CRON FATAL] Leave Accrual Job failed:', error.message);
    }
  });
};
