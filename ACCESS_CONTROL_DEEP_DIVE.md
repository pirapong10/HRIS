# Access Control — Deep Dive & Development Specification

> **Project:** PS HRIS Enterprise v3.0  
> **Document:** Access Control Architecture Analysis & Implementation Guide  
> **Date:** 2026-06-24  
> **Status:** Ready for Development

---

## 1. Executive Summary

ระบบ Access Control ของ PS HRIS ออกแบบตามแนวคิด **Role-Based Access Control (RBAC)** แบบ Enterprise ที่มี 3 ชั้น:

```
Layer 1 → Role Hierarchy     (8 roles, level 10–100)
Layer 2 → Permission Matrix  (66 permissions: 11 modules × 6 actions)
Layer 3 → Data Scope         (row-level filtering by dept/costcenter/grade)
```

โครงสร้างนี้มีศักยภาพสูง แต่ **Layer 3 ยังไม่ได้ implement จริง** — นี่คือ gap หลักที่ต้องแก้ไขก่อน production

---

## 2. Current State Analysis

### 2.1 สิ่งที่ทำงานได้แล้ว ✅

| Component | สถานะ | หมายเหตุ |
|:--|:--|:--|
| JWT auth + role loading | ✅ Done | Login embed roles/permissions/level/deptIds ใน JWT |
| requirePermission() middleware | ✅ Done | Check permission code เช่น `employee:view` |
| requireRole() middleware | ✅ Done | Check role code เช่น `SUPER_ADMIN` |
| requireLevel() middleware | ✅ Done | Check hierarchical level |
| Menu visibility (permission-driven) | ✅ Done | NAV array filter ด้วย permission ใน JWT |
| Audit log (login/logout/role changes) | ✅ Done | Track 6 action types |
| DataScope / PayrollScope models | ✅ Done (schema) | มี model แล้ว แต่ไม่ enforce |

### 2.2 สิ่งที่ยังไม่ได้ทำ ❌

| Component | ผลกระทบ | Priority |
|:--|:--|:--|
| DataScope enforcement ที่ Prisma layer | HR Officer เห็นข้อมูลพนักงานทุกแผนก | 🔴 Critical |
| PayrollScope enforcement ที่ Prisma layer | Payroll Officer run payroll เกิน scope | 🔴 Critical |
| RBAC validation ทุก step ของ Approval Workflow | ผู้ไม่มีสิทธิ์อาจ approve ได้ | 🟡 High |
| JWT refresh / rotation | Token ที่ถูก revoke ยังใช้ได้จนหมดอายุ | 🟡 High |
| Audit log ครอบคลุม CRUD ทุก module | ตอนนี้ track แค่ auth + RBAC changes | 🟢 Medium |

---

## 3. RBAC Architecture — รายละเอียด

### 3.1 Role Hierarchy

```
Level 100  SUPER_ADMIN      → ทุก permission, ไม่มีข้อจำกัด
Level  90  SYSTEM_ADMIN     → User/Role management, ไม่มี payroll
Level  80  HR_DIRECTOR      → HR ทุกอย่าง + payroll summary + headcount approval
Level  70  HR_MANAGER       → Employee & attendance เฉพาะ dept ที่ assign
Level  60  PAYROLL_MANAGER  → Run/approve payroll + export bank files
Level  50  PAYROLL_OFFICER  → Calculate payroll เฉพาะ scope ที่กำหนด
Level  40  DEPT_MANAGER     → Own dept: approve leave/OT/attendance
Level  10  EMPLOYEE         → Self-service เท่านั้น
```

**กฎสำคัญของ Role Hierarchy:**
- User สามารถมีได้หลาย Role (multi-role assignment)
- Permission ใช้แบบ **union** — ถ้ามี role ใด role หนึ่งที่ให้ permission นั้น ก็ได้สิทธิ์
- `requireLevel(n)` ตรวจ **highest level** ของ user's roles

### 3.2 Permission Matrix — การ Assign ที่ถูกต้องต่อ Role

ตารางนี้คือ **เป้าหมายการ assign** ที่ควรจะเป็น (ต้องตรวจสอบกับ seed_rbac.js):

| Permission | SUPER | SYS | HR_DIR | HR_MGR | PAY_MGR | PAY_OFF | DEPT_MGR | EMP |
|:--|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| dashboard:view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| organization:view | ✅ | ✅ | ✅ | ✅ | ✅ | - | ✅ | - |
| organization:create/edit | ✅ | ✅ | ✅ | - | - | - | - | - |
| organization:delete | ✅ | ✅ | - | - | - | - | - | - |
| employee:view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | self |
| employee:create/edit | ✅ | ✅ | ✅ | ✅ | - | - | - | - |
| employee:delete | ✅ | ✅ | ✅ | - | - | - | - | - |
| attendance:view | ✅ | - | ✅ | ✅ | - | - | ✅ | self |
| attendance:create | ✅ | - | ✅ | ✅ | - | - | ✅ | ✅ |
| attendance:approve | ✅ | - | ✅ | ✅ | - | - | ✅ | - |
| leave:view | ✅ | - | ✅ | ✅ | - | - | ✅ | self |
| leave:create | ✅ | - | ✅ | ✅ | - | - | - | ✅ |
| leave:approve | ✅ | - | ✅ | ✅ | - | - | ✅ | - |
| payroll:view | ✅ | - | ✅ | - | ✅ | ✅ | - | self |
| payroll:create | ✅ | - | - | - | ✅ | ✅ | - | - |
| payroll:approve | ✅ | - | ✅ | - | ✅ | - | - | - |
| payroll:export | ✅ | - | ✅ | - | ✅ | - | - | - |
| access_control:view | ✅ | ✅ | - | - | - | - | - | - |
| audit_logs:view | ✅ | ✅ | ✅ | - | - | - | - | - |
| settings:view/edit | ✅ | ✅ | - | - | - | - | - | - |

> ⚠️ **Action Item:** ตรวจสอบ `seed_rbac.js` ให้ตรงกับตารางนี้ก่อน deploy

### 3.3 Permission Code Convention

```
{module}:{action}

Modules:  dashboard | organization | employee | attendance | leave
          shift | payroll | reports | settings | access_control | audit_logs

Actions:  view | create | edit | delete | approve | export
```

---

## 4. Security Middleware — รายละเอียดและข้อควรระวัง

### 4.1 Middleware Chain

```
HTTP Request
    │
    ▼
authenticate(req, res, next)
    ├─ ดึง Bearer token จาก Authorization header
    ├─ verify JWT (secret key)
    ├─ ตรวจ isActive ของ user
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
    │       ├─ ตรวจ Math.max(...req.user.levels) >= minLevel
    │       └─ ถ้า fail → 403 Forbidden
    │
    └─ authorize(['admin']) ← LEGACY (ไม่ควรใช้ใหม่)
    │
    ▼
Controller
```

### 4.2 จุดอ่อนของ Middleware ปัจจุบัน

**ปัญหา 1: JWT ไม่มี Revocation**
```
สถานการณ์: Admin ปิด user (isActive: false)
ปัจจุบัน: User ที่ถือ JWT เก่ายังเข้าได้จนกว่า token จะหมดอายุ
```
แนวทางแก้:
```javascript
// Option A: Token Blacklist ใน Redis
// เมื่อ toggle user inactive หรือ logout → เพิ่ม jti ลง blacklist
// middleware ตรวจ blacklist ทุก request

// Option B: Short-lived JWT (15 min) + Refresh Token
// Access token อายุสั้น, Refresh token เก็บใน DB และ revoke ได้
```

**ปัญหา 2: Permission ใน JWT เป็น Snapshot**
```
สถานการณ์: แก้ permission ของ role ขณะที่ user login อยู่
ปัจจุบัน: User ยังมี permission เดิมจนกว่าจะ login ใหม่
แนวทาง: แจ้ง user ให้ logout/login หลัง permission change
         หรือ force refresh token เมื่อ role/permission เปลี่ยน
```

**ปัญหา 3: Legacy `authorize()` ยังมีในโค้ด**
```
ควรทำ: audit ทุก route ที่ใช้ authorize() และเปลี่ยนเป็น requirePermission()
        แล้วลบ authorize() ออกจาก codebase
```

---

## 5. Data Scope — Gap Analysis และ Implementation Plan

### 5.1 ปัญหาปัจจุบัน

```
DataScope และ PayrollScope มีใน database แล้ว แต่:

GET /api/employees
  → employee.controller.ts
  → prisma.employee.findMany({})   ← ไม่มี where clause จาก DataScope!
  
ผลลัพธ์: HR_MANAGER เห็นพนักงานทุกแผนก แม้ DataScope กำหนดให้เห็นแค่ 2 แผนก
```

### 5.2 แนวทาง Implementation

**Step 1: สร้าง Scope Helper Function**

```typescript
// src/utils/scopeFilter.ts

export async function buildEmployeeWhereClause(user: RequestUser) {
  // SUPER_ADMIN / SYSTEM_ADMIN / HR_DIRECTOR → ไม่กรอง
  if (user.level >= 80) return {};

  const scope = await prisma.dataScope.findUnique({
    where: { userId: user.id }
  });

  if (!scope) {
    // ถ้าไม่มี scope → ใช้ deptIds จาก JWT (UserRole.deptIds)
    if (user.deptIds?.length > 0) {
      return { deptId: { in: user.deptIds } };
    }
    // EMPLOYEE → เห็นแค่ตัวเอง
    if (user.level <= 10) {
      return { userId: user.id };
    }
    return {};
  }

  const where: any = {};

  if (scope.departmentIds?.length > 0)
    where.deptId = { in: scope.departmentIds };

  if (scope.employeeTypes?.length > 0)
    where.type = { in: scope.employeeTypes };

  if (scope.jobGrades?.length > 0)
    where.position = { is: { grade: { in: scope.jobGrades } } };

  return where;
}

export async function buildPayrollWhereClause(user: RequestUser) {
  if (user.level >= 80) return {};

  const scope = await prisma.payrollScope.findUnique({
    where: { userId: user.id }
  });

  if (!scope) return { empId: -1 }; // ถ้าไม่มี scope → ไม่เห็นอะไรเลย (safe default)

  const where: any = {};
  if (scope.departments?.length > 0)
    where.employee = { is: { deptId: { in: scope.departments } } };

  return where;
}
```

**Step 2: ใช้ Helper ใน Controller**

```typescript
// employee.controller.ts
export const getEmployees = async (req: Request, res: Response) => {
  const scopeWhere = await buildEmployeeWhereClause(req.user);
  
  const employees = await prisma.employee.findMany({
    where: { 
      status: 'active',
      ...scopeWhere          // ← เพิ่มบรรทัดนี้
    },
    include: { department: true, position: true }
  });

  res.json(employees);
};
```

**Step 3: Endpoints ที่ต้อง Apply Scope**

| Endpoint | Scope Type | หมายเหตุ |
|:--|:--|:--|
| `GET /api/employees` | DataScope | กรอง dept/type/grade |
| `GET /api/employees/:id` | DataScope | ตรวจสิทธิ์ก่อน return |
| `GET /api/attendance` | DataScope | เห็นแค่พนักงานใน scope |
| `GET /api/approvals` | DataScope + Role | DEPT_MANAGER เห็นแค่ dept ตัวเอง |
| `GET /api/employees/:id/payroll` | PayrollScope | |
| `POST /api/payroll/run` | PayrollScope | run ได้แค่พนักงานใน scope |
| `GET /api/rbac/audit-logs` | ไม่กรอง | เห็นทั้งหมด (permission guard แล้ว) |

---

## 6. Approval Workflow + RBAC — Gap Analysis

### 6.1 ปัญหาปัจจุบัน

```
Approval flow ถูก track ใน ApprovalRequest.currentStep
แต่ไม่มีการตรวจสอบว่า approver มี RBAC role ที่ถูกต้องสำหรับ step นั้น
```

### 6.2 Implementation Plan

```typescript
// approval.controller.ts

const APPROVAL_RULES = {
  LEAVE: [
    { step: 1, requiredRole: 'DEPT_MANAGER',  requiredPermission: 'leave:approve' },
    { step: 2, requiredRole: 'HR_MANAGER',    requiredPermission: 'leave:approve' },
  ],
  OT: [
    { step: 1, requiredRole: 'DEPT_MANAGER',  requiredPermission: 'attendance:approve' },
    { step: 2, requiredRole: 'HR_MANAGER',    requiredPermission: 'attendance:approve' },
  ],
  PAYROLL: [
    { step: 1, requiredRole: 'PAYROLL_MANAGER', requiredPermission: 'payroll:approve' },
    { step: 2, requiredRole: 'HR_DIRECTOR',     requiredPermission: 'payroll:approve' },
  ],
  HEADCOUNT: [
    { step: 1, requiredRole: 'HR_MANAGER',   requiredPermission: 'organization:approve' },
    { step: 2, requiredRole: 'HR_DIRECTOR',  requiredPermission: 'organization:approve' },
  ],
};

export const approveRequest = async (req: Request, res: Response) => {
  const { id } = req.params;
  const approver = req.user;

  const request = await prisma.approvalRequest.findUnique({ where: { id } });
  const rules = APPROVAL_RULES[request.type];
  const currentRule = rules.find(r => r.step === request.currentStep);

  // ตรวจ: approver มี role ที่ถูกต้องไหม?
  if (!approver.roles.includes(currentRule.requiredRole)) {
    return res.status(403).json({ 
      error: `Step ${request.currentStep} requires role: ${currentRule.requiredRole}` 
    });
  }

  // ตรวจ: approver มี permission ไหม?
  if (!approver.permissions.includes(currentRule.requiredPermission)) {
    return res.status(403).json({ 
      error: `Missing permission: ${currentRule.requiredPermission}` 
    });
  }

  // ตรวจ: DEPT_MANAGER approve ได้เฉพาะ dept ตัวเองเท่านั้น
  if (currentRule.requiredRole === 'DEPT_MANAGER') {
    const requestDeptId = await getRequestDeptId(request);
    if (!approver.deptIds.includes(requestDeptId)) {
      return res.status(403).json({ error: 'Not your department' });
    }
  }

  // Proceed with approval...
};
```

---

## 7. Audit Log — Expansion Plan

### 7.1 Coverage ปัจจุบัน

```
ตอนนี้ track:  LOGIN_SUCCESS | LOGIN_FAILED | LOGOUT
               PERMISSION_CHANGED | ROLE_ASSIGNED | USER_CREATED
```

### 7.2 ควรเพิ่ม

```typescript
// เพิ่ม action types ใน AuditLog

enum AuditAction {
  // Auth (มีแล้ว)
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED  = 'LOGIN_FAILED',
  LOGOUT        = 'LOGOUT',

  // RBAC (มีแล้ว)
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',
  ROLE_ASSIGNED      = 'ROLE_ASSIGNED',
  USER_CREATED       = 'USER_CREATED',

  // เพิ่มใหม่ — Employee
  EMPLOYEE_CREATED = 'EMPLOYEE_CREATED',
  EMPLOYEE_UPDATED = 'EMPLOYEE_UPDATED',
  EMPLOYEE_DELETED = 'EMPLOYEE_DELETED',

  // เพิ่มใหม่ — Payroll (sensitive)
  PAYROLL_RUN_CREATED  = 'PAYROLL_RUN_CREATED',
  PAYROLL_RUN_APPROVED = 'PAYROLL_RUN_APPROVED',
  PAYROLL_EXPORTED     = 'PAYROLL_EXPORTED',

  // เพิ่มใหม่ — Approval
  APPROVAL_SUBMITTED = 'APPROVAL_SUBMITTED',
  APPROVAL_APPROVED  = 'APPROVAL_APPROVED',
  APPROVAL_REJECTED  = 'APPROVAL_REJECTED',

  // เพิ่มใหม่ — Settings
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
}
```

**Audit Helper ที่ควรสร้าง:**

```typescript
// src/utils/audit.ts

export async function writeAudit(params: {
  userId: string;
  action: AuditAction;
  module: string;
  recordId?: string;
  details: string;
  ipAddress: string;
}) {
  await prisma.auditLog.create({ data: params });
}

// ใช้งานใน controller:
await writeAudit({
  userId: req.user.id,
  action: AuditAction.EMPLOYEE_CREATED,
  module: 'employee',
  recordId: newEmployee.id,
  details: `Created employee ${newEmployee.empCode} - ${newEmployee.name}`,
  ipAddress: req.ip,
});
```

---

## 8. JWT Token Strategy

### 8.1 Payload ปัจจุบัน (ตามที่ Blueprint ระบุ)

```typescript
interface JWTPayload {
  sub: string;           // user.id
  email: string;
  roles: string[];       // ['HR_MANAGER', 'DEPT_MANAGER']
  permissions: string[]; // ['employee:view', 'attendance:view', ...]
  level: number;         // highest role level = 70
  deptIds: string[];     // จาก UserRole.deptIds
  iat: number;
  exp: number;
}
```

### 8.2 แนะนำให้เพิ่ม

```typescript
interface JWTPayload {
  // เพิ่ม:
  jti: string;           // JWT ID สำหรับ revocation
  empId?: string;        // employee record ที่ผูกกับ user (สำหรับ self-service)
}
```

### 8.3 Token Lifetime

```
Access Token:  30 นาที (ตาม Blueprint — session timeout)
Refresh Token: 8 ชั่วโมง (เก็บใน DB, revoke ได้)

หมายเหตุ: ถ้ายังไม่ implement Refresh Token
          ให้ตั้ง expiry 30 นาที และ handle frontend ให้ redirect to login
          เมื่อได้รับ 401
```

---

## 9. Frontend Access Control

### 9.1 Permission Hook (แนะนำให้สร้าง)

```javascript
// hooks/usePermission.js
export function usePermission() {
  const { user } = useAuth();
  
  return {
    can: (permission) => user?.permissions?.includes(permission) ?? false,
    hasRole: (role) => user?.roles?.includes(role) ?? false,
    isLevel: (minLevel) => (user?.level ?? 0) >= minLevel,
  };
}

// ใช้งาน:
const { can, hasRole } = usePermission();

{can('employee:create') && <Btn onClick={openCreateModal}>+ เพิ่มพนักงาน</Btn>}
{hasRole('SUPER_ADMIN') && <DangerZoneSection />}
```

### 9.2 Protected Route Component

```javascript
// components/ProtectedRoute.jsx
export function ProtectedRoute({ permission, role, minLevel, children, fallback = null }) {
  const { can, hasRole, isLevel } = usePermission();

  if (permission && !can(permission)) return fallback;
  if (role && !hasRole(role)) return fallback;
  if (minLevel && !isLevel(minLevel)) return fallback;

  return children;
}

// ใช้งาน:
<ProtectedRoute permission="payroll:approve">
  <ApprovePayrollBtn />
</ProtectedRoute>
```

### 9.3 Self-Service Guard (สำหรับ EMPLOYEE role)

```javascript
// ตรวจสอบว่าเป็นข้อมูลของตัวเอง
function canViewEmployee(currentUser, targetEmpId) {
  if (currentUser.can('employee:view')) return true;           // มี permission ดูได้ทุกคน
  if (currentUser.empId === targetEmpId) return true;          // ดูตัวเองได้
  return false;
}
```

---

## 10. Implementation Roadmap

### Phase 1 — Critical Security Fixes (Sprint 1–2)

| Task | File | Effort |
|:--|:--|:--|
| สร้าง `buildEmployeeWhereClause()` | `src/utils/scopeFilter.ts` | 1 วัน |
| Apply DataScope ใน employee controller | `employee.controller.ts` | 0.5 วัน |
| Apply DataScope ใน attendance controller | `attendance.controller.ts` | 0.5 วัน |
| Apply PayrollScope ใน payroll controller | (payroll controller) | 1 วัน |
| เพิ่ม RBAC validation ใน approval controller | `approval.controller.ts` | 2 วัน |
| ทดสอบ scope enforcement ด้วย seed data | — | 1 วัน |

### Phase 2 — Token & Audit Hardening (Sprint 3)

| Task | File | Effort |
|:--|:--|:--|
| เพิ่ม `jti` + `empId` ใน JWT payload | `auth.controller.ts` | 0.5 วัน |
| สร้าง `writeAudit()` helper | `src/utils/audit.ts` | 0.5 วัน |
| เพิ่ม audit log ใน employee CRUD | `employee.controller.ts` | 1 วัน |
| เพิ่ม audit log ใน payroll actions | payroll controller | 1 วัน |
| Implement Token Blacklist (minimal) | Redis หรือ DB table | 2 วัน |

### Phase 3 — Frontend Hardening (Sprint 4)

| Task | File | Effort |
|:--|:--|:--|
| สร้าง `usePermission()` hook | `hooks/usePermission.js` | 0.5 วัน |
| สร้าง `ProtectedRoute` component | `components/ProtectedRoute.jsx` | 0.5 วัน |
| Audit ทุก action button ใน App.jsx ให้ใช้ permission guard | `App.jsx` | 2 วัน |
| ลบ `authorize()` legacy ออกจากทุก route | routes/*.ts | 1 วัน |

### Phase 4 — Long-term (Backlog)

- Refresh Token mechanism
- Permission caching (Redis) เพื่อลด DB call
- Rate limiting บน auth endpoints
- IP allowlist สำหรับ Admin-level routes

---

## 11. Testing Checklist

ก่อน deploy Access Control ต้องผ่านทุกข้อ:

```
□ HR_MANAGER เห็นพนักงานเฉพาะ dept ที่ assign ไว้ใน DataScope
□ PAYROLL_OFFICER run payroll ได้เฉพาะ scope ที่กำหนด
□ EMPLOYEE เห็นเฉพาะ payslip ของตัวเอง
□ DEPT_MANAGER approve leave ได้เฉพาะ dept ตัวเอง
□ EMPLOYEE ไม่สามารถ approve request ของตัวเองได้
□ User ที่ปิด (isActive: false) ไม่สามารถ login ได้
□ JWT ที่ expire ถูก reject ด้วย 401
□ Route ที่ไม่มี permission guard ถูก reject ด้วย 403
□ Audit log บันทึกทุก payroll action
□ Audit log บันทึกทุก permission change
```

---

## 12. สรุป Gap Priority

```
🔴 Must Fix Before Production
   ├─ DataScope enforcement (row-level filtering)
   └─ PayrollScope enforcement

🟡 Fix in Next Sprint  
   ├─ Approval RBAC validation per step
   └─ JWT revocation on user deactivation

🟢 Improve When Possible
   ├─ Audit log coverage expansion
   ├─ usePermission() hook in frontend
   └─ Remove legacy authorize() middleware
```

---

*เอกสารนี้จัดทำจากการวิเคราะห์ Blueprint v3.0 — อัปเดตทุกครั้งที่มีการเปลี่ยนแปลง Access Control layer*
