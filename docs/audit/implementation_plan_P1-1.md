# Implementation Plan: P1-1 Apply PayrollScope in Payroll Controller

## 1. Current State of Payroll Controller (Read-Only Audit)
Currently, `payroll.controller.ts` exposes two critical endpoints: `runPayroll` and `getPayroll`. 
* **The Vulnerability:** Without strict scoping, any user who successfully bypasses the top-level route guard (or has baseline access to the payroll module) could potentially execute `prisma.employee.findMany()` or `prisma.payrollRunDetail.findMany()` with an empty `where: {}` clause. This would expose the entire company's payroll data and allow unauthorized users to generate payroll runs for employees outside their jurisdiction.
* **The Goal:** We need to securely inject a dynamic `where` clause into these Prisma queries that acts as an impenetrable database-level shield based on the user's `PayrollScope`.

## 2. Adapting `buildEmployeeWhereClause()` for PayrollScope
In `src/utils/scopeFilter.ts`, the `buildEmployeeWhereClause` effectively checks `DataScope` to limit HR visibility. We will adapt this pattern by creating `buildPayrollWhereClause(user)`:
* **Super Admins / Directors (Level >= 80):** Instantly return `{}` (No restrictions, full access).
* **Standard Employees (Level <= 10):** Instantly return `{ empId: user.empId }` (Strictly limit visibility to their own payslip).
* **Payroll Officers / Managers:** Fetch their unique `PayrollScope` from the database. 
  * Parse `scope.departments`, `scope.grades`, etc., from JSON.
  * Construct a Prisma nested filter: `{ employee: { deptId: { in: [...] } } }`.
  * Return this scoped object to the controller.
* **Failsafe:** If no scope exists and the user is not a base employee, return `{ empId: -1 }` to guarantee a safe 404 (Zero access).

## 3. Step-by-Step Changes Needed in `payroll.controller.ts`
1. **Import the Helper:** Ensure `buildPayrollWhereClause` is imported into the controller.
2. **Retrieve the Scope:** At the very top of `runPayroll` and `getPayroll`, invoke:
   `const scopeWhere = req.user ? await buildPayrollWhereClause(req.user) : { empId: -1 };`
3. **Normalize the Query Payload:** Because `buildPayrollWhereClause` might return either an `empId` direct-match (for employees) or a nested `employee.deptId` match (for scoped officers), we must normalize the object before feeding it to Prisma's `employee` table or `payrollRunDetail` table.
4. **Apply to `runPayroll`:**
   * Create `empWhere` object.
   * If `scopeWhere.employee` exists, assign it to `empWhere`.
   * Else if `scopeWhere.empId` exists, assign `{ id: scopeWhere.empId }`.
   * Pass `empWhere` into `prisma.employee.findMany({ where: empWhere })`.
5. **Apply to `getPayroll`:**
   * Create `detailWhere` object.
   * If `scopeWhere.employee` exists, assign `detailWhere.employee = scopeWhere.employee`.
   * Else if `scopeWhere.empId` exists, assign `detailWhere.empId = scopeWhere.empId`.
   * Pass `detailWhere` into `prisma.payrollRunDetail.findMany({ where: detailWhere })`.

## 4. Test Cases to Verify Scope Enforcement
* **Test Case A (PAYROLL_OFFICER):** Log in as an officer with `PayrollScope` explicitly restricted to `IT01` (Department 1). Execute `runPayroll`. Verify that only employees belonging to `IT01` are processed.
* **Test Case B (PAYROLL_MANAGER):** Log in as a manager with multiple assigned departments. Execute `getPayroll`. Verify that the returned list spans multiple departments but completely excludes unassigned departments.
* **Test Case C (HR_DIRECTOR / SUPER_ADMIN):** Log in as an admin. Execute `getPayroll`. Verify that the entire company database is visible.
* **Test Case D (EMPLOYEE):** Log in as a base employee. Attempt to fetch payroll details. Verify that the response strictly contains their own historical payslips, with no visibility into other employee records.
