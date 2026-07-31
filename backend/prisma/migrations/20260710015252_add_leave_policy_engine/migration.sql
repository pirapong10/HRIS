-- CreateTable
CREATE TABLE "LeavePolicy" (
    "id" SERIAL NOT NULL,
    "leaveType" TEXT NOT NULL,
    "description" TEXT,
    "requiresCert" BOOLEAN NOT NULL DEFAULT false,
    "certThreshold" INTEGER,
    "allowNegative" BOOLEAN NOT NULL DEFAULT false,
    "maxNegative" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "proRata" BOOLEAN NOT NULL DEFAULT true,
    "isCarryForward" BOOLEAN NOT NULL DEFAULT false,
    "maxCarryDays" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "LeavePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveEntitlementRule" (
    "id" SERIAL NOT NULL,
    "leavePolicyId" INTEGER NOT NULL,
    "minYearsOfService" DOUBLE PRECISION NOT NULL,
    "maxYearsOfService" DOUBLE PRECISION,
    "entitledDays" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "LeaveEntitlementRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProbationPolicy" (
    "id" SERIAL NOT NULL,
    "probationDays" INTEGER NOT NULL DEFAULT 119,
    "allowLeaveDuring" BOOLEAN NOT NULL DEFAULT false,
    "prorateAfterPassed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProbationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBalanceTransaction" (
    "id" SERIAL NOT NULL,
    "empId" INTEGER NOT NULL,
    "leavePolicyId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "transactionType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "referenceId" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveBalanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeavePolicy_leaveType_key" ON "LeavePolicy"("leaveType");

-- CreateIndex
CREATE INDEX "LeaveEntitlementRule_leavePolicyId_idx" ON "LeaveEntitlementRule"("leavePolicyId");

-- CreateIndex
CREATE INDEX "LeaveBalanceTransaction_empId_year_idx" ON "LeaveBalanceTransaction"("empId", "year");

-- CreateIndex
CREATE INDEX "LeaveBalanceTransaction_leavePolicyId_idx" ON "LeaveBalanceTransaction"("leavePolicyId");

-- AddForeignKey
ALTER TABLE "LeaveEntitlementRule" ADD CONSTRAINT "LeaveEntitlementRule_leavePolicyId_fkey" FOREIGN KEY ("leavePolicyId") REFERENCES "LeavePolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalanceTransaction" ADD CONSTRAINT "LeaveBalanceTransaction_empId_fkey" FOREIGN KEY ("empId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalanceTransaction" ADD CONSTRAINT "LeaveBalanceTransaction_leavePolicyId_fkey" FOREIGN KEY ("leavePolicyId") REFERENCES "LeavePolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
