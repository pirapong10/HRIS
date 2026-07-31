# HRIS Refactoring & Implementation Plan
*Date: 2026-06-24*

## 1. Current State Summary
The HRIS has matured from a monolithic frontend prototype to a robust, modular, and secure enterprise application. 
- **Routing:** Successfully migrated to `react-router-dom` for component isolation.
- **Security:** Token revocation (JWT Blacklisting) and dynamic RBAC (`usePermission` hook) are actively protecting frontend and backend routes.
- **Data Integrity:** `prisma.$transaction` is used for critical multi-step approvals (e.g., Leave, OT, Corrections) to prevent data corruption.
- **API Scalability:** Major endpoints (`/api/employees`, `/api/attendance`) are now fully paginated.
- **Payroll:** Core calculations have been completely abstracted to the backend (`payroll.controller.ts`) to prevent client-side data tampering.

## 2. Thai Labor Law Compliance Analysis
A rigorous audit of the current codebase against Thai Labor Protection Act and Revenue Department (RD) regulations yields the following:
*   **SSO (Social Security):** **COMPLIANT.** The system accurately caps the SSO base at 17,500 THB resulting in an 875 THB maximum monthly deduction (5%), adhering strictly to the user's documented `CONTEXT.md` business rules.
*   **Overtime (OT):** **COMPLIANT.** A 36-hour weekly cap is strictly enforced both on the client UI and validated via Prisma queries in `approval.controller.ts` (Section 24). OT multipliers (1.5x for weekdays, 3.0x for holidays) accurately use the 30-day divisor for monthly salaried employees (Section 68).
*   **Progressive Tax:** **COMPLIANT.** Annualized income calculations accurately deduct the 100,000 THB expense limit and 60,000 THB personal allowance before applying the 8-tier RD progressive brackets (0% - 35%).
*   **Leave Allocations:** **COMPLIANT.** The mock data initializes allocations that meet or exceed legal minimums (e.g., 30 days paid sick leave, 98 days maternity leave, 6 days minimum personal/annual leave).

**Identified Gaps (Minor):** 
- Currently, Provident Fund (PVF) deductions are hardcoded to 0 in `payroll.controller.ts`. While compliant (PVF is not legally mandatory), a dynamic configuration should be introduced for companies that offer it.

## 3. Refactor Opportunities
1.  **Component De-Monolithization:** `Employee.jsx` and `Attendance.jsx` remain large monolithic files (>300 lines). They contain multiple complex tabs (Docs, History, Profiles). These should be refactored into smaller, dedicated sub-components (e.g., `<EmployeeProfile />`, `<AttendanceCorrections />`).
2.  **Elimination of Remaining Mock Data:** While employees and attendance are fetched from the API, auxiliary data like `EMP_DOCS`, `EMP_HISTORY`, `ONBOARDING_TASKS`, and `LEAVES` still rely on static `mockData.js`. These must be migrated to their respective Prisma database models.
3.  **Data Fetching Optimization:** Frontend data fetching uses raw `fetch` calls inside `useEffect`. Introducing a caching layer like React Query or SWR would eliminate redundant network requests, manage loading/error states cleanly, and automatically handle pagination updates.
4.  **Hardcoded Configurations:** Geofencing coordinates (Lat/Lng) in `Attendance.jsx` are hardcoded. These should be fetched dynamically from the `SystemConfig` database table.

## 4. Suggested Task Order & Dependencies

### Phase 1: Database & Mock Data Eradication
*   **Task 1.1:** Create Prisma models for `EmployeeDocument`, `EmployeeHistory`, and `OnboardingTask`.
*   **Task 1.2:** Build CRUD controllers for the new models.
*   **Task 1.3:** Replace `mockData.js` imports in the frontend with API calls for Documents, History, and Leaves.
*   *Dependency:* Must be completed before component refactoring to ensure data flow is correct.

### Phase 2: Frontend Architecture Polish (COMPLETED)
*   **Task 2.1:** Break down `Employee.jsx` into smaller functional components (`EmployeeList`, `EmployeeProfile`, `EmployeeDocs`, etc.). [COMPLETED]
*   **Task 2.2:** Break down `Attendance.jsx` into tab-specific components (`GPSCheckIn`, `CorrectionRequests`, `LeaveRequests`, `OTRequests`). [COMPLETED]
*   **Task 2.3:** Centralize API fetching logic into custom hooks (e.g., `useEmployees()`, `useLeaves()`) to clean up component files. [COMPLETED]
*   *Dependency:* Phase 1.

### Phase 3: System Configuration & Scalability (COMPLETED)
*   **Task 3.1:** Migrate hardcoded geofencing coordinates to `SystemConfig` and expose via a `/api/settings` endpoint. [COMPLETED]
*   **Task 3.2:** Introduce `express-rate-limit` to the backend auth routes to secure against brute-force attacks (identified in the Audit Report). [COMPLETED]
*   **Task 3.3:** Add compound database indexes for `Attendance` and `PayrollRunDetail` to optimize read performance. [COMPLETED]
*   *Dependency:* Independent, can be done at any time.

### Phase 4: CI/CD & Testing
*   **Task 4.1:** Implement E2E test for the payslip generation flow (as requested in `tasks.md`).
*   **Task 4.2:** Complete testing coverage for the new paginated API endpoints.
