import cron from 'node-cron';
import { prisma } from '../prisma';
import { LeaveLedgerService } from '../services/leave-ledger.service';

interface CarryOverResult {
  empId: number;
  accountId: number;
  leaveType: string;
  remainingBalance: number;
  carryOverAmount: number;
  forfeitAmount: number;
}

export const processEndOfYear = async (year: number): Promise<CarryOverResult[]> => {
  console.log(`[EOY] Starting end-of-year carry-over for year ${year}...`);

  const accounts = await prisma.employeeLeaveAccount.findMany({
    where: { isActive: true },
    include: {
      leavePolicy: true,
      transactions: { where: { year } }
    }
  });

  const results: CarryOverResult[] = [];

  for (const account of accounts) {
    try {
      const balance = LeaveLedgerService.deriveBalance(account.transactions);
      const remainingBalance = balance.remaining;

      const { carryOverAmount, forfeitAmount } = await LeaveLedgerService.applyCarryOver({
        account: {
          id: account.id,
          employeeId: account.employeeId,
          leavePolicyId: account.leavePolicyId,
          cachedBalance: account.cachedBalance,
          leavePolicy: {
            leaveType: account.leavePolicy.leaveType,
            isCarryForward: account.leavePolicy.isCarryForward,
            maxCarryDays: account.leavePolicy.maxCarryDays
          }
        },
        year,
        remainingBalance
      });

      results.push({ empId: account.employeeId, accountId: account.id, leaveType: account.leavePolicy.leaveType, remainingBalance, carryOverAmount, forfeitAmount });
    } catch (err: any) {
      console.error(`[EOY ERROR] EmpID ${account.employeeId}, AccountID ${account.id}: ${err.message}`);
    }
  }

  console.log(`[EOY] Completed. Processed ${results.length} accounts.`);
  return results;
};

export const startEndOfYearJob = () => {
  cron.schedule('59 23 31 12 *', async () => {
    const year = new Date().getFullYear();
    try {
      const results = await processEndOfYear(year);
      const totalCarry = results.reduce((s, r) => s + r.carryOverAmount, 0);
      const totalForfeit = results.reduce((s, r) => s + r.forfeitAmount, 0);
      console.log(`[EOY CRON] Done. Carry-over: ${totalCarry} days | Forfeited: ${totalForfeit} days`);
    } catch (err: any) {
      console.error('[EOY CRON ERROR]', err.message);
    }
  }, { timezone: 'Asia/Bangkok' });

  console.log('[CRON] End-of-Year carry-over job registered (23:59 Dec 31, Bangkok time)');
};
