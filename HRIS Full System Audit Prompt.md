Act as a Principal HRIS Architect, Enterprise Software Auditor, Security Auditor, QA Lead, and Technical Reviewer.

Perform a complete audit of the current HRIS source code after the latest changes.

Your job is to verify that the system remains stable, consistent, secure, and aligned with enterprise HRIS architecture.

Do not modify code.

Only inspect, analyze, validate, and report findings.

====================================================
AUDIT MODE
====================================================

Perform:

1. Functional Audit
2. Architecture Audit
3. Security Audit
4. Database Audit
5. Access Control Audit
6. Approval Workflow Audit
7. Data Integrity Audit
8. HRIS Standards Audit
9. Regression Audit
10. Technical Debt Audit

Analyze actual implementation only.

Never assume features exist.

Use source code as the single source of truth.

====================================================
SECTION 1
SYSTEM OVERVIEW
====================================================

Identify:

- Total modules
- Total pages
- Total components
- Total APIs
- Total database models
- Total roles
- Total workflows

Generate current system summary.

====================================================
SECTION 2
MODULE AUDIT
====================================================

Audit every module.

Examples:

- Dashboard
- Organization
- Employee
- Attendance
- Leave
- Shift
- OT
- Payroll
- Reports
- Access Control
- Settings

For each module report:

1. Purpose
2. Existing Features
3. Missing Features
4. Bugs Found
5. Security Issues
6. Technical Debt
7. Enterprise Readiness Score

====================================================
SECTION 3
ORGANIZATION AUDIT
====================================================

Verify:

Department

Position

Division

Section

Team

Department Head

Position Hierarchy

Organization Tree

Check:

- Parent-child relationships
- Department assignment
- Position assignment
- Department head assignment

Report gaps.

====================================================
SECTION 4
EMPLOYEE AUDIT
====================================================

Verify:

Employee Master Data

Department linkage

Position linkage

Organization linkage

Employment Status

Emergency Contact

Employment History

Document Storage

Onboarding

Offboarding

Check:

- Does Employee use Organization data?
- Are there duplicate data sources?
- Are foreign keys used correctly?

Generate data flow diagram.

====================================================
SECTION 5
ATTENDANCE AUDIT
====================================================

Verify:

Attendance

Time In

Time Out

GPS

Geofencing

Attendance Correction

Approval Workflow

Multi-level Approval

OT Integration

Shift Integration

Report gaps.

====================================================
SECTION 6
SHIFT AUDIT
====================================================

Verify:

Shift CRUD

Employee Assignment

Shift Rotation

Shift Calendar

Shift Swap

Roster Planning

Check state management.

Detect direct mutations.

====================================================
SECTION 7
PAYROLL AUDIT
====================================================

Verify:

Payroll Processing

Payroll History

Payroll Run

Salary Structure

Allowances

Deductions

Tax

Social Security

Provident Fund

Loan

Bank Export

Payslip

Payroll Approval

Check:

- Historical payroll records
- Data consistency
- Salary security

====================================================
SECTION 8
ACCESS CONTROL AUDIT
====================================================

Verify implementation of:

RBAC

Data Scope

Field Security

Approval Matrix

Delegation

Audit Log

Roles:

Super Admin
System Admin
HR Director
HR Manager
Payroll Manager
Payroll Officer
Department Manager
Employee

Check:

- Role permissions
- Data permissions
- Field permissions
- Unauthorized access risks

Generate Permission Matrix.

====================================================
SECTION 9
APPROVAL WORKFLOW AUDIT
====================================================

Verify:

Leave

Attendance Correction

OT

Payroll

Headcount

Onboarding

Offboarding

Check:

- Workflow configuration
- Approval levels
- Delegation support

Generate workflow diagrams.

====================================================
SECTION 10
DATABASE AUDIT
====================================================

Inspect:

All models

All relationships

All constraints

Verify:

PK

FK

Unique

Indexes

Soft Delete

Cascade Rules

Historical Records

Generate ERD summary.

====================================================
SECTION 11
API AUDIT
====================================================

Verify:

REST endpoints

Authentication

Authorization

Validation

Error Handling

Audit:

GET
POST
PUT
PATCH
DELETE

Report:

Missing APIs

Broken APIs

Inconsistent APIs

====================================================
SECTION 12
SECURITY AUDIT
====================================================

Verify:

JWT

MFA

Password Reset

Password Policy

Account Lockout

Session Timeout

Audit Logs

Role Validation

Data Scope Filtering

Report vulnerabilities.

====================================================
SECTION 13
DATA INTEGRITY AUDIT
====================================================

Verify:

Organization
→ Employee

Employee
→ Attendance

Employee
→ Leave

Employee
→ Payroll

Department
→ Position

Position
→ Employee

Check:

- Broken references
- Duplicate data
- Orphan records

Generate dependency map.

====================================================
SECTION 14
REGRESSION AUDIT
====================================================

Verify latest changes did not break:

Organization

Employee

Attendance

Shift

Payroll

Reports

Access Control

Compare current implementation against previous architecture.

Identify regressions.

====================================================
SECTION 15
TECHNICAL DEBT AUDIT
====================================================

Identify:

Large Components

Monolithic Files

Duplicate Logic

Direct State Mutation

Prop Drilling

Hardcoded Data

Mock Data

Code Smells

Rank severity:

Critical
High
Medium
Low

====================================================
SECTION 16
ENTERPRISE HRIS COMPLIANCE
====================================================

Compare current implementation against:

Workday
SAP SuccessFactors
Oracle HCM
BambooHR

Score:

Organization
Employee
Attendance
Shift
Payroll
Security
Access Control
Auditability
Scalability

Overall Score /100

====================================================
SECTION 17
FINAL REPORT
====================================================

Generate:

1. Executive Summary

2. Features Working Correctly

3. Features Partially Implemented

4. Missing Features

5. Critical Bugs

6. Security Risks

7. Data Integrity Risks

8. Architecture Risks

9. Technical Debt

10. Compliance Score

11. Enterprise Readiness Score

12. Priority Fix List

Priority 1 = Critical

Priority 2 = High

Priority 3 = Medium

Priority 4 = Low

====================================================
VALIDATION RULE
====================================================

Before generating the report:

- Scan all source files
- Verify all modules
- Verify all APIs
- Verify all database models
- Verify all workflows
- Verify all permissions

Never assume.

Only report verified findings.

Source code is the single source of truth.