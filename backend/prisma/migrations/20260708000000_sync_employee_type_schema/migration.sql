CREATE TABLE "EmployeeType" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "ssoEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ssoRate" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "ssoCap" DOUBLE PRECISION NOT NULL DEFAULT 750,
    "ssoEmployerRate" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "taxMethod" TEXT NOT NULL DEFAULT 'progressive',
    "taxFlatRate" DOUBLE PRECISION,
    "otEligible" BOOLEAN NOT NULL DEFAULT true,
    "leaveEligible" BOOLEAN NOT NULL DEFAULT true,
    "annualLeave" INTEGER NOT NULL DEFAULT 6,
    "includeInPayroll" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmployeeType_code_key" ON "EmployeeType"("code");

ALTER TABLE "Employee" ADD COLUMN "employeeTypeId" INTEGER;

ALTER TABLE "Employee" ADD CONSTRAINT "Employee_employeeTypeId_fkey" FOREIGN KEY ("employeeTypeId") REFERENCES "EmployeeType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "EmployeeTypePayrollMapping" (
    "id" SERIAL NOT NULL,
    "employeeType" TEXT NOT NULL,
    "payrollComponentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeTypePayrollMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmployeeTypePayrollMapping_employeeType_payrollComponentId_key" ON "EmployeeTypePayrollMapping"("employeeType", "payrollComponentId");

ALTER TABLE "EmployeeTypePayrollMapping" ADD CONSTRAINT "EmployeeTypePayrollMapping_payrollComponentId_fkey" FOREIGN KEY ("payrollComponentId") REFERENCES "PayrollComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
