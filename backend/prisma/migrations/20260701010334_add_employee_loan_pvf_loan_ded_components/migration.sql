-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "empId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" SERIAL NOT NULL,
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    "deptIds" TEXT,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataScope" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "departmentIds" TEXT,
    "costCenterIds" TEXT,
    "employeeTypes" TEXT,
    "jobGrades" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollScope" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "employeeTypes" TEXT,
    "grades" TEXT,
    "departments" TEXT,
    "costCenters" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "empCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dob" TEXT,
    "gender" TEXT,
    "type" TEXT NOT NULL DEFAULT 'fulltime',
    "phone" TEXT,
    "email" TEXT,
    "hireDate" TEXT,
    "salary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bank" TEXT,
    "bankAcc" TEXT,
    "nationalId" TEXT,
    "ssoNumber" TEXT,
    "taxId" TEXT,
    "taxMethod" TEXT DEFAULT 'progressive',
    "address" TEXT,
    "emName" TEXT,
    "emRel" TEXT,
    "emPhone" TEXT,
    "workCountry" TEXT,
    "taxCountry" TEXT,
    "deptId" INTEGER,
    "posId" INTEGER,
    "shiftId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Department',
    "description" TEXT,
    "parentId" INTEGER,
    "headId" INTEGER,
    "costCenterId" INTEGER,
    "countryCode" TEXT,
    "currency" TEXT,
    "timezone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deptId" INTEGER,
    "level" TEXT,
    "grade" TEXT,
    "salaryMin" DOUBLE PRECISION,
    "salaryMax" DOUBLE PRECISION,
    "salary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "approvedHeadcount" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fiscalYear" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "breakMins" INTEGER NOT NULL DEFAULT 60,
    "days" TEXT NOT NULL,
    "otRate" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "otRateHoliday" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" SERIAL NOT NULL,
    "empId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "clockIn" TEXT,
    "clockOut" TEXT,
    "status" TEXT NOT NULL DEFAULT 'present',
    "shiftId" INTEGER,
    "locationIn" TEXT,
    "locationOut" TEXT,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceCorrection" (
    "id" SERIAL NOT NULL,
    "empId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "correctIn" TEXT,
    "correctOut" TEXT,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_manager',
    "approver" TEXT,

    CONSTRAINT "AttendanceCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leave" (
    "id" SERIAL NOT NULL,
    "empId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "days" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_manager',
    "approver" TEXT,

    CONSTRAINT "Leave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OT" (
    "id" SERIAL NOT NULL,
    "empId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "shiftId" INTEGER,
    "reason" TEXT,
    "requestedHours" DOUBLE PRECISION NOT NULL,
    "isHoliday" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending_manager',
    "approver" TEXT,

    CONSTRAINT "OT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftSwap" (
    "id" SERIAL NOT NULL,
    "reqEmpId" INTEGER NOT NULL,
    "targetEmpId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "ShiftSwap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" SERIAL NOT NULL,
    "period" TEXT NOT NULL,
    "runDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalGross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalNet" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSso" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEmployerSso" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approvedBy" INTEGER,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRunDetail" (
    "id" SERIAL NOT NULL,
    "payrollRunId" INTEGER NOT NULL,
    "empId" INTEGER NOT NULL,
    "gross" DOUBLE PRECISION NOT NULL,
    "otHours" DOUBLE PRECISION NOT NULL,
    "otPay" DOUBLE PRECISION NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL,
    "sso" DOUBLE PRECISION NOT NULL,
    "employerSso" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "providentFund" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "other_deduct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "net" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'paid',
    "paidDate" TEXT,

    CONSTRAINT "PayrollRunDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollVariable" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceField" TEXT,
    "dataType" TEXT NOT NULL DEFAULT 'number',
    "description" TEXT,

    CONSTRAINT "PayrollVariable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollComponent" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "calcMethod" TEXT NOT NULL DEFAULT 'formula',
    "formula" TEXT,
    "functionName" TEXT,
    "isTaxable" BOOLEAN NOT NULL DEFAULT true,
    "isSSOBase" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollComponentResult" (
    "id" SERIAL NOT NULL,
    "payrollDetailId" INTEGER NOT NULL,
    "componentId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "formulaUsed" TEXT NOT NULL,

    CONSTRAINT "PayrollComponentResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmpDoc" (
    "id" SERIAL NOT NULL,
    "empId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "date" TEXT NOT NULL,

    CONSTRAINT "EmpDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmpHistory" (
    "id" SERIAL NOT NULL,
    "empId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "oldVal" TEXT NOT NULL,
    "newVal" TEXT NOT NULL,
    "remark" TEXT,

    CONSTRAINT "EmpHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingTask" (
    "id" SERIAL NOT NULL,
    "empId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OnboardingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeadcountRequest" (
    "id" SERIAL NOT NULL,
    "deptId" INTEGER NOT NULL,
    "posId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_manager',

    CONSTRAINT "HeadcountRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "module" TEXT,
    "recordId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'in_app',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "referenceId" INTEGER NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_manager',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalLog" (
    "id" SERIAL NOT NULL,
    "approvalRequestId" INTEGER NOT NULL,
    "approverId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenBlacklist" (
    "id" SERIAL NOT NULL,
    "jti" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenBlacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" SERIAL NOT NULL,
    "companyLat" DOUBLE PRECISION NOT NULL DEFAULT 13.7563,
    "companyLng" DOUBLE PRECISION NOT NULL DEFAULT 100.5018,
    "allowedRadiusM" INTEGER NOT NULL DEFAULT 50,
    "lateThresholdMins" INTEGER NOT NULL DEFAULT 15,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scopeDeptIds" TEXT,
    "scopeCostCenterIds" TEXT,
    "scopeEmpTypes" TEXT,
    "scopeJobGrades" TEXT,

    CONSTRAINT "AuthGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthGroupPermission" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,

    CONSTRAINT "AuthGroupPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthGroupMember" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "assignedBy" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeLoan" (
    "id" SERIAL NOT NULL,
    "empId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "monthlyDeduct" DOUBLE PRECISION NOT NULL,
    "remainingBal" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "EmployeeLoan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_empId_key" ON "User"("empId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "DataScope_userId_key" ON "DataScope"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollScope_userId_key" ON "PayrollScope"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_empCode_key" ON "Employee"("empCode");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Position_code_key" ON "Position"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CostCenter_code_key" ON "CostCenter"("code");

-- CreateIndex
CREATE INDEX "Attendance_empId_date_idx" ON "Attendance"("empId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRun_period_key" ON "PayrollRun"("period");

-- CreateIndex
CREATE INDEX "PayrollRunDetail_payrollRunId_empId_idx" ON "PayrollRunDetail"("payrollRunId", "empId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollVariable_code_key" ON "PayrollVariable"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollComponent_code_key" ON "PayrollComponent"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TokenBlacklist_jti_key" ON "TokenBlacklist"("jti");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "AuthGroupPermission_groupId_permissionId_key" ON "AuthGroupPermission"("groupId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthGroupMember_groupId_userId_key" ON "AuthGroupMember"("groupId", "userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_empId_fkey" FOREIGN KEY ("empId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataScope" ADD CONSTRAINT "DataScope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollScope" ADD CONSTRAINT "PayrollScope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_deptId_fkey" FOREIGN KEY ("deptId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_posId_fkey" FOREIGN KEY ("posId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_headId_fkey" FOREIGN KEY ("headId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_deptId_fkey" FOREIGN KEY ("deptId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_empId_fkey" FOREIGN KEY ("empId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrection" ADD CONSTRAINT "AttendanceCorrection_empId_fkey" FOREIGN KEY ("empId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_empId_fkey" FOREIGN KEY ("empId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OT" ADD CONSTRAINT "OT_empId_fkey" FOREIGN KEY ("empId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OT" ADD CONSTRAINT "OT_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSwap" ADD CONSTRAINT "ShiftSwap_reqEmpId_fkey" FOREIGN KEY ("reqEmpId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSwap" ADD CONSTRAINT "ShiftSwap_targetEmpId_fkey" FOREIGN KEY ("targetEmpId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRunDetail" ADD CONSTRAINT "PayrollRunDetail_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRunDetail" ADD CONSTRAINT "PayrollRunDetail_empId_fkey" FOREIGN KEY ("empId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollComponentResult" ADD CONSTRAINT "PayrollComponentResult_payrollDetailId_fkey" FOREIGN KEY ("payrollDetailId") REFERENCES "PayrollRunDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollComponentResult" ADD CONSTRAINT "PayrollComponentResult_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "PayrollComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpDoc" ADD CONSTRAINT "EmpDoc_empId_fkey" FOREIGN KEY ("empId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpHistory" ADD CONSTRAINT "EmpHistory_empId_fkey" FOREIGN KEY ("empId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_empId_fkey" FOREIGN KEY ("empId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeadcountRequest" ADD CONSTRAINT "HeadcountRequest_deptId_fkey" FOREIGN KEY ("deptId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeadcountRequest" ADD CONSTRAINT "HeadcountRequest_posId_fkey" FOREIGN KEY ("posId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalLog" ADD CONSTRAINT "ApprovalLog_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalLog" ADD CONSTRAINT "ApprovalLog_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthGroupPermission" ADD CONSTRAINT "AuthGroupPermission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AuthGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthGroupPermission" ADD CONSTRAINT "AuthGroupPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthGroupMember" ADD CONSTRAINT "AuthGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AuthGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthGroupMember" ADD CONSTRAINT "AuthGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLoan" ADD CONSTRAINT "EmployeeLoan_empId_fkey" FOREIGN KEY ("empId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
