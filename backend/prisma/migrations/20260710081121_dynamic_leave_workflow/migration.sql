-- AlterTable
ALTER TABLE "LeaveBalanceTransaction" ADD COLUMN     "employeeLeaveAccountId" INTEGER;

-- CreateTable
CREATE TABLE "LeaveTypeDefinition" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveTypeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeLeaveAccount" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "leavePolicyId" INTEGER NOT NULL,
    "leaveTypeDefId" INTEGER,
    "cachedBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeLeaveAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeaveTypeDefinition_code_key" ON "LeaveTypeDefinition"("code");

-- CreateIndex
CREATE INDEX "EmployeeLeaveAccount_employeeId_idx" ON "EmployeeLeaveAccount"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeLeaveAccount_employeeId_leavePolicyId_key" ON "EmployeeLeaveAccount"("employeeId", "leavePolicyId");

-- AddForeignKey
ALTER TABLE "LeaveBalanceTransaction" ADD CONSTRAINT "LeaveBalanceTransaction_employeeLeaveAccountId_fkey" FOREIGN KEY ("employeeLeaveAccountId") REFERENCES "EmployeeLeaveAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLeaveAccount" ADD CONSTRAINT "EmployeeLeaveAccount_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLeaveAccount" ADD CONSTRAINT "EmployeeLeaveAccount_leavePolicyId_fkey" FOREIGN KEY ("leavePolicyId") REFERENCES "LeavePolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLeaveAccount" ADD CONSTRAINT "EmployeeLeaveAccount_leaveTypeDefId_fkey" FOREIGN KEY ("leaveTypeDefId") REFERENCES "LeaveTypeDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
