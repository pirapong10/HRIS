# Sprint 4 Implementation Plan: EmployeeType Integration

## 1. Schema: `EmployeeType` Model
*   Add `EmployeeType` model to `schema.prisma` containing fields for SSO rules, Tax rules, and Work rules.
*   Add `employeeTypeId` to `Employee` model as an optional relational field. Keep the existing `type` string field during migration.
*   Run Prisma migration: `npx prisma migrate dev --name add_employee_type_model`.

## 2. Seed Default Types
*   Add the `upsertEmployeeTypes()` function in `backend/prisma/seed.ts`.
*   Populate 4 default types: Fulltime, Parttime, Contract, and Intern.
*   Run `npx ts-node prisma/seed.ts`.

## 3. Migrate Employee Data
*   Create a standalone script `backend/prisma/migrate_employee_types.ts` to map the string `type` to the new `employeeTypeId`.
*   Run the script and verify 0 unmapped employees remaining.

## 4. Payroll Engine Updates (CRITICAL)
*   **Engine Injection:** Modify `runPayrollEngine` in `payrollEngine.ts` to optionally accept `employeeTypeId`. If provided, query the `EmployeeType` and inject `SSO_RATE`, `SSO_CAP`, `SSO_EMPLOYER_RATE`, `TAX_METHOD`, `TAX_FLAT_RATE`, and `INCLUDE_IN_PAYROLL` into `baseVariables` **before** the component execution loop begins.
*   **Formula Calculation:** Update the `calculateThaiTax()` function in `payrollFunctions.ts` to respect `TAX_METHOD`.
*   **Controller Modification:** Modify `runPayroll` in `payroll.controller.ts` to pass `emp.employeeTypeId || undefined` into `runPayrollEngine`.
*   **Database Update:** Execute a script to dynamically update the `SSO` formula in `PayrollComponent` to `MIN(BASIC * SSO_RATE, SSO_CAP)`.

## 5. CRUD API for EmployeeType
*   Build `backend/src/controllers/employeeType.controller.ts` and `backend/src/routes/employeeType.routes.ts` for standard GET, POST, PUT, DELETE.
*   Implement soft deletion (`isActive = false`) and dependency checks.

## 6. Frontend Integration
*   **Employee Form (`Employee.jsx`):** Refactor the static type dropdown to dynamically fetch from `/api/employee-types`. Ensure `employeeTypeId` is properly extracted and saved to the backend.
*   **Settings UI (`Settings.jsx`):** Add an "EmployeeType" management tab utilizing the standard modal patterns for CRUD capabilities.

---

> [!WARNING]
> ### Risk Flags & Mitigations for Payroll Engine
> 1.  **Variable Injection Timing:** `SSO_RATE`, `SSO_CAP`, and `TAX_METHOD` must be populated in `baseVariables` **before** the `PayrollComponent` evaluation loop starts. Otherwise, components like `SSO` or `TAX` will evaluate with `undefined` metrics.
> 2.  **TAX_METHOD Logic:** `calculateThaiTax` is hardcoded as a function. The injection of `TAX_METHOD` into the variables payload must happen reliably so the function can access `vars.TAX_METHOD` to execute the withholding tax or skip it entirely (exempt).
> 3.  **SSO-before-TAX Guard:** The engine relies on the sorted execution order where SSO evaluates before TAX. This logic will remain intact as long as the component `sortOrder` isn't altered. The engine will safely calculate SSO based on `SSO_RATE` (0 for contractors) and pass that dynamically deducted value down to the TAX evaluation block as it currently does.

