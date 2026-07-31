import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting LeaveBalance migration to LeaveBalanceTransaction ledger...');

  const legacyBalances = await prisma.leaveBalance.findMany();
  console.log(`Found ${legacyBalances.length} legacy LeaveBalance records.`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const balance of legacyBalances) {
    try {
      // Find the corresponding LeavePolicy
      const policy = await prisma.leavePolicy.findUnique({
        where: { leaveType: balance.leaveType }
      });

      if (!policy) {
        console.warn(`Policy not found for leaveType: ${balance.leaveType}. Skipping balance ID: ${balance.id}`);
        skippedCount++;
        continue;
      }

      // Check if a transaction already exists for this employee, year, and policy
      const existingTx = await prisma.leaveBalanceTransaction.findFirst({
        where: {
          empId: balance.employeeId,
          leavePolicyId: policy.id,
          year: balance.year,
          transactionType: 'allocation' // matches our recalculate script
        }
      });

      if (!existingTx) {
        // Create initial allocation transaction
        await prisma.leaveBalanceTransaction.create({
          data: {
            empId: balance.employeeId,
            leavePolicyId: policy.id,
            year: balance.year,
            transactionType: 'allocation',
            amount: balance.entitled,
            remarks: 'System migration from legacy balance'
          }
        });
        
        // If they had used leaves, we should also log the used amount to keep the ledger balanced conceptually
        if (balance.used > 0) {
           await prisma.leaveBalanceTransaction.create({
             data: {
               empId: balance.employeeId,
               leavePolicyId: policy.id,
               year: balance.year,
               transactionType: 'used',
               amount: balance.used,
               remarks: 'System migration: legacy used amount'
             }
           });
        }
        
        if (balance.pending > 0) {
           await prisma.leaveBalanceTransaction.create({
             data: {
               empId: balance.employeeId,
               leavePolicyId: policy.id,
               year: balance.year,
               transactionType: 'pending',
               amount: balance.pending,
               remarks: 'System migration: legacy pending amount'
             }
           });
        }

        migratedCount++;
      } else {
        skippedCount++;
      }
    } catch (error) {
      console.error(`Failed to migrate balance ID ${balance.id}:`, error);
    }
  }

  console.log('--------------------------------------------------');
  console.log('Migration Completed.');
  console.log(`Successfully migrated/created ledger entries for: ${migratedCount} balances.`);
  console.log(`Skipped (already exists or no policy): ${skippedCount} balances.`);
}

main()
  .catch((e) => {
    console.error(e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
