# HRIS Enterprise — Antigravity Task List
> Blueprint v3.1 · Last sync: 2026-06-25
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
- **File:** `src/controllers/payroll.controller.ts` (to be created/located)
- **Reference:** Blueprint §4.5, §15 Phase 1
- **Pattern:** Follow `buildEmployeeWhereClause()` in `src/utils/scopeFilter.ts` — already done for employee/attendance
- **Logic:** Read `PayrollScope` from DB for `req.user.id`, build Prisma `where` clause filtering by `employeeTypes`, `grades`, `departments`, `costCenters`
- **Applies to:** `GET /api/payroll/runs`, `POST /api/payroll/runs`, `GET /api/payroll/details`
- **Scope bypass allowed for:** `SUPER_ADMIN` (level 100), `HR_DIRECTOR` (level 80)
- [x] Read-only audit of current payroll controller
- [x] Draft `buildPayrollWhereClause()` in `src/utils/scopeFilter.ts`
- [x] Apply scope filter to payroll list endpoint
- [x] Apply scope filter to payroll run creation
- [x] Apply scope filter to payroll detail/export endpoints
- [x] Verify: PAYROLL_OFFICER cannot see payroll outside their scope
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
- [x] Audit on payroll run creation → action: `CREATE`, module: `payroll`
- [x] Audit on payroll approval → action: `UPDATE`, module: `payroll`
- [x] Audit on payroll export → action: `UPDATE`, details: `exported bank file`
- [x] Commit: `feat(audit): add audit logging to payroll actions`

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
- [x] Add `TokenBlacklist` model to `schema.prisma`
- [x] Run `prisma migrate dev --name add_token_blacklist`
- [x] Update `POST /api/auth/logout` → insert `jti` into blacklist
- [x] Update `PUT /api/rbac/users/:id/toggle` (deactivate) → insert all active tokens (best-effort)
- [x] Update `authenticate` middleware → check `jti` against blacklist before passing
- [x] Add cleanup job or `WHERE expiresAt < NOW()` purge on login
- [x] Commit: `feat(auth): implement JWT token blacklist for revocation support`

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

### P4-1 · Frontend component splitting (App.jsx)
- **Reference:** Blueprint §2, TD-1, TD-7
- **Target structure:**
  ```
  src/
  ├── pages/
  │   ├── OrgModule.jsx
  │   ├── EmpModule.jsx
  │   ├── AttModule.jsx
  │   ├── ShiftManagement.jsx
  │   ├── PayrollModule.jsx
  │   ├── AccessControlModule.jsx
  │   └── AuditLogModule.jsx
  ├── components/
  │   └── (Btn, Inp, Sel, Modal, Tbl, Badge, Tabs, SearchableSel)
  └── App.jsx  ← routing only, ~200 lines target
  ```
- [x] Agent produces split plan as Artifact — review before any file changes
- [x] Create `src/pages/*` if they don't exist
- [x] Extract shared components first (zero logic change)
- [x] Extract one module at a time — test after each extraction
- [x] Remove legacy `UserMgmt` component (TD-10)
- [x] Remove legacy `authorize()` export from `auth.middleware.ts` (TD-11)
- [x] Commit: `refactor(frontend): split monolithic App.jsx into page modules`

### P4-2 · Server-side pagination
- **Reference:** TD-8
- **Affects:** `GET /api/employees`, `GET /api/attendance`, `GET /api/rbac/audit-logs`
- [x] Add `page` + `limit` query params to employee endpoint
- [x] Add `page` + `limit` to attendance endpoint
- [x] Update frontend list components to use paginated responses
- [x] Verify `attendance.controller.ts` and `rbac.controller.ts` (Audit Logs) correctly implement `page`, `limit`, `take`, and `skip`
- [x] Update the React frontend lists (`Employee.jsx`, `Attendance.jsx`, `AuditLogModule.jsx`) to actually pass `?page=X&limit=Y` parameters and utilize the returned `total` count for bottom-of-page pagination controls.
- [x] Commit: `feat(perf): implement server-side pagination for data tables`

### P4-3 · Refresh Token mechanism
- **Reference:** Blueprint §15 Phase 4
- [x] Add `RefreshToken` model to `schema.prisma`
- [x] Update `login` to generate Access Token (15m) and Refresh Token (7d)
- [x] Send Refresh Token as `httpOnly` secure cookie
- [x] Create `POST /api/auth/refresh` endpoint to validate cookie and issue new Access Token
- [x] Add an Axios interceptor to automatically catch `401 Unauthorized` errors, call the `/refresh` endpoint, and retry the failed request seamlessly.
- [x] Commit: `feat(auth): implement refresh token and axio interceptor`

### P4-4 · Permission caching (Redis)
- **Reference:** Blueprint §15 Phase 4
- [x] Cache permission lookups per userId
- [x] Invalidate cache on role/permission change
- [x] Reduces DB call on every `requirePermission()` middleware execution
- [x] Commit: `feat(perf): implement redis caching for rbac`

---

## CLEANUP TASKS (any sprint)

- [ ] Delete legacy `UserMgmt` component from frontend (TD-10)
- [ ] Remove `authorize()` export from `auth.middleware.ts` (TD-11) — function unused since routes migrated
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
  - Start Phase 4 before Phase 1–2 are complete
  - Edit scopeFilter.ts buildEmployeeWhereClause() — already working
  - Edit usePermission() hook or ProtectedRoute — already working
  - Skip Implementation Plan and code directly
  - Make more than one logical change per commit
```

---

## PROGRESS SUMMARY

| Phase | Tasks | Done | Remaining |
|:--|:--|:--|:--|
| Phase 1 · Security | 2 | 2 ✅ | 0 |
| Phase 2 · Hardening | 5 | 5 ✅ | 0 |
| Phase 3 · Frontend | 4 | 4 ✅ | 0 |
| Phase 4 · Refactor | 4 | 4 ✅ | 0 |
| Cleanup | 3 | 0 | 3 |