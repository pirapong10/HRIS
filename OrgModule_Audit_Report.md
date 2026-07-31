# HRIS Organization Module Audit & Gap Analysis Report

**Date:** June 2026
**Role:** Senior HRIS Solution Architect & Senior Software Auditor
**Target:** Organization Module (Departments, Positions, Cost Centers, Org Structure, Headcount)

---

## 1. Existing Features

* **Database Foundation:** Relational schema exists for `Department`, `Position`, and `CostCenter`. The schema correctly establishes hierarchical structures (`parentId` in `Department`) and relationships (Employees mapped to Departments and Positions).
* **UI Views (Read-Only/Basic):** The `OrgModule` component provides a Tabbed interface to view Departments, Positions, Org Chart, Cost Centers, and Headcount Requests.
* **Basic CRUD (Department):** Creation and editing of Departments are supported via React State (Local memory).
* **Org Chart Visualization:** Recursive rendering of the organization structure is implemented via the `<OrgTree>` component.

## 2. Missing Features

* **Position Management CRUD:** The UI displays a table for Positions, but lacks Create, Edit, Archive, and Search capabilities.
* **Cost Center CRUD:** The "Create Cost Center" button exists but is not wired to any functionality. Edit and Delete are completely missing.
* **Search & Pagination:** No search functionality exists for Departments, Positions, or Cost Centers.
* **Headcount Request Workflow:** The "ร้องขออัตรากำลัง" (Request Headcount) button is dead. There is no form to submit a request, nor is it wired to the central `ApprovalEngine`.
* **Advanced Org Structure:** Lacks Effective Dating (historical organization structures) and Matrix Reporting support (dotted-line managers), which are standard in Workday/SAP.

## 3. Bugs Found

* **Department Head Assignment Flaw:** The Department Head dropdown `<select>` pulls from the entire `EMPLOYEES` list indiscriminately. It does not check if the employee is `active`, nor does it prevent assigning one employee as head of multiple conflicting departments.
* **Mock Data Dependence:** Changes made in the UI (e.g., `saveDept`, `deleteDept`) only mutate local React State (`setDepts`) and disappear on refresh. They are not connected to the `fetch`/`POST` backend API.
* **Missing Field Mapping:** The `schema.prisma` is missing `description` and `status` (Active/Inactive) fields for the `Department` model, making soft-deletes impossible.

## 4. Security Risks

* **Client-Side Authorization:** The module relies heavily on UI-level checks (e.g., hiding buttons) rather than robust API-level Role-Based Access Control (RBAC). 
* **Missing Audit Logging:** Modifying organizational structures (like changing a Department Head or altering a Cost Center budget) does not trigger the `AuditLog` system.

## 5. Database Issues

* **Missing Audit Trails:** `Department`, `Position`, and `CostCenter` lack `createdAt` and `updatedAt` timestamps in `schema.prisma`.
* **Missing Position Code:** The `Position` model lacks a unique `code` identifier, relying solely on an auto-incrementing `id` and `name`, which poses risks during mass data imports.
* **Cascade Delete Risks:** The referential integrity rules are undefined. Deleting a Department could orphan employees or cascade-delete them depending on Prisma's default strictness, which needs explicit `onDelete: Restrict` rules.

## 6. Architecture Issues

* **God Component:** `App.jsx` is over 2,700 lines long. The `OrgModule` is buried within it, violating the Single Responsibility Principle.
* **Tight Coupling:** The UI components are tightly coupled with state management and mock data. It needs to be refactored into distinct components (e.g., `DepartmentList`, `PositionForm`).

## 7. Performance Issues

* **Unoptimized Lists:** The Department Head dropdown renders all employees without virtualization. In a company with 10,000 employees, this will freeze the browser.
* **Expensive Computations:** The `OrgTree` recursively filters `depts` on every render without `useMemo`, leading to O(n^2) or worse complexity during React re-renders.

## 8. Enterprise Readiness Score

| Area | Score / 100 | Remarks |
| :--- | :--- | :--- |
| Department Management | 45/100 | Basic CRUD exists but lacks API integration and soft-delete. |
| Position Management | 20/100 | Read-only UI; no code identifier in DB. |
| Cost Center | 30/100 | DB schema exists, UI lacks implementation. |
| Organization Hierarchy | 60/100 | Parent-child relationship works, lacks effective dating. |
| Headcount Workflow | 15/100 | Table exists; no logic or backend integration. |
| Security | 30/100 | Lacks granular RBAC and organizational audit trails. |
| Scalability | 25/100 | God component architecture prevents scaling. |

## 9. Recommended Fix Priority

* **[Priority 1 - Critical]:** Implement API integration for `OrgModule` to replace React state mutation. Add `createdAt`, `updatedAt`, `status`, and `description` to `Department` and `Position` schemas.
* **[Priority 2 - High]:** Implement `useMemo` for the Org Chart rendering and virtualize the Employee dropdown selectors to fix performance bottlenecks.
* **[Priority 3 - Medium]:** Build out the missing CRUD interfaces for Positions and Cost Centers.
* **[Priority 4 - Low]:** Implement advanced search, filtering, and pagination for the tables.
