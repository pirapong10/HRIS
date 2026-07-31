# PS HRIS Enterprise — Full System Audit Report

> **Date:** 2026-06-24  
> **Auditor:** Principal HRIS Architect / Enterprise Security Auditor  
> **Target Version:** 3.1 (Post-RBAC Phase 1 Implementation)

---

## 1. Executive Summary

PS HRIS Enterprise has undergone a significant transformation from a flat-role architecture to a multi-layered Role-Based Access Control (RBAC) structure. The foundational schema for Enterprise HRIS is in place with 22 relational models supporting Organization, Employee Master, Time & Attendance, Workflow Approvals, and Security (RBAC/Audit). 

However, the application architecture remains deeply imbalanced. The backend has matured significantly with proper Express routing, Prisma ORM relationships, and rigorous middleware-based security. Conversely, the frontend is severely bottlenecked by a monolithic design (`App.jsx` spanning >3,500 lines) that handles routing, global state, domain logic (like Payroll calculation), and UI rendering simultaneously.

While security layers (Layer 1: Roles, Layer 2: Permissions) are solid, the system is actively working through Layer 3 (Data Scope) enforcement.

**Current System Statistics:**
- **Total Modules:** 9 (Auth, Org, Employee, Attendance, Shift, Payroll, Access Control, Audit Logs, Settings)
- **Total APIs:** 8 Route Groups (~30 endpoints)
- **Total Database Models:** 22
- **Total Roles:** 8 Hierarchical Roles
- **Total Permissions:** 66
- **Architecture Type:** React SPA Monolith (Client) + Node.js/Express API (Server)

---

## 2. Features Working Correctly

- **Role-Based Access Control (RBAC) Foundation:** JWT properly embeds dynamic permission matrices and role codes. Route-level middleware (`requirePermission`, `requireRole`, `requireLevel`) effectively blocks unauthorized REST requests.
- **Organization Hierarchy:** Department parent-child relationships, Cost Center assignment, and Position/Grade mappings are fully functional via Prisma relations.
- **Attendance Capture:** Geofencing (Lat/Lng) and Clock-in/Clock-out logic correctly prevent duplicate daily records.
- **Data Scope Enforcement (Partial):** Employee Directory and Attendance lists are successfully dynamically filtered at the backend (`buildEmployeeWhereClause`) so managers only see their authorized departments.
- **Approval Security:** The Approval Workflow correctly validates that the `approver` possesses both the required Role (e.g., `HR_MANAGER`) and the required Permission (e.g., `leave:approve`) for the specific step in the chain.

---

## 3. Features Partially Implemented

- **Payroll Processing:** Payroll logic (Thai tax brackets, OT multipliers, SSO deductions) exists and computes correctly, but it runs **entirely on the frontend** within `App.jsx`. It lacks a dedicated backend controller, making it vulnerable to client-side manipulation and preventing proper `PayrollScope` database enforcement.
- **Audit Logging:** The system logs Auth (Login/Logout) and RBAC changes (Permission/Role assignment). However, it does not yet capture critical domain changes (e.g., Payroll runs, Employee record modifications).
- **Shift Management:** Shift definitions exist and are linked to employees, but advanced rostering (multi-week rotation) and shift swap workflows lack comprehensive backend state tracking.

---

## 4. Missing Features

- **JWT Revocation Mechanism:** Currently, JWTs are stateless with a 24-hour expiry. There is no refresh token system or Redis blacklist, meaning deactivated users or changed permissions are not instantly revoked.
- **Server-Side Pagination:** Almost all endpoints (`findMany`) return unbounded arrays. There is no limit/offset logic, which will break the client when the employee count scales beyond a few thousand.
- **Real-Time Synchronization:** Concurrent edits to Org or Employee data will result in lost updates (Last-Write-Wins without optimistic concurrency control).
- **Frontend Permission Guards:** While the API blocks unauthorized requests, the frontend UI does not aggressively hide action buttons (Create/Edit/Delete) based on the user's `permissions` array, leading to a poor UX (users click and get a 403).

---

## 5. Critical Bugs

- *(No immediate application-crashing bugs identified in the current REST layer, but architectural constraints will cause runtime failures at scale).*

---

## 6. Security Risks

- **[HIGH] Frontend Payroll Calculation:** Because payroll is calculated on the client, malicious actors could intercept the network payload or modify local state to export fraudulent bank files or payslips.
- **[HIGH] Lack of Token Revocation:** If an administrator terminates an employee, their active JWT remains valid for API access until it naturally expires.
- **[MEDIUM] Rate Limiting:** No API rate limiting (e.g., `express-rate-limit`) on `/api/auth/login`, leaving the system open to brute-force credential stuffing.

---

## 7. Data Integrity Risks

- **[MEDIUM] Soft Delete vs Cascades:** While departments and positions use soft deletes (`status: inactive`), there is a risk of orphan records in historical tables if an employee is hard-deleted by an admin directly in the database.
- **[MEDIUM] No Database Transactions on Complex Workflows:** Approving a request updates the `ApprovalRequest` status and inserts an `ApprovalLog`. If the latter fails, the system state becomes inconsistent. (Should use `prisma.$transaction`).

---

## 8. Architecture Risks

- **The Frontend Monolith (`App.jsx`):** 3,500+ lines of React containing all global states (`useState` for every module). Any state mutation (e.g., typing in a search box) triggers massive re-renders across the entire application.
- **Over-fetching:** The frontend fetches the *entire* employee and organization catalog on initial load to populate tables and dropdowns.

---

## 9. Technical Debt

| Debt Item | Severity | Recommended Fix |
|:--|:--|:--|
| **Monolithic `App.jsx`** | **CRITICAL** | Implement React Router. Split modules into `src/pages/` and `src/components/`. Use Zustand or Redux for global state. |
| **Frontend Payroll** | **CRITICAL** | Migrate all tax, SSO, and net pay calculation logic to a `payroll.controller.ts` backend service. |
| **No Pagination** | **HIGH** | Implement cursor-based or limit/offset pagination in Prisma queries and UI tables. |
| **No Transaction Blocks** | **MEDIUM** | Wrap multi-table inserts (e.g., Approval + Log) in `prisma.$transaction`. |
| **Hardcoded UI Colors** | **LOW** | Move `const C = {...}` out of App.jsx into a proper CSS/Tailwind theme provider. |

---

## 10. Compliance Score

| Category | Score | Notes |
|:--|:--|:--|
| **Organization Management** | 8.5/10 | Excellent relational hierarchy; needs better history tracking. |
| **Employee Master Data** | 8.0/10 | Covers standard PII; lacks granular data masking for HR vs Manager views. |
| **Time & Attendance** | 7.5/10 | Core logic works; lacks complex multi-shift rostering validations. |
| **Payroll Processing** | 4.0/10 | Calculations are accurate for Thailand but architecture (Frontend) is fundamentally flawed for Enterprise. |
| **Security & RBAC** | 8.0/10 | Very strong backend RBAC and DataScope; needs JWT revocation. |
| **Auditability** | 6.0/10 | Framework exists, but coverage is currently too limited. |
| **Scalability** | 3.0/10 | Will fail under load due to lack of pagination and React re-renders. |

**Overall Compliance Score: 64 / 100** *(Borderline Enterprise-Ready)*

---

## 11. Enterprise Readiness Score

**Grade: C+ (Transitioning)**

The system has successfully moved out of the "prototype" phase regarding database design and backend security. However, it cannot be deployed to an enterprise client (>500 employees) until the frontend monolith is refactored and payroll is secured on the server.

---

## 12. Priority Fix List

### Priority 1: Critical (Must Fix Before Go-Live)
1. **Server-Side Payroll:** Extract `buildPayroll` and `calcThaiTax` from `App.jsx`. Create `payroll.controller.ts` and ensure Payroll runs execute on the backend, enforcing `PayrollScope`.
2. **Frontend React Router Refactoring:** Break `App.jsx` into separate route components (`/employees`, `/payroll`, `/attendance`) to prevent global re-render crashes.
3. **JWT Blacklist/Revocation:** Implement a Redis or DB-based token blacklist checked by `auth.middleware.ts`.

### Priority 2: High (Fix in Next 2 Sprints)
4. **Server-Side Pagination:** Add `take`, `skip`, and `where` search filtering to `/api/employees` and `/api/attendance`.
5. **Prisma Transactions:** Refactor controllers (especially RBAC user assignment and Approval processing) to use `$transaction`.
6. **Frontend UI Permission Hiding:** Implement a `usePermission` hook to physically hide restricted UI elements (buttons/tabs) from unauthorized users.

### Priority 3: Medium 
7. **Expand Audit Logging:** Add triggers for Employee CRUD, Payroll Runs, and Settings changes into the `AuditLog` table.
8. **Rate Limiting:** Protect the authentication endpoints.

### Priority 4: Low
9. **UI Component Extraction:** Move `Btn`, `Modal`, `Tbl`, `Inp` into a `src/components/common` directory.
10. **Clean up Legacy Code:** Remove all remnants of `UserMgmt` and `authorize()` from the codebase.
