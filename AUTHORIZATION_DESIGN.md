# HRIS Enterprise — Authorization Design
> Version: 1.0 · Based on codebase audit 2026-06-25
> Stack: Express/TypeScript + Prisma + PostgreSQL + Redis

---

## 1. ภาพรวม Authorization Architecture

ระบบมี **4 Layer** ที่ทำงานซ้อนกัน:

```
Request
  │
  ▼
Layer 1: Authentication      ← ตรวจ JWT valid + not blacklisted + user active
  │
  ▼
Layer 2: Permission Guard    ← ตรวจ permission code (e.g. employee:view)
  │
  ▼
Layer 3: Data Scope          ← กรอง query ตาม DataScope / PayrollScope
  │
  ▼
Layer 4: Record Ownership    ← ตรวจว่า record นั้นเป็นของ user หรือเปล่า
  │
  ▼
Response
```

---

## 2. Layer 1 — Authentication (ครบแล้ว ✅)

### สิ่งที่มีอยู่
```typescript
// auth.middleware.ts — authenticate()
1. ตรวจ Bearer token จาก Authorization header
2. verify JWT signature
3. ตรวจ jti ใน TokenBlacklist (revoked tokens)
4. ตรวจ user.isActive จาก DB (instant deactivation)
5. inject req.user = decoded JWT payload
```

### JWT Payload ปัจจุบัน
```typescript
{
  jti: string,        // unique token ID สำหรับ revocation
  id: number,         // userId
  email: string,
  roles: string[],    // ['HR_MANAGER']
  permissions: string[], // ['employee:view', 'employee:edit']
  level: number,      // 60
  deptIds: number[],  // [1, 2]
  empId: number | null
}
```

### Gap ที่พบ 🔴
| # | ปัญหา | ผลกระทบ |
|:--|:--|:--|
| A1 | `payroll.routes.ts` line 11: ขาด `authenticate` ก่อน `requirePermission` | PAYROLL_RUN endpoint ไม่ verify JWT |
| A2 | Refresh Token check ไม่มีใน `authenticate` — ใช้แค่ access token | หาก access token leak ไม่มีทางรู้ |
| A3 | JWT_SECRET fallback เป็น hardcode string | Dev secret อาจรั่วขึ้น production |

---

## 3. Layer 2 — Permission Guard (ครบแล้ว ✅ มี gap เล็กน้อย)

### Permission Matrix ปัจจุบัน (66 permissions)

| Module | view | create | edit | delete | approve | export |
|:--|:--:|:--:|:--:|:--:|:--:|:--:|
| dashboard | ✅ | - | - | - | - | - |
| organization | ✅ | ✅ | ✅ | ✅ | - | - |
| employee | ✅ | ✅ | ✅ | ✅ | - | - |
| attendance | ✅ | ✅ | ✅ | ✅ | - | - |
| leave | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| shift | ✅ | ✅ | ✅ | ✅ | - | - |
| payroll | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| reports | ✅ | - | - | - | - | ✅ |
| settings | ✅ | ✅ | ✅ | ✅ | - | - |
| access_control | ✅ | ✅ | ✅ | ✅ | - | - |
| audit_logs | ✅ | - | - | - | - | ✅ |

### Role Hierarchy (8 Roles)

| Role | Level | Bypass |
|:--|:--|:--|
| SUPER_ADMIN | 100 | ทุก permission check |
| SYSTEM_ADMIN | 90 | ทุก permission check |
| HR_DIRECTOR | 80 | DataScope + PayrollScope |
| HR_MANAGER | 60 | - |
| PAYROLL_MANAGER | 65 | - |
| PAYROLL_OFFICER | 55 | - |
| DEPT_MANAGER | 50 | - |
| EMPLOYEE | 10 | - |

### Gap ที่พบ 🟡
| # | ปัญหา | ผลกระทบ |
|:--|:--|:--|
| B1 | `leave.routes.ts` ไม่มี `leave:delete` endpoint | ลบ leave ไม่ได้หรือไม่มี route เลย |
| B2 | `attendance.routes.ts` ไม่มี correction endpoints ใน grep output | AttendanceCorrection อาจไม่มี permission guard |
| B3 | OT routes ไม่ปรากฏใน grep เลย | OT endpoints อาจขาด requirePermission |
| B4 | ShiftSwap routes ไม่ปรากฏใน grep เลย | ShiftSwap endpoints อาจขาด requirePermission |
| B5 | SUPER_ADMIN bypass เช็คแค่ `roles.includes('SUPER_ADMIN')` ใน requirePermission แต่ไม่ bypass ใน requireLevel | อาจ inconsistent |

---

## 4. Layer 3 — Data Scope (ส่วนใหญ่ครบ ✅)

### DataScope — Employee/Attendance
```typescript
// buildEmployeeWhereClause() — scopeFilter.ts
level >= 80  → {} (ไม่กรอง)
level <= 10  → { id: empId } (เห็นแค่ตัวเอง)
มี DataScope  → filter by departmentIds, employeeTypes, jobGrades
ไม่มี scope  → ใช้ deptIds จาก JWT (UserRole.deptIds)
ไม่มีทั้งคู่  → { id: -1 } (ไม่เห็นอะไร)
```

### PayrollScope
```typescript
// buildPayrollWhereClause() — scopeFilter.ts
level >= 80  → GLOBAL (ไม่กรอง)
level <= 10  → RESTRICTED to self
มี scope    → filter by departments
ไม่มี scope  → DENIED
```

### Gap ที่พบ 🔴
| # | ปัญหา | ผลกระทบ |
|:--|:--|:--|
| C1 | Leave controller — ไม่รู้ว่าใช้ `buildEmployeeWhereClause()` หรือเปล่า | HR_MANAGER อาจเห็น leave ทุกคน |
| C2 | Attendance correction — ไม่รู้ว่ามี scope filter | เหมือน C1 |
| C3 | OT controller — ไม่รู้ว่ามี scope filter | เหมือน C1 |
| C4 | `buildEmployeeWhereClause()` ไม่รองรับ `groupIds` (feature ใหม่ Employee Group) | เตรียมไว้ก่อน |
| C5 | `costCenterIds` มีใน DataScope schema แต่ `buildEmployeeWhereClause()` ไม่ได้ใช้มัน | DataScope ไม่ครบ |

---

## 5. Layer 4 — Record Ownership (ยังขาด 🔴)

### คืออะไร
ตรวจว่า record ที่ขอดู/แก้ เป็นของ user ที่ request จริงหรือเปล่า เช่น EMPLOYEE ขอดู payslip ของคนอื่น — Layer 2 อนุญาต (`payroll:view`) แต่ Layer 3 กรอง Scope แล้ว แต่ถ้า EMPLOYEE ยิง `GET /api/employees/999` โดยตรง — Layer 3 ไม่ช่วยเพราะ query by id ไม่ใช่ findMany

### Gap ที่พบ 🔴
| # | ปัญหา | ผลกระทบ |
|:--|:--|:--|
| D1 | `GET /api/employees/:id` ไม่ตรวจ ownership | EMPLOYEE ดูข้อมูลคนอื่นได้ถ้าเดา id ถูก |
| D2 | `GET /api/payroll/details/:id` ไม่ตรวจว่า payslip นั้นเป็นของ user | เหมือน D1 |
| D3 | Leave / OT / AttendanceCorrection `GET /:id` ไม่ตรวจ ownership | เหมือน D1 |

### วิธีแก้ — Ownership Middleware
```typescript
// เพิ่มใน auth.middleware.ts
export const requireOwnershipOrScope = (
  model: 'employee' | 'payroll' | 'leave' | 'ot',
  empIdField: string = 'empId'
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    
    // SUPER_ADMIN / HR_DIRECTOR bypass
    if (req.user.level >= 80) return next();
    
    // EMPLOYEE → ต้องเป็น record ของตัวเอง
    if (req.user.level <= 10) {
      const record = await prisma[model].findUnique({ 
        where: { id: parseInt(req.params.id) } 
      });
      if (!record || record[empIdField] !== req.user.empId) {
        return res.status(403).json({ message: 'Forbidden: Not your record' });
      }
    }
    next();
  };
};
```

---

## 6. สรุป Gaps ทั้งหมด — Priority

### 🔴 Critical (ควรแก้ทันที)

| # | Gap | File | Fix |
|:--|:--|:--|:--|
| A1 | payroll run ขาด `authenticate` | `payroll.routes.ts:11` | เพิ่ม `authenticate,` ก่อน `requirePermission` |
| D1 | `GET /api/employees/:id` ไม่ตรวจ ownership | `employee.routes.ts` | เพิ่ม ownership check |
| D2 | Payroll detail ไม่ตรวจ ownership | `payroll.routes.ts` | เพิ่ม ownership check |

### 🟡 Important (ควรแก้ใน sprint ถัดไป)

| # | Gap | Fix |
|:--|:--|:--|
| B2 | Attendance correction ขาด permission guard | ตรวจและเพิ่ม requirePermission |
| B3 | OT routes ขาด permission guard | ตรวจและเพิ่ม requirePermission |
| B4 | ShiftSwap routes ขาด permission guard | ตรวจและเพิ่ม requirePermission |
| C1 | Leave scope filter | ใช้ buildEmployeeWhereClause() |
| C2 | Attendance correction scope | ใช้ buildEmployeeWhereClause() |
| C3 | OT scope filter | ใช้ buildEmployeeWhereClause() |
| C5 | costCenterIds ไม่ถูกใช้ใน scopeFilter | เพิ่ม costCenter filter |
| D3 | Leave/OT/Correction ownership | เพิ่ม requireOwnershipOrScope |

### 🟢 Backlog

| # | Gap | Fix |
|:--|:--|:--|
| A2 | Refresh token rotation | เพิ่ม used token detection |
| A3 | JWT_SECRET hardcode fallback | enforce env var, throw ถ้าไม่มี |
| B5 | SUPER_ADMIN bypass inconsistency | normalize ใน requireLevel |
| C4 | groupIds ใน DataScope | ทำพร้อม Employee Group feature |

---

## 7. Authorization Matrix ที่สมบูรณ์

### Employee Module
| Endpoint | Auth | Permission | Scope | Ownership |
|:--|:--|:--|:--|:--|
| GET /employees | ✅ | employee:view | ✅ buildEmployee | N/A (list) |
| POST /employees | ✅ | employee:create | - | - |
| GET /employees/:id | ✅ | employee:view | - | 🔴 ขาด |
| PUT /employees/:id | ✅ | employee:edit | - | 🔴 ขาด |
| DELETE /employees/:id | ✅ | employee:delete | - | - |

### Payroll Module
| Endpoint | Auth | Permission | Scope | Ownership |
|:--|:--|:--|:--|:--|
| POST /payroll/run | 🔴 ขาด auth | payroll:create | ✅ buildPayroll | - |
| GET /payroll | ✅ | payroll:view | ✅ buildPayroll | - |
| GET /payroll/:id | ✅ | payroll:view | - | 🔴 ขาด |
| POST /payroll/approve | ✅ | payroll:approve | - | - |

### Leave Module
| Endpoint | Auth | Permission | Scope | Ownership |
|:--|:--|:--|:--|:--|
| GET /leaves | ✅ | leave:view | 🔴 ขาด scope | 🔴 ขาด |
| POST /leaves | ✅ | leave:create | - | - |
| POST /leaves/:id/approve | ✅ | leave:approve | - | - |

### Attendance Module
| Endpoint | Auth | Permission | Scope | Ownership |
|:--|:--|:--|:--|:--|
| GET /attendance | ✅ | attendance:view | ❓ ไม่แน่ใจ | 🔴 ขาด |
| POST /clock-in | ✅ | attendance:create | - | - |
| POST /clock-out | ✅ | attendance:create | - | - |
| Correction endpoints | ✅? | ❓ ไม่แน่ใจ | ❓ | 🔴 ขาด |

---

## 8. Prompt สำหรับ Antigravity — Sprint Authorization Fix

```
Read CONTEXT.md and this file (AUTHORIZATION_DESIGN.md) first.

PLANNING MODE only. Do not write code yet.

Audit and fix authorization gaps in this priority order:

CRITICAL (must fix first):
1. A1: Add missing `authenticate` middleware to payroll run route
   File: backend/src/routes/payroll.routes.ts line 11
   
2. D1/D2/D3: Add record ownership check for GET /:id endpoints
   Create requireOwnershipOrScope() in auth.middleware.ts
   Apply to: employee.routes.ts, payroll.routes.ts, leave.routes.ts

IMPORTANT (fix in same sprint if time allows):
3. B2/B3/B4: Audit OT, ShiftSwap, AttendanceCorrection routes
   Run: cat backend/src/routes/ot.routes.ts
        cat backend/src/routes/shiftswap.routes.ts  
        cat backend/src/routes/correction.routes.ts
   Show me what permissions are missing

4. C1/C2/C3: Add buildEmployeeWhereClause() to Leave, OT, Correction controllers
   Show current getLeaves(), getOTs(), getCorrections() first

5. C5: Add costCenterIds filter to buildEmployeeWhereClause()
   File: backend/src/utils/scopeFilter.ts

For each fix, produce a plan showing:
- Current code (snippet)
- Proposed change (diff)
- Which roles are affected

One commit per gap fixed.
Wait for approval before implementing.
```