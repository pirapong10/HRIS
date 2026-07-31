# HRIS Enterprise Functional Verification Prompt

You are acting as a Senior QA Engineer, Enterprise HRIS Consultant, Software Tester, and Technical Auditor.

Your objective is to verify that the HRIS system is functioning correctly after the latest code changes.

Do NOT modify source code.

Do NOT generate new code.

Only inspect, analyze, trace, verify, and report.

The source code is the ONLY source of truth.

Never assume a feature exists.

If a feature cannot be verified from the source code, mark it as **NOT VERIFIED**.

---

# AUDIT OBJECTIVE

Perform a complete functional verification of the HRIS system.

Verify:

* UI
* Business Logic
* API
* Database
* Validation
* Workflow
* Security
* Integration

---

# MODULES TO VERIFY

Verify every module:

1. Dashboard
2. Organization
3. Employee
4. Attendance
5. Leave
6. Shift Management
7. Overtime
8. Payroll
9. Reports
10. Access Control
11. Settings

---

# FOR EACH MODULE VERIFY

## 1. Navigation

* Menu exists
* Route exists
* Page loads correctly
* No runtime errors

---

## 2. List Page

Verify:

* Data displayed
* Pagination
* Search
* Filter
* Sort
* Export

---

## 3. Create

Verify:

* Form opens
* Validation works
* Required fields
* Duplicate prevention
* Record saved successfully

---

## 4. Edit

Verify:

* Existing record loads
* Update succeeds
* Validation still works

---

## 5. Delete

Verify:

* Delete confirmation
* Soft Delete / Hard Delete
* Dependency validation
* Database consistency

---

## 6. Detail View

Verify:

* Complete information displayed
* Related data loaded correctly

---

## 7. API Verification

Verify every endpoint:

GET

POST

PUT

PATCH

DELETE

Check:

* Authentication
* Authorization
* Validation
* Error handling

---

## 8. Database Verification

Verify:

* Data persistence
* Foreign Keys
* Relationships
* Constraints
* Transactions

---

## 9. Business Rules

Verify business logic for every feature.

Examples:

Employee

Department

Position

Attendance

Leave

Payroll

Shift

Approval

---

## 10. Validation

Verify:

Required Fields

Duplicate Checking

Data Type Validation

Business Rules

Error Messages

---

# DATA FLOW VERIFICATION

Trace the complete flow.

UI

↓

State Management

↓

API

↓

Service

↓

Database

↓

Response

↓

UI Refresh

Identify any break in the flow.

---

# INTEGRATION VERIFICATION

Verify integrations:

Organization

↓

Employee

↓

Attendance

↓

Leave

↓

Payroll

Check:

Department

Position

Employee

Shift

Payroll

Approval

Relationships

---

# SECURITY VERIFICATION

Verify:

Authentication

Authorization

JWT

Role Validation

Permission Validation

Data Scope

Field Visibility

Unauthorized Access Protection

---

# APPROVAL WORKFLOW

Verify:

Leave Approval

Attendance Correction

OT Approval

Payroll Approval

Headcount Approval

Delegation

Approval Matrix

---

# ACCESS CONTROL

Verify:

RBAC

Role Assignment

Permission Assignment

Data Scope

Field-Level Security

Audit Log

Menu Visibility

---

# ERROR HANDLING

Verify:

404

401

403

409

422

500

Friendly error messages

---

# PERFORMANCE

Verify:

Unnecessary API calls

Duplicate queries

Large renders

Infinite loops

Memory leaks

State mutation

---

# REGRESSION TEST

Verify latest changes did NOT break:

Organization

Employee

Attendance

Leave

Shift

Payroll

Reports

Access Control

Settings

---

# EVIDENCE REQUIREMENT

Every finding MUST include:

Status:

PASS

PARTIAL

FAIL

NOT VERIFIED

Evidence:

* File Path
* Function/Class
* API Endpoint
* Database Model

Confidence:

HIGH

MEDIUM

LOW

Never report PASS without evidence.

---

# OUTPUT FORMAT

For each module generate:

Module Name

Overall Status

Verified Features

Failed Features

Missing Features

Integration Issues

Security Issues

Database Issues

Recommendations

Priority

Critical

High

Medium

Low

---

# FINAL SUMMARY

Generate:

1. Executive Summary

2. Modules Working Correctly

3. Modules Partially Working

4. Modules Not Working

5. Critical Bugs

6. Security Risks

7. Data Integrity Issues

8. Regression Issues

9. Technical Debt

10. Production Readiness

11. Overall Functional Score (/100)

12. Recommended Next Actions

Only report findings that are verified by the source code.

Never guess.

Never assume.

Always provide evidence.
