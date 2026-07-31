# HRIS Project Context

## Stack
React 18 + Vite (port 5173) | Node.js/Express/TypeScript (port 3000) | PostgreSQL port 5433 via Prisma ORM v5.11

## Current Version
v2.0 Enterprise RBAC Phase — Blueprint v3.1 (2026-07-31)

## Critical Completed Work ✅
1. PayrollScope enforcement in payroll controller (TD-3 ✅)
2. JWT revocation / RefreshToken invalidation & Cookie cleanup (TD-5 ✅)
3. Audit log: Employee, Attendance & Payroll Bank Export actions (TD-6 ✅)
4. Geofence + Live Photo Check-In backend & frontend (`CameraCheckIn.jsx` ✅)

## Pending Work
1. Multi-level Approval Engine (Manager -> HR -> Director)
2. Shift Assignment & Flexible Hours policy
3. Backend Payroll Engine Calculation migration from Client UI

## Business Rules
- DataScope: HR_MANAGER เห็นเฉพาะ dept ที่ assign
- PayrollScope: PAYROLL_OFFICER run payroll เฉพาะ scope
- EMPLOYEE เห็นเฉพาะ payslip ตัวเอง
- Thai labor law: SSO 5%/750 THB cap, OT ไม่เกิน 36 ชม./สัปดาห์

## Architecture Notes
- App.jsx monolithic ~3,541 lines — modularized into pages/ components
- CameraCheckIn integrates `react-webcam` + Geolocation API
- Legacy authorize() and UserMgmt component still in codebase but unused