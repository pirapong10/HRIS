# System Blueprint (HRIS Enterprise)

> **Last Updated:** 2026-06-25  
> **Version:** 3.2 — Full Security & Refactoring Edition  
> **Companion Doc:** [ACCESS_CONTROL_DEEP_DIVE.md](ACCESS_CONTROL_DEEP_DIVE.md)

---

## 1. System Overview

| Field | Value |
|:--|:--|
| **System Name** | PS HRIS Enterprise |
| **Purpose** | Comprehensive Human Resources Information System for managing organizational hierarchies, employees, attendance, payroll, and security access control |
| **Current Version** | v3.2 · Full Security & Refactoring Edition |
| **Technology Stack** | React SPA (Vite) + Node.js/Express + PostgreSQL/Prisma |
| **Application Type** | Full-Stack Web Application (Client-Server Architecture) |

### Technology Details

| Layer | Technology |
|:--|:--|
| Frontend | React 18, Vite, JSZip, Custom CSS |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL (port 5433) via Prisma ORM v5.11 |
| Auth | JWT (jsonwebtoken), bcrypt password hashing |
| Font | Inter, Segoe UI (system fallback) |

---

## 2. High-Level Architecture

```
Frontend (React SPA — Vite, port 5173)
├─ App.jsx (~200 lines — Routing shell only)
├─ src/pages/
│   ├─ Login.jsx
│   ├─ Dashboard.jsx
│   ├─ Organization.jsx (Departments, Positions, Org Chart, Cost Centers, Headcount)
│   ├─ Employee.jsx
│   ├─ Attendance.jsx (Clock In/Out, Corrections, Leave)
│   ├─ ShiftManagement.jsx (Shifts, Shift Swaps, OT Requests)
│   ├─ Payroll.jsx (Payroll Runs, Payslips, Bank Export)
│   ├─ AccessControlModule.jsx 🛡️ (Users, Roles, Permissions)
│   ├─ AuditLogModule.jsx 📋 (System Audit Trail)
│   └─ Settings.jsx
├─ src/hooks/ (useEmployees, useAttendance — paginated)
├─ src/components/ (ProtectedRoute, Btn, Inp, Sel, Modal, Tbl, Badge, Tabs, SearchableSel)
├─ Design Tokens (C object — brand colors, surfaces)
└─ Axios interceptor (auto-attaches JWT, handles 401 → refresh)

Backend (Express API — port 3000)
├─ Routes
│   ├─ /api/auth       → auth.routes.ts
│   ├─ /api/employees  → employee.routes.ts
│   ├─ /api/departments → department.routes.ts
│   ├─ /api/positions  → position.routes.ts
│   ├─ /api/costcenters → costcenter.routes.ts
│   ├─ /api/attendance → attendance.routes.ts
│   ├─ /api/approvals  → approval.routes.ts
│   └─ /api/rbac       → rbac.routes.ts (NEW)
├─ Controllers (8 files)
│   ├─ auth.controller.ts (login + RBAC permission loading)
│   ├─ employee.controller.ts
│   ├─ department.controller.ts
│   ├─ position.controller.ts
│   ├─ costcenter.controller.ts
│   ├─ attendance.controller.ts
│   ├─ approval.controller.ts
│   └─ rbac.controller.ts (NEW — roles, permissions, users, scopes, audit)
├─ Middleware
│   └─ auth.middleware.ts (authenticate, requirePermission, requireRole, requireLevel)
└─ Prisma ORM → PostgreSQL (hris_db)

Database (PostgreSQL)
├─ Core: User, Employee, Department, Position, CostCenter, Shift
├─ Time: Attendance, AttendanceCorrection, Leave, OT, ShiftSwap
├─ Payroll: PayrollRun, PayrollRunDetail
├─ RBAC: Role, Permission, RolePermission, UserRole, DataScope, PayrollScope
├─ Auth: TokenBlacklist, RefreshToken
├─ Workflow: ApprovalRequest, ApprovalLog, HeadcountRequest
└─ System: AuditLog, Notification, OnboardingTask, EmpDoc, EmpHistory
```

---

## 3. Module Inventory

### 3.1 Authentication Module
| Field | Detail |
|:--|:--|
| **Purpose** | Verify user identity, issue JWT with RBAC claims |
| **Endpoints** | `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, `POST /api/auth/refresh` |
| **Features** | Login, Short-lived Access Token (15 min) + Refresh Token (7d httpOnly cookie), RBAC permission loading into JWT, Session timeout (30 min idle), Audit logging, Token Blacklist (jti-based revocation), Redis permission caching |
| **Key Logic** | On login: loads `UserRole` → `Role` → `RolePermission` → `Permission`, embeds `roles`, `permissions`, `level`, `deptIds`, `jti` into JWT payload. On logout: blacklists `jti`. On deactivate: blacklists all active tokens. |

### 3.2 Organization Module
| Field | Detail |
|:--|:--|
| **Purpose** | Manage hierarchical org structure, positions, and cost centers |
| **Features** | Department CRUD & Soft Delete, Position CRUD with salary bands/grades, Org Chart (CSS Flexbox tree), Head of Dept assignment, Cost Center management, Headcount Requests |
| **Hierarchy** | Company → Division → Department → Section → Team |
| **Permission Guards** | `organization:view`, `organization:create`, `organization:edit`, `organization:delete` |

### 3.3 Employee Module
| Field | Detail |
|:--|:--|
| **Purpose** | Manage employee records, profiles, documents, and onboarding |
| **Features** | Employee list with search/filter, Create/Edit/Delete employees, Emergency contacts, Document management, Employment history, Onboarding tasks |
| **Permission Guards** | `employee:view`, `employee:create`, `employee:edit`, `employee:delete` |

### 3.4 Attendance Module
| Field | Detail |
|:--|:--|
| **Purpose** | Track working hours, leave, and overtime |
| **Features** | Clock In/Out, Attendance corrections, Leave requests, OT requests, Attendance status auto-detection (on-time / late based on shift) |
| **Permission Guards** | `attendance:view`, `attendance:create` |

### 3.5 Shift Management Module
| Field | Detail |
|:--|:--|
| **Purpose** | Configure and manage work shifts |
| **Features** | Shift CRUD, Shift swap requests, OT management, Multi-day scheduling |
| **Permission Guards** | `shift:view`, `shift:create`, `shift:edit`, `shift:delete` |

### 3.6 Payroll Module
| Field | Detail |
|:--|:--|
| **Purpose** | Financial compensation calculation and processing |
| **Features** | Payroll run generation, Gross/Net/Tax/SSO calculation, Thai tax brackets, OT pay computation, Payslip generation (HTML/Print), Provident fund & loan deductions |
| **Permission Guards** | `payroll:view`, `payroll:create`, `payroll:edit`, `payroll:approve`, `payroll:export` |

### 3.7 Access Control Module 🛡️ *(NEW)*
| Field | Detail |
|:--|:--|
| **Purpose** | Enterprise RBAC — manage users, roles, permissions, data scopes |
| **Features** | User listing with role badges, Create users, Assign/revoke roles (multi-select), Toggle user active/inactive, Role listing with permission counts, Permission Matrix (module × action grid), DataScope configuration, PayrollScope configuration |
| **Endpoints** | `GET/POST /api/rbac/users`, `PUT /api/rbac/users/:id/roles`, `PUT /api/rbac/users/:id/toggle`, `GET /api/rbac/roles`, `PUT /api/rbac/roles/:id/permissions`, `GET /api/rbac/permissions`, `PUT /api/rbac/users/:id/data-scope`, `PUT /api/rbac/users/:id/payroll-scope` |
| **Permission Guards** | `access_control:view` (all reads), `SUPER_ADMIN`/`SYSTEM_ADMIN` role required for writes |

### 3.8 Audit Log Module 📋 *(NEW)*
| Field | Detail |
|:--|:--|
| **Purpose** | System-wide audit trail for compliance and security |
| **Features** | Paginated log viewer, Filter by module, Color-coded action badges, Tracks: Login/Logout, Permission changes, Role assignments, User creation |
| **Endpoint** | `GET /api/rbac/audit-logs` |
| **Permission Guards** | `audit_logs:view` |

### 3.9 Settings Module
| Field | Detail |
|:--|:--|
| **Purpose** | System configuration (company info, tax, SSO, payroll settings) |
| **Features** | Company details, Tax/SSO configuration, Payroll settings, Persistent via localStorage |

---

## 4. RBAC Architecture

The RBAC system operates in **3 layers**:

```
Layer 1 → Role Hierarchy     (8 roles, level 10–100)
Layer 2 → Permission Matrix  (66 permissions: 11 modules × 6 actions)
Layer 3 → Data Scope         (row-level filtering by dept/costcenter/grade)
```

> ✅ **Layer 3 (Data Scope + Payroll Scope) is fully enforced at the Prisma query layer.** `buildEmployeeWhereClause()` and `buildPayrollWhereClause()` in `src/utils/scopeFilter.ts`.

### 4.1 Role Hierarchy

| Role | Level | Description | Data Scope |
|:--|:--|:--|:--|
| **SUPER_ADMIN** | 100 | Full system access | ALL |
| **SYSTEM_ADMIN** | 90 | Technical & user management, no payroll | ALL (except payroll data) |
| **HR_DIRECTOR** | 80 | All HR data, payroll summary, headcount approval | ALL employees |
| **HR_MANAGER** | 70 | Employee & attendance management for assigned depts | Assigned departments only |
| **PAYROLL_MANAGER** | 60 | Run & approve payroll, export bank files | Assigned employee groups |
| **PAYROLL_OFFICER** | 50 | Calculate & process payroll for assigned scope | Restricted by type/grade/dept/cost center |
| **DEPT_MANAGER** | 40 | Own dept: approve leave, OT, attendance | Own department only |
| **EMPLOYEE** | 10 | Self-service: own profile, leave/OT request | Self only |

**กฎสำคัญ:**
- User สามารถมีได้หลาย Role (multi-role assignment)
- Permission ใช้แบบ **union** — ถ้ามี role ใด role หนึ่งที่ให้ permission ก็ได้สิทธิ์
- `requireLevel(n)` ตรวจ **highest level** ของ user's roles

### 4.2 Permission Matrix — Role Assignment

11 Modules × 6 Actions = 66 Permissions (defined in `seed_rbac.js`)

| Permission | SUPER | SYS | HR_DIR | HR_MGR | PAY_MGR | PAY_OFF | DEPT_MGR | EMP |
|:--|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| dashboard:view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| organization:view | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | — |
| organization:create/edit | ✅ | ✅ | ✅ | — | — | — | — | — |
| organization:delete | ✅ | ✅ | — | — | — | — | — | — |
| organization:approve | ✅ | — | ✅ | — | — | — | — | — |
| employee:view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | self |
| employee:create/edit | ✅ | ✅ | ✅ | ✅ | — | — | — | — |
| employee:delete | ✅ | ✅ | ✅ | — | — | — | — | — |
| attendance:view | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | self |
| attendance:create/edit | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ |
| attendance:approve | ✅ | — | ✅ | ✅ | — | — | ✅ | — |
| leave:view | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | self |
| leave:create | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ |
| leave:approve | ✅ | — | ✅ | ✅ | — | — | ✅ | — |
| shift:view | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — |
| shift:create/edit | ✅ | ✅ | — | ✅ | — | — | — | — |
| payroll:view | ✅ | — | ✅ | — | ✅ | ✅ | — | self |
| payroll:create/edit | ✅ | — | — | — | ✅ | ✅ | — | — |
| payroll:approve | ✅ | — | ✅ | — | ✅ | — | — | — |
| payroll:export | ✅ | — | ✅ | — | ✅ | — | — | — |
| reports:view/export | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| settings:view/edit | ✅ | ✅ | — | — | — | — | — | — |
| access_control:view | ✅ | ✅ | ✅ | — | — | — | — | — |
| access_control:create/edit/delete | ✅ | ✅ | — | — | — | — | — | — |
| audit_logs:view | ✅ | ✅ | ✅ | — | — | — | — | — |
| audit_logs:export | ✅ | ✅ | — | — | — | — | — | — |

### 4.3 Security Middleware Stack

```
HTTP Request
    │
    ▼
authenticate(req, res, next)
    ├─ ดึง Bearer token จาก Authorization header
    ├─ verify JWT (secret key)
    ├─ embed req.user = { id, email, roles[], permissions[], level, deptIds[] }
    └─ ถ้า fail → 401 Unauthorized
    │
    ▼
[เลือกใช้ middleware ข้อใดข้อหนึ่ง หรือหลายข้อ]
    │
    ├─ requirePermission('module:action')
    │       ├─ ตรวจ req.user.permissions.includes(code)
    │       └─ ถ้า fail → 403 Forbidden
    │
    ├─ requireRole(['ROLE_CODE', ...])
    │       ├─ ตรวจ req.user.roles overlap กับ allowed list
    │       └─ ถ้า fail → 403 Forbidden
    │
    ├─ requireLevel(minLevel)
    │       ├─ ตรวจ user.level >= minLevel
    │       └─ ถ้า fail → 403 Forbidden
    │
    └─ authorize(['admin']) ← LEGACY (ไม่ควรใช้ใหม่ — ให้ลบออก)
    │
    ▼
Controller
```

### 4.3.1 JWT Token Payload

```typescript
interface JWTPayload {
  id: number;            // user.id
  email: string;
  role: string;          // legacy field
  roles: string[];       // ['HR_MANAGER', 'DEPT_MANAGER']
  permissions: string[]; // ['employee:view', 'attendance:view', ...]
  level: number;         // highest role level (e.g. 70)
  deptIds: number[];     // จาก UserRole.deptIds (JSON parsed)
  empId: number | null;  // linked employee record
  iat: number;
  exp: number;           // 1 day (24h)
}
```

**ข้อจำกัดของ JWT ปัจจุบัน:**
- ไม่มี `jti` สำหรับ revocation — user ที่ถูก deactivate ยังใช้ token เดิมได้จนหมดอายุ
- Permissions เป็น snapshot — แก้ permission ขณะ login อยู่จะไม่เห็นผลจนกว่า re-login

### 4.3.2 Known Security Gaps

| Gap | Severity | Status |
|:--|:--|:--|
| DataScope ไม่ enforce ที่ Prisma query layer | 🔴 Critical | ✅ Implemented |
| PayrollScope ไม่ enforce ที่ Prisma query layer | 🔴 Critical | ✅ Implemented |
| Approval workflow ไม่ validate RBAC role per step | 🟡 High | ✅ Implemented |
| JWT ไม่มี revocation (blacklist/refresh token) | 🟡 High | ✅ Implemented |
| Audit log ไม่ครอบคลุม CRUD ทุก module | 🟢 Medium | ✅ Implemented |
| Legacy `authorize()` ยังมีในโค้ด | 🟢 Medium | ✅ Removed from codebase |

### 4.4 Data Scope Model

| Field | Type | Purpose |
|:--|:--|:--|
| departmentIds | JSON array | Restrict visibility to specific departments |
| costCenterIds | JSON array | Restrict by cost center |
| employeeTypes | JSON array | fulltime, parttime, daily, etc. |
| jobGrades | JSON array | E1, E2, M3, etc. |

### 4.5 Payroll Scope Model

| Field | Type | Purpose |
|:--|:--|:--|
| employeeTypes | JSON array | Which employee types the officer can process |
| grades | JSON array | Which job grades |
| departments | JSON array | Which departments |
| costCenters | JSON array | Which cost centers |

### 4.6 Menu Visibility

Navigation items are **permission-driven** (not hardcoded to role strings):

```javascript
const NAV = [
  { id: "dashboard",      permission: "dashboard:view" },
  { id: "organization",   permission: "organization:view" },
  { id: "employees",      permission: "employee:view" },
  { id: "attendance",     permission: "attendance:view" },
  { id: "shifts",         permission: "shift:view" },
  { id: "payroll",        permission: "payroll:view" },
  { id: "access_control", permission: "access_control:view" },
  { id: "audit_logs",     permission: "audit_logs:view" },
  { id: "settings",       permission: "settings:view" },
];
```

### 4.7 Approval Authority

| Request Type | Flow | RBAC Validation |
|:--|:--|:--|
| Leave | Employee → Dept Manager → HR Manager | Step 1: `DEPT_MANAGER` + `leave:approve`, Step 2: `HR_MANAGER` + `leave:approve` |
| Attendance Correction | Employee → Dept Manager → HR Manager | Step 1: `DEPT_MANAGER` + `attendance:approve`, Step 2: `HR_MANAGER` + `attendance:approve` |
| OT Request | Employee → Dept Manager → HR Manager | Step 1: `DEPT_MANAGER` + `attendance:approve`, Step 2: `HR_MANAGER` + `attendance:approve` |
| Payroll | Payroll Officer → Payroll Manager → HR Director | Step 1: `PAYROLL_MANAGER` + `payroll:approve`, Step 2: `HR_DIRECTOR` + `payroll:approve` |
| Headcount | Dept Manager → HR Manager → HR Director | Step 1: `HR_MANAGER` + `organization:approve`, Step 2: `HR_DIRECTOR` + `organization:approve` |

> ⚠️ **Status:** Approval steps are tracked in `ApprovalRequest.currentStep` and RBAC role validation per step is **enforced**.

---

## 5. Navigation Structure

```
App (Root)
├─ LoginPage (if !user)
└─ MainApp (if user)
    ├─ Sidebar Navigation (permission-filtered)
    │   ├─ 🏠 Dashboard
    │   ├─ 🏢 Organization
    │   │   ├─ Departments (tab: dept)
    │   │   ├─ Positions (tab: pos)
    │   │   ├─ Org Chart (tab: chart)
    │   │   ├─ Cost Centers (tab: cost)
    │   │   └─ Headcount Request (tab: headcount)
    │   ├─ 👥 Employees
    │   ├─ ⏰ Time & Attendance
    │   │   ├─ Clock In/Out
    │   │   ├─ Leave Management
    │   │   └─ Attendance Corrections
    │   ├─ 🔄 Shift Management
    │   │   ├─ Shifts
    │   │   ├─ Shift Swaps
    │   │   └─ OT Requests
    │   ├─ 💰 Payroll
    │   │   ├─ Payroll Runs
    │   │   └─ Payslips
    │   ├─ 🛡️ Access Control (NEW)
    │   │   ├─ Users (tab: users)
    │   │   └─ Roles & Permissions (tab: roles)
    │   ├─ 📋 Audit Logs (NEW)
    │   ├─ ⚙️ Settings
    │   └─ 🔔 Notification Center
    └─ Session Timeout (30 min idle → auto-logout)
```

---

## 6. Data Models (22 Prisma Models)

### Core Models

| Model | Key Fields | Used By |
|:--|:--|:--|
| **User** | id, email, password, role (legacy), isActive, empId | Auth, RBAC |
| **Employee** | id, empCode, name, deptId, posId, shiftId, salary, type, status | All modules |
| **Department** | id, code, name, type, parentId, headId, costCenterId, status | Org, Employee |
| **Position** | id, code, name, deptId, level, grade, salary, salaryMin/Max, approvedHeadcount, status | Org, Employee |
| **CostCenter** | id, code, name, budget, fiscalYear | Org |
| **Shift** | id, name, startTime, endTime, breakMins, days, otRate, otRateHoliday, color | Attendance |

### RBAC Models *(NEW)*

| Model | Key Fields | Purpose |
|:--|:--|:--|
| **Role** | id, code, name, level, isSystem | 8 hierarchical roles |
| **Permission** | id, module, action, code | 66 module:action permissions |
| **RolePermission** | roleId, permissionId | Many-to-many role↔permission mapping |
| **UserRole** | userId, roleId, deptIds | Assigns roles to users (with optional dept scope) |
| **DataScope** | userId, departmentIds, costCenterIds, employeeTypes, jobGrades | Restricts data visibility |
| **PayrollScope** | userId, employeeTypes, grades, departments, costCenters | Restricts payroll access |

### Time & Attendance Models

| Model | Key Fields |
|:--|:--|
| **Attendance** | empId, date, clockIn, clockOut, status, shiftId, locationIn/Out |
| **AttendanceCorrection** | empId, date, correctIn/Out, reason, status, approver |
| **Leave** | empId, type, startDate, endDate, days, reason, status |
| **OT** | empId, date, shiftId, requestedHours, isHoliday, status |
| **ShiftSwap** | reqEmpId, targetEmpId, date, reason, status |

### Payroll Models

| Model | Key Fields |
|:--|:--|
| **PayrollRun** | period, runDate, totalGross/Net/Tax/Sso, status, approvedBy |
| **PayrollRunDetail** | payrollRunId, empId, gross, otPay, baseSalary, tax, sso, providentFund, loan, net |

### Workflow & System Models

| Model | Key Fields |
|:--|:--|
| **ApprovalRequest** | type (LEAVE/OT/CORRECTION/SWAP/HEADCOUNT), referenceId, requesterId, status, currentStep |
| **ApprovalLog** | approvalRequestId, approverId, action, comment |
| **HeadcountRequest** | deptId, posId, quantity, reason, status |
| **AuditLog** | userId, action, module, recordId, details, ipAddress, createdAt |
| **Notification** | userId, title, message, type, isRead |
| **EmpDoc** | empId, name, type, size, date |
| **EmpHistory** | empId, date, type, oldVal, newVal, remark |
| **OnboardingTask** | empId, title, category, isCompleted |

---

## 7. API Routes

| Route Group | Method | Path | Permission Guard |
|:--|:--|:--|:--|
| **Auth** | POST | `/api/auth/login` | Public |
| | GET | `/api/auth/me` | `authenticate` |
| | POST | `/api/auth/logout` | `authenticate` |
| | POST | `/api/auth/refresh` | httpOnly cookie |
| **Employees** | GET | `/api/employees` | `employee:view` |
| | POST | `/api/employees` | `employee:create` |
| | PUT | `/api/employees/:id` | `employee:edit` |
| | DELETE | `/api/employees/:id` | `employee:delete` |
| **Departments** | GET | `/api/departments` | `organization:view` |
| | POST | `/api/departments` | `organization:create` |
| | PUT | `/api/departments/:id` | `organization:edit` |
| | DELETE | `/api/departments/:id` | `organization:delete` |
| **Positions** | GET | `/api/positions` | `organization:view` |
| | POST | `/api/positions` | `organization:create` |
| | PUT | `/api/positions/:id` | `organization:edit` |
| | DELETE | `/api/positions/:id` | `organization:delete` |
| **Cost Centers** | GET | `/api/costcenters` | `organization:view` |
| | POST | `/api/costcenters` | `organization:create` |
| **Attendance** | GET | `/api/attendance` | `attendance:view` |
| | POST | `/api/attendance/clock-in` | `attendance:create` |
| | POST | `/api/attendance/clock-out` | `attendance:create` |
| **Approvals** | GET | `/api/approvals` | `leave:view` |
| | POST | `/api/approvals` | `leave:create` |
| | POST | `/api/approvals/:id/approve` | `leave:approve` |
| **RBAC** | GET | `/api/rbac/roles` | `access_control:view` |
| | GET | `/api/rbac/roles/:id` | `access_control:view` |
| | PUT | `/api/rbac/roles/:id/permissions` | Role: SUPER_ADMIN / SYSTEM_ADMIN |
| | GET | `/api/rbac/permissions` | `access_control:view` |
| | GET | `/api/rbac/users` | `access_control:view` |
| | POST | `/api/rbac/users` | Role: SUPER_ADMIN / SYSTEM_ADMIN |
| | PUT | `/api/rbac/users/:id/roles` | Role: SUPER_ADMIN / SYSTEM_ADMIN / HR_DIRECTOR |
| | PUT | `/api/rbac/users/:id/toggle` | Role: SUPER_ADMIN / SYSTEM_ADMIN |
| | PUT | `/api/rbac/users/:id/data-scope` | Role: SUPER_ADMIN / HR_DIRECTOR |
| | PUT | `/api/rbac/users/:id/payroll-scope` | Role: SUPER_ADMIN / PAYROLL_MANAGER / HR_DIRECTOR |
| | GET | `/api/rbac/audit-logs` | `audit_logs:view` |
| **Health** | GET | `/health` | Public |

---

## 8. Audit Log Format

Every security-relevant action is recorded with:

| Field | Description |
|:--|:--|
| userId | Who performed the action |
| action | LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, PERMISSION_CHANGED, ROLE_ASSIGNED, USER_CREATED, CREATE, UPDATE, DELETE |
| module | auth, employee, organization, attendance, payroll, access_control, settings |
| recordId | The affected record ID |
| details | Human-readable description |
| ipAddress | Client IP address |
| createdAt | Timestamp |

---

## 9. Business Rules

### Department Rules
- Must have unique `code`
- Soft delete (status → inactive)
- Cannot delete if any active employee is assigned
- Hierarchical types: Company → Division → Department → Section → Team
- One employee can be Head of multiple departments

### Position Rules
- Must have unique `code`
- Cannot delete if active employees hold the position
- Soft delete appends `_deleted_[timestamp]` to release code
- Supports salary bands (salaryMin, salaryMax) and job grades

### Access Rules
- All routes require valid JWT (except `/api/auth/login`, `/api/auth/refresh`, and `/health`)
- All API routes enforce `requirePermission()` middleware
- Menu visibility is driven by permissions embedded in JWT claims
- Session auto-expires after 30 minutes of idle activity
- Suspended users are blocked from login (`isActive: false`)
- PayrollScope enforced at Prisma query layer via `buildPayrollWhereClause()` in `scopeFilter.ts`
- DataScope enforced for employees and attendance via `buildEmployeeWhereClause()`
- JWT uses short-lived access token (15 min) + revocable refresh token (7 days, httpOnly cookie)
- Deactivated users have tokens immediately blacklisted via `jti` in `TokenBlacklist` table

---

## 10. Dependency Map

```
User ─────── UserRole ───── Role ───── RolePermission ───── Permission
  │              └── deptIds (JSON)
  ├── DataScope
  ├── PayrollScope
  └── AuditLog

Department ← parentId (self-referencing hierarchy)
  ├── headId → Employee
  ├── costCenterId → CostCenter
  ├── → Position (deptId)
  └── → Employee (deptId)

Employee ──→ Department, Position, Shift
  ├── Attendance
  ├── Leave, OT, ShiftSwap
  ├── PayrollRunDetail
  ├── ApprovalRequest
  └── EmpDoc, EmpHistory, OnboardingTask
```

---

## 11. Seed Scripts

| Script | Purpose |
|:--|:--|
| `seed_company.js` | Full reset + seed: 10 departments (hierarchical), 11 positions, 13 employees, 1 shift |
| `seed_rbac.js` | Seeds 8 roles, 66 permissions, role-permission mappings |
| `setup_admin.js` | Creates admin user (`admin@ps-trading.com`) and assigns SUPER_ADMIN role |

---

## 12. Technical Debt

| ID | Severity | Description |
|:--|:--|:--|
| TD-1 | 🔴 High | ✅ Resolved: Frontend separated into modules, routing, state, and components |
| TD-2 | 🟡 Medium | ✅ Resolved: DataScope and PayrollScope backend enforcement implemented |
| TD-3 | 🔴 High | ✅ Resolved: PayrollScope fully enforced at Prisma query layer |
| TD-4 | 🟢 Low | ✅ Resolved: Approval workflow RBAC enforced |
| TD-5 | 🟡 Medium | ✅ Resolved: JWT revocation (Token Blacklist) implemented |
| TD-6 | 🟡 Medium | ✅ Resolved: Audit log coverage extended to all CRUD operations |
| TD-7 | 🟡 Medium | ✅ Resolved: UI components extracted into separate files |
| TD-8 | 🟡 Medium | ✅ Resolved: Server-side Pagination implemented on major endpoints |
| TD-9 | 🟢 Low | ✅ Resolved: Legacy `user.role` field removed from schema |
| TD-10 | 🟢 Low | ✅ Resolved: Legacy `UserMgmt` component completely deleted |
| TD-11 | 🟢 Low | ✅ Resolved: Legacy `authorize()` middleware deleted |

---

## 13. Known Limitations

- **Data Scope Enforcement (Backend):** ✅ RESOLVED. `DataScope` and `PayrollScope` are fully implemented at the Prisma layer.
- **JWT Snapshot Problem:** ✅ RESOLVED. Redis caching and permission invalidation implemented.
- **No JWT Revocation:** ✅ RESOLVED. Revocable refresh tokens and Token Blacklist implemented.
- **Frontend-Backend Sync:** ✅ RESOLVED. Server-side pagination implemented for large lists.
- **Error Boundary Missing:** React errors in sub-components crash the entire monolithic App
- **No Real-time Updates:** Changes by other users are not pushed (no WebSocket / SSE)
- **Approval Workflow:** ✅ RESOLVED. Multi-step approval chain status is tracked and RBAC role validation per step is enforced.
- **Frontend Permission Guards:** ✅ RESOLVED. Action buttons are strictly guarded by `hasPerm()`.

---

## 14. System Statistics

| Metric | Count |
|:--|:--|
| **Total Major Modules** | 9 (Auth, Org, Employee, Attendance, Shift, Payroll, Access Control, Audit Logs, Settings) |
| **Total Database Models** | 24 (schema.prisma — added TokenBlacklist, RefreshToken) |
| **Total API Route Groups** | 8 (/auth, /employees, /departments, /positions, /costcenters, /attendance, /approvals, /rbac) |
| **Total RBAC Roles** | 8 (SUPER_ADMIN → EMPLOYEE) |
| **Total Permissions** | 66 (11 modules × 6 actions) |
| **Total Backend Controllers** | 8 |
| **Total Backend Routes Files** | 8 |
| **Frontend Lines (App.jsx)** | ~201 (routing shell — modules extracted to src/pages/) |
| **Seeded Employees** | 13 |
| **Seeded Departments** | 10 (3-level hierarchy) |
| **Seeded Positions** | 11 |

---

## 15. Implementation Roadmap

> จาก [ACCESS_CONTROL_DEEP_DIVE.md](ACCESS_CONTROL_DEEP_DIVE.md)

### Phase 1 — Critical Security Fixes (Sprint 1–2)

| Task | Target File | Effort | Status |
|:--|:--|:--|:--|
| สร้าง `buildEmployeeWhereClause()` | `src/utils/scopeFilter.ts` | 1 วัน | ✅ Done |
| Apply DataScope ใน employee controller | `employee.controller.ts` | 0.5 วัน | ✅ Done |
| Apply DataScope ใน attendance controller | `attendance.controller.ts` | 0.5 วัน | ✅ Done |
| Apply PayrollScope ใน payroll controller | payroll controller | 1 วัน | ✅ Done |
| เพิ่ม RBAC validation ใน approval controller | `approval.controller.ts` | 2 วัน | ✅ Done |
| ทดสอบ scope enforcement ด้วย seed data | — | 1 วัน | ✅ Done |

### Phase 2 — Token & Audit Hardening (Sprint 3)

| Task | Target File | Effort | Status |
|:--|:--|:--|:--|
| เพิ่ม `jti` + `empId` ใน JWT payload | `auth.controller.ts` | 0.5 วัน | ✅ Done |
| สร้าง `writeAudit()` helper | `src/utils/audit.ts` | 0.5 วัน | ✅ Done |
| เพิ่ม audit log ใน employee CRUD | `employee.controller.ts` | 1 วัน | ✅ Done |
| เพิ่ม audit log ใน payroll actions | payroll controller | 1 วัน | ✅ Done |
| Implement Token Blacklist (minimal) | Redis หรือ DB table | 2 วัน | ✅ Done |

### Phase 3 — Frontend Hardening (Sprint 4)

| Task | Target File | Effort | Status |
|:--|:--|:--|:--|
| สร้าง `usePermission()` hook | `hooks/usePermission.js` | 0.5 วัน | ✅ |
| สร้าง `ProtectedRoute` component | `components/ProtectedRoute.jsx` | 0.5 วัน | ✅ |
| Audit ทุก action button ใน App.jsx ให้ใช้ permission guard | `App.jsx` | 2 วัน | ✅ |
| ลบ `authorize()` legacy ออกจาก codebase | `auth.middleware.ts` | 0.5 วัน | ✅ |

### Phase 4 — Long-term (Backlog)

- ✅ Refresh Token mechanism (short-lived access + revocable refresh)
- ✅ Permission caching (Redis) เพื่อลด DB call
- ✅ Rate limiting บน auth endpoints
- [ ] IP allowlist สำหรับ Admin-level routes
- ✅ Frontend component splitting (extract from monolithic App.jsx)

---

## 16. Testing Checklist

ก่อน deploy Access Control ต้องผ่านทุกข้อ:

- [x] HR_MANAGER เห็นพนักงานเฉพาะ dept ที่ assign ไว้ใน DataScope
- [x] PAYROLL_OFFICER run payroll ได้เฉพาะ scope ที่กำหนด
- [x] EMPLOYEE เห็นเฉพาะ payslip ของตัวเอง
- [x] DEPT_MANAGER approve leave ได้เฉพาะ dept ตัวเอง
- [x] EMPLOYEE ไม่สามารถ approve request ของตัวเองได้
- [x] User ที่ปิด (isActive: false) ไม่สามารถ login ได้
- [x] JWT ที่ expire ถูก reject ด้วย 401
- [x] Route ที่ไม่มี permission guard ถูก reject ด้วย 403
- [x] Audit log บันทึกทุก payroll action
- [x] Audit log บันทึกทุก permission change