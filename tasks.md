# HRIS Enterprise — Antigravity Task List
> Blueprint v3.1 · Last sync: 2026-06-25 · Codebase verified: 2026-06-25
> Stack: React 18 + Vite (5173) | Express/TypeScript (3000) | PostgreSQL:5433 via Prisma v5.11

---

## HOW TO USE THIS FILE

- Agent reads this file at the start of every session
- Agent updates `[x]` when a task is completed
- Agent must NOT start a task without producing an Implementation Plan Artifact first
- Agent must commit after every completed task (one task = one commit)
- Agent must NEVER touch Phase 4 items until Phase 1–3 are fully done

---

## PHASE 1 — Critical Security Fixes 🔴
> Sprint 1–2 | Must complete before any feature work

### P1-1 · Apply PayrollScope in payroll controller
- **File:** `src/controllers/payroll.controller.ts`, `src/utils/scopeFilter.ts`
- **Reference:** Blueprint §4.5, §15 Phase 1
- **Pattern:** Follow `buildEmployeeWhereClause()` in `src/utils/scopeFilter.ts` — already done for employee/attendance
- **Applies to:** `GET /api/payroll/runs`, `POST /api/payroll/runs`, `GET /api/payroll/details`
- **Scope bypass allowed for:** `SUPER_ADMIN` (level 100), `HR_DIRECTOR` (level 80)
- **Interface (Approach A — approved):**
  ```typescript
  export interface PayrollScopeFilter {
    accessLevel: 'GLOBAL' | 'RESTRICTED' | 'DENIED';
    employeeWhere: Prisma.EmployeeWhereInput;
    payrollDetailWhere: Prisma.PayrollRunDetailWhereInput;
  }
  ```
- **Controller pattern:**
  ```typescript
  const scope = await buildPayrollWhereClause(req.user);
  if (scope.accessLevel === 'DENIED') return res.status(403).json({ message: 'No access' });
  const employees = await prisma.employee.findMany({ where: scope.employeeWhere });
  ```
- [x] Read-only audit of current payroll controller
- [x] Add `PayrollScopeFilter` interface + `buildPayrollWhereClause()` to `scopeFilter.ts`
- [x] Apply `scope.employeeWhere` to payroll list endpoint
- [x] Apply `scope.payrollDetailWhere` to payroll run creation
- [x] Apply scope filter to payroll detail/export endpoints
- [ ] Verify: PAYROLL_OFFICER cannot see payroll outside their scope
- [x] Commit: `fix(payroll): enforce PayrollScope at Prisma query layer`

### P1-2 · Scope enforcement integration test
- **Reference:** Blueprint §16 Testing Checklist
- **Using:** seed data (`seed_company.js` + `seed_rbac.js`)
- [x] Test PAYROLL_OFFICER run payroll — only sees assigned scope
- [x] Test PAYROLL_MANAGER — sees all payroll in assigned departments
- [x] Test HR_DIRECTOR — sees all payroll (no scope restriction)
- [x] Test EMPLOYEE — sees only own payslip
- [x] Commit: `test(payroll): scope enforcement verification`

---

## PHASE 2 — Token & Audit Hardening 🟡
> Sprint 3 | Start only after Phase 1 complete

### P2-1 · Add `jti` to JWT payload
- **File:** `src/controllers/auth.controller.ts`
- **Reference:** Blueprint §4.3.1, TD-5
- **Why:** จำเป็นสำหรับ Token Blacklist — ต้องมี unique token ID ก่อน
- [x] Add `import { v4 as uuidv4 } from 'uuid'` (or use `crypto.randomUUID()`)
- [x] Add `jti: uuidv4()` to `jwt.sign()` payload
- [x] Update `JWTPayload` interface to include `jti: string`
- [x] Commit: `feat(auth): add jti claim to JWT for future revocation support`

### P2-2 · Create `writeAudit()` helper
- **File:** `src/utils/audit.ts` (new file)
- **Reference:** Blueprint §8, TD-6
- **Signature:**
  ```typescript
  writeAudit(params: {
    userId: number;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'PERMISSION_CHANGED' | 'ROLE_ASSIGNED' | 'USER_CREATED';
    module: 'auth' | 'employee' | 'organization' | 'attendance' | 'payroll' | 'access_control' | 'settings';
    recordId?: string;
    details: string;
    ipAddress?: string;
  }): Promise<void>
  ```
- [x] Create `src/utils/audit.ts` with `writeAudit()` wrapping `prisma.auditLog.create()`
- [x] Add try-catch — audit failure must NEVER break the main request
- [x] Commit: `feat(audit): add writeAudit() helper utility`

### P2-3 · Add audit log to Employee CRUD
- **File:** `src/controllers/employee.controller.ts`
- **Reference:** Blueprint §8, TD-6
- [x] Import `writeAudit` helper
- [x] Add audit on `POST /api/employees` → action: `CREATE`, module: `employee`
- [x] Add audit on `PUT /api/employees/:id` → action: `UPDATE`, module: `employee`
- [x] Add audit on `DELETE /api/employees/:id` → action: `DELETE`, module: `employee`
- [x] Commit: `feat(audit): add audit logging to employee CRUD`

### P2-4 · Add audit log to Payroll actions
- **File:** `src/controllers/payroll.controller.ts`
- **Reference:** Blueprint §8, TD-6
- [ ] Audit on payroll run creation → action: `CREATE`, module: `payroll`
- [ ] Audit on payroll approval → action: `UPDATE`, module: `payroll`
- [ ] Audit on payroll export → action: `UPDATE`, details: `exported bank file`
- [ ] Commit: `feat(audit): add audit logging to payroll actions`

### P2-5 · Implement Token Blacklist (minimal)
- **Reference:** Blueprint §15 Phase 2, TD-5, Known Limitations
- **Approach:** DB table (no Redis dependency) — create `TokenBlacklist` model in Prisma
- **Schema to add:**
  ```prisma
  model TokenBlacklist {
    id        Int      @id @default(autoincrement())
    jti       String   @unique
    userId    Int
    expiresAt DateTime
    createdAt DateTime @default(now())
  }
  ```
- [ ] Add `TokenBlacklist` model to `schema.prisma`
- [ ] Run `prisma migrate dev --name add_token_blacklist`
- [ ] Update `POST /api/auth/logout` → insert `jti` into blacklist
- [ ] Update `PUT /api/rbac/users/:id/toggle` (deactivate) → insert all active tokens (best-effort)
- [ ] Update `authenticate` middleware → check `jti` against blacklist before passing
- [ ] Add cleanup job or `WHERE expiresAt < NOW()` purge on login
- [ ] Commit: `feat(auth): implement JWT token blacklist for revocation support`

---

## PHASE 3 — Frontend Hardening ✅
> Already complete per Blueprint §15 Phase 3

- [x] `usePermission()` hook → `hooks/usePermission.js`
- [x] `ProtectedRoute` component → `components/ProtectedRoute.jsx`
- [x] All action buttons in App.jsx use permission guard
- [x] Legacy `authorize()` removed from routes

> ⚠️ Do NOT re-open Phase 3 tasks unless a regression is found

---

## PHASE 4 — Long-term Refactor 🟢
> Backlog | Start ONLY after Phase 1 + 2 + full test coverage
> ⚠️ Codebase verified 2026-06-25 — several items already done ahead of schedule

### P4-1 · Frontend component splitting ✅ DONE
- **Verified:** `App.jsx` = 201 lines (routing shell only)
- **Verified:** 10 files exist in `src/pages/`: AccessControlModule, Attendance, AuditLogModule, Dashboard, Employee, Login, Organization, Payroll, Settings, ShiftManagement
- [x] App.jsx split into src/pages/* — confirmed via `wc -l`
- [ ] Remove legacy `UserMgmt` component (TD-10) — cleanup only remaining
- [ ] Remove legacy `authorize()` export from `auth.middleware.ts` (TD-11)

### P4-2 · Server-side pagination ✅ DONE
- **Verified:** `GET /api/employees` returns `{ data, total, page, limit }`
- **Verified:** `useEmployees` hook sends `?page=&limit=&search=` params
- **Verified:** `useAttendance` hook and `AuditLogModule` also paginated
- [x] Employee endpoint — paginated
- [x] Attendance endpoint — paginated
- [x] Audit log endpoint — paginated
- [x] Frontend hooks updated to use pagination

### P4-3 · Refresh Token mechanism
- **Reference:** Blueprint §15 Phase 4
- [ ] Short-lived access token (15 min)
- [ ] Long-lived refresh token (7 days, stored httpOnly cookie)
- [ ] `POST /api/auth/refresh` endpoint
- [ ] Revocable refresh tokens via blacklist

### P4-4 · Permission caching (Redis)
- **Reference:** Blueprint §15 Phase 4
- [ ] Cache permission lookups per userId
- [ ] Invalidate cache on role/permission change
- [ ] Reduces DB call on every `requirePermission()` middleware execution

---

## CLEANUP TASKS (any sprint)

- [ ] Delete legacy `UserMgmt` component from frontend (TD-10) ← part of P4-1 remaining
- [ ] Remove `authorize()` export from `auth.middleware.ts` (TD-11) ← part of P4-1 remaining
- [ ] Remove legacy `user.role` field from `User` model (TD-9) — after confirming no code references it

---

## AGENT RULES

```
BEFORE starting any task:
  1. Read CONTEXT.md
  2. Read this tasks.md
  3. Produce Implementation Plan as Artifact
  4. Wait for approval before writing code

COMMIT FORMAT:
  type(scope): description
  types: feat | fix | test | refactor | chore

NEVER:
  - Start Phase 4 (P4-3, P4-4) before Phase 1–2 are complete
  - Edit scopeFilter.ts buildEmployeeWhereClause() — already working
  - Edit usePermission() hook or ProtectedRoute — already working
  - Skip Implementation Plan and code directly
  - Make more than one logical change per commit
  - Claim a task is done without showing command output as evidence
```

---

## PROGRESS SUMMARY

| Phase | Tasks | Done | Remaining |
|:--|:--|:--|:--|
| Phase 1 · Security | 2 | 2 ✅ | 0 |
| Phase 2 · Hardening | 5 | 0 | 5 |
| Phase 3 · Frontend | 4 | 4 ✅ | 0 |
| Phase 4 · Refactor | 4 | 2 ✅ | 2 (cleanup + P4-3/4) |
| Cleanup | 3 | 0 | 3 |