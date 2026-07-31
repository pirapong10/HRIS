# HRIS Enterprise — As-Is Architecture Blueprint
> Generated: 2026-07-09 | Architecture Scan from Source Code
> Note: This document reflects the CURRENT implementation verified directly from the codebase.

## 1. System Overview
**Confidence Level: HIGH**
**Evidence**: `hris/package.json`, `backend/package.json`, `backend/prisma/schema.prisma`
- **Current Version**: Core Modules Implemented (v3.2+ with Sprint 4 & 5 enhancements)
- **Architecture**: Monolithic Backend API with SPA React Frontend, Database-First Prisma ORM.
- **Technology Stack**:
  - **Frontend**: React (Vite), React Router DOM, Custom UI components.
  - **Backend**: Node.js, Express, TypeScript.
  - **Database**: PostgreSQL, Prisma ORM.
  - **Caching & Sessions**: Redis.
- **Authentication**: JWT-based (Access Token + HttpOnly Refresh Token), MFA (Speakeasy OTP).
- **Authorization**: Custom RBAC (`Role`, `Permission`, `UserRole`, `DataScope`, `PayrollScope`, `AuthGroup`).
- **Directory Structure**:
  - `hris/`: React Frontend.
  - `backend/`: Express TypeScript API.

## 2. Module Inventory
**Confidence Level: HIGH**
**Evidence**: `hris/src/pages/*`, `backend/src/routes/*`, `schema.prisma`
- **Authentication**: `Login.jsx` | `auth.routes.ts` | **Implemented**
- **Dashboard**: `Dashboard.jsx` | `dashboard.routes.ts` | **Partial** (Hardcoded mock data in UI mostly)
- **Organization**: `Organization.jsx` | `department.routes.ts`, `position.routes.ts`, `costcenter.routes.ts`, `headcount.routes.ts` | **Implemented** (Includes Headcount Requests)
- **Employee**: `Employee.jsx` | `employee.routes.ts`, `employeeType.routes.ts` | **Implemented** (Includes EmployeeType linking)
- **Attendance**: `Attendance.jsx` | `attendance.routes.ts` | **Implemented** (Includes automated late minutes tracking)
- **Shift Management**: `ShiftManagement.jsx` | `shift.routes.ts` | **Implemented**
- **Payroll**: `Payroll.jsx` | `payroll.routes.ts` | **Implemented** (Includes multi-currency support and payslip generation)
- **Payroll Config**: `PayrollConfig.jsx` | `payrollConfig.routes.ts`, `payrollComponent.routes.ts` | **Implemented**
- **Settings**: `Settings.jsx` | `settings.routes.ts` | **Implemented** (Includes EmployeeTypes management)
- **Access Control (RBAC)**: `AccessControlModule.jsx` | `rbac.routes.ts`, `authGroup.routes.ts` | **Implemented**
- **Audit Logs**: `AuditLogModule.jsx` | `rbac.routes.ts` | **Implemented**
- **Leave**: `LeaveApproval.jsx`, `LeaveRequest.jsx` | `leave.routes.ts` | **Partial**
- **Overtime (OT)**: Integrated into Shift/Attendance | `ot.routes.ts` | **Implemented**

## 3. Frontend Architecture
**Confidence Level: HIGH**
**Evidence**: `hris/src/App.jsx`, `hris/src/context/`, `hris/src/hooks/`, `hris/src/components/common/`
- **Pages**: 13 Independent Pages mapping to distinct functional domains.
- **Layouts**: Custom `App.jsx` handles main shell and wraps the entire application in a global `ErrorBoundary` for crash protection.
- **Contexts**: `AuthContext.jsx` (auth state), `SettingsContext.jsx`.
- **Hooks**: `usePermission.js` (RBAC guard), `useToast.js`.
- **Components**: Reusable UI library (`SectionHeader`, `Card`, `Tbl`, `Modal`, `Badge`, `Inp`, `Sel`).
- **Routing**: Client-side via `react-router-dom` v6 (`Routes`, `Route`, `Navigate`).
- **State Management**: React `useState`/`useEffect` + Context API. No Redux.
- **API Layer**: Centralized Axios instance (`api.js`) with automatic token injection and `interceptors` for Refresh Token retry flow.

## 4. Backend Architecture
**Confidence Level: HIGH**
**Evidence**: `backend/src/index.ts`, `backend/src/middlewares/`, `backend/src/controllers/`, `backend/src/utils/`
- **Routes**: Mounted in `index.ts`. 21 individual route files separating concerns.
- **Controllers**: Contain substantial business logic, fetching and manipulating data via Prisma (e.g., `payroll.controller.ts`, `attendance.controller.ts`).
- **Services**: Abstracted into utils (`rbac.ts`, `scopeFilter.ts`, `payrollEngine.ts`, `audit.ts`).
- **Middleware**: 
  - `auth.middleware.ts`: `authenticate` (JWT + Blacklist validation), `requirePermission` (RBAC enforcement), `requireMfa`.
- **Validation**: Manual extraction and conditional checks inside controllers.
- **Error Handling**: Standard Express `try/catch` wrapping returning 500/400 JSON responses.
- **Audit Logging**: Handled via `writeAudit()` utility saving asynchronously to `EnterpriseAuditLog` or `AuditLog`.

## 5. Database Architecture (ERD Summary)
**Confidence Level: HIGH**
**Evidence**: `backend/prisma/schema.prisma`
- **Core Models**: `User`, `Role`, `Permission`, `RolePermission`, `UserRole`, `DataScope`, `PayrollScope`, `Employee`, `Department`, `Position`, `CostCenter`, `Shift`, `Attendance`, `Leave`, `OT`, `PayrollRun`, `PayrollRunDetail`, `SystemConfig`, `AuthGroup`, `HeadcountRequest`, `EmployeeType`.
- **Primary Keys**: Integer `id` with `@id @default(autoincrement())`. UUID for `EnterpriseAuditLog`.
- **Relationships**: 
  - Hierarchical: `Department` (via `parentId`).
  - Many-to-Many: Users <-> Roles (`UserRole`), Users <-> AuthGroups (`AuthGroupMember`).
- **Recent Schema Updates**:
  - `Attendance`: Added `lateMinutes`.
  - `PayrollRunDetail`: Added `currency`, `exchangeRate`, `grossLocal`, `netLocal`.
  - `Department`: Added `exchangeRate`.
  - `SystemConfig`: Added `lateThresholdMins`.
  - Added new models for `EmployeeType` and `HeadcountRequest`.

## 6. Organization Architecture
**Confidence Level: HIGH**
**Evidence**: `Department`, `Position`, `CostCenter`, `HeadcountRequest` models. `Organization.jsx`
- **Hierarchy**: Tree structure managed via `parentId` in `Department`. Allows types like Country, Company, Branch, Department, etc.
- **Multi-currency**: Parent departments (Country/Company) store `countryCode`, `currency`, `exchangeRate`, and `timezone` to dictate local payroll contexts.
- **Cost Center**: 1:N mapping (CostCenter -> Departments).
- **Headcount Requests**: Workflow managed via `HeadcountRequest` model linking Dept, Position, and Approvers.

## 7. Employee Architecture
**Confidence Level: HIGH**
**Evidence**: `Employee`, `EmployeeType` models. `employee.controller.ts`
- **Master**: `Employee` table handles personal and HR data.
- **Employee Type**: Links to `EmployeeType` model which defines business rules like `ssoEnabled`, `taxMethod`, `ssoRate`, and `otEligible`.
- **Links**: `deptId`, `posId`, `shiftId`.
- **Document Storage**: Stored as metadata in `EmpDoc` (file upload logic not fully verified as local storage).
- **History**: Logged in `EmpHistory`.

## 8. Attendance Architecture
**Confidence Level: HIGH**
**Evidence**: `Attendance` model. `attendance.controller.ts`
- **Core**: `Attendance` tracking `clockIn`, `clockOut`, `status`, `shiftId`, and `lateMinutes`.
- **Late Tracking**: Fully automated. Calculates `lateMinutes` based on `shift.startTime` plus `SystemConfig.lateThresholdMins` during clock-in.
- **Geofencing / Live Photo**: **NOT IMPLEMENTED YET** (Code relies on simple strings or frontend geolocation without strict backend file enforcement or Haversine validation. Slated for Sprint 6).
- **Corrections**: `AttendanceCorrection` model with manager approval workflow.

## 9. Payroll Architecture
**Confidence Level: HIGH**
**Evidence**: `payroll.controller.ts`, `payrollEngine.ts`
- **Engine**: Generates runs by `period`. Automatically calculates Gross, OT pay, SSO, Tax via `runPayrollEngine()`.
- **Rules Integration**: Injects `SSO_RATE`, `TAX_METHOD`, `SSO_CAP` directly from the `EmployeeType` before processing.
- **Late Deductions**: Engine automatically aggregates `lateMinutes` from `Attendance` and passes it into base variables for component rules to deduct.
- **Multi-currency**: The controller recursively resolves currency by traversing the department tree (`getEmployeeCurrency`), saving local amounts + exchange rates into `PayrollRunDetail`.
- **Payslip**: UI dynamically shows multi-currency formatted payslips (e.g., "฿30,000 THB (1,000 SGD @ 30.0)").

## 10. Access Control Architecture
**Confidence Level: HIGH**
**Evidence**: `auth.middleware.ts`, `schema.prisma`
- **Authentication**: JWT Access Token (15m) + Refresh Token (7d Cookie).
- **MFA**: Supported via `mfaEnabled` flag and Speakeasy TOTP.
- **RBAC**: Multi-layered (`Role` -> `RolePermission` -> `Permission`).
- **AuthGroup**: Secondary mechanism for cross-department data scopes and specific permissions.
- **Data Scope**: Row-level filtering via `DataScope` and `PayrollScope` models.
- **Caching**: User permissions cached via Redis.

## 11. API Inventory
**Confidence Level: HIGH**
**Evidence**: `backend/src/routes/` directory files
- **Auth**: `/api/auth/login`, `/refresh`, `/logout`, `/api/mfa/*`
- **RBAC & Groups**: `/api/rbac/*`, `/api/auth-groups/*`
- **Org**: `/api/departments/*`, `/api/positions/*`, `/api/costcenters/*`
- **Employee & Types**: `/api/employees/*`, `/api/employee-types/*`
- **Time**: `/api/attendance/*`, `/api/shifts/*`, `/api/leave/*`, `/api/ot/*`
- **Payroll**: `/api/payroll/*`, `/api/payroll-config/*`, `/api/payroll-components/*`
- **Headcount**: `/api/headcount/*`
- **Audit**: `/api/rbac/audit-logs`

## 12. Security Architecture
**Confidence Level: HIGH**
**Evidence**: `auth.controller.ts`, `auth.middleware.ts`
- **Flow**: Silent Refresh Token rotation.
- **Revocation**: JWT ID (`jti`) blacklisted in Database `TokenBlacklist` on logout.
- **Audit Logging**: Asynchronous logging to `EnterpriseAuditLog` tracking actor, ip, module, action, and JSON delta.

## 13. Data Flow
**Confidence Level: HIGH**
- **Organization** -> (creates positions/depts) -> **Employee** -> (assigned to shift/dept/type) -> **Attendance** -> (calculates hours/OT/lateMinutes) -> **Payroll** -> (processes rules & currency) -> **Payslip/Bank Export**.
- Implemented and deeply connected.

## 14. Integration Matrix
**Confidence Level: HIGH**
- Organization <-> Employee: **CONNECTED**
- Employee <-> Attendance: **CONNECTED**
- Employee <-> EmployeeType: **CONNECTED**
- Attendance <-> Payroll: **CONNECTED** (via OT and `lateMinutes` aggregation).
- Payroll <-> Organization: **CONNECTED** (via Multi-currency Department inheritance).
- Access Control <-> All Modules: **CONNECTED**

## 15. Current Technical Debt
**Confidence Level: MEDIUM**
- **Live Photo & Geofence Check-in**: **NOT IMPLEMENTED**. Validation is currently bypassed or missing backend file handling (Planned for Sprint 6).
- **Dashboard**: Uses static mock data instead of real-time queries.
- **Controller Bloat**: Business logic in controllers (e.g., recursive currency fetching, late minute calculations) is growing. Moving this logic to dedicated Service classes is recommended.

## 16. Enterprise Gap Analysis
**Confidence Level: HIGH**
- **Organization & Hierarchy**: PASS (Supports multi-branch and multi-currency).
- **Employee Management**: PASS (Supports dynamic typing and SSO/Tax rules).
- **Time & Attendance**: PARTIAL (Lacks strict live photo validation and Haversine geofencing backend validation).
- **Payroll Engine**: PASS (Robust, dynamic formula components, multi-currency support).
- **Access Control & Security**: PASS (Enterprise-grade with Redis and MFA).
- **Auditability**: PASS (Granular EnterpriseAuditLog).