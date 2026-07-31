# Execution Rules

Do NOT ask which module should be verified first.

Always perform a complete end-to-end verification of the entire HRIS system in the following order:

Phase 1 – Authentication & Security

* Access Control
* Authentication
* RBAC
* Permissions
* Data Scope
* Audit Logs

Phase 2 – Core Master Data

* Organization
* Employee
* Job Position
* Cost Center

Phase 3 – HR Operations

* Attendance
* Leave
* Shift Management
* Overtime

Phase 4 – Payroll

* Payroll Processing
* Payroll History
* Payroll Approval
* Payslip
* Bank Export

Phase 5 – Reports & Dashboard

* Dashboard
* Reports
* Analytics

Phase 6 – Settings

* System Settings
* Approval Matrix
* Notification Settings

For each phase:

1. Verify UI
2. Verify Business Logic
3. Verify API
4. Verify Database
5. Verify Security
6. Verify Data Flow
7. Verify Integration
8. Verify Error Handling

Do not stop after one module.

Continue automatically until all modules have been verified.

After completing the verification, generate ONE consolidated report.

The report must contain:

1. Executive Summary
2. Module Verification Summary
3. Functional Test Results
4. Integration Test Results
5. Security Verification
6. Database Verification
7. API Verification
8. Regression Test Results
9. Critical Bugs
10. High Priority Bugs
11. Medium Priority Bugs
12. Low Priority Bugs
13. Missing Features
14. Production Readiness
15. Overall Functional Score (/100)

Do not ask for confirmation between modules unless required because source files are missing.

If any required source file cannot be found, list the missing file and continue auditing the remaining modules.
