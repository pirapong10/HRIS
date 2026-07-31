# Attendance Module Implementation Plan

## 1. Current State Assessment
Based on the file inspections:
- **`leave.controller.ts`**: Lacks the `PUT /:id/approve` endpoint for leave approval.
- **`attendance.controller.ts`**: Lacks the `GET /today` endpoint and all `corrections` endpoints (`GET`, `POST`, `PUT /:id/approve`).
- **`schema.prisma` (`AttendanceCorrection`)**: The `AttendanceCorrection` model **EXISTS** in the database schema. No migration is needed for this.
- **`schema.prisma` (`LeaveBalance`)**: The `LeaveBalance` or `LeaveQuota` model **DOES NOT EXIST**.
- **`Attendance.jsx`**: Still imports `getEmp` and `getEmpName` from `../utils/helpers`. The legacy `INIT_LEAVE_BALANCE` or similar mocks are largely gone, but we need to ensure all API wirings use `api` and `useToast` effectively.

## 2. Backend Implementation Tasks

### 2.1 Leave Module (`leave.controller.ts` & `leave.routes.ts`)
- **Implement `approveLeave`**:
  - Add `PUT /api/leaves/:id/approve` endpoint.
  - Payload: `{ status: 'approved' | 'rejected', comment?: string }`.
  - **Note on Leave Balance**: Since the `LeaveBalance` model does not exist, the controller will update the status directly without checking or deducting quotas for now (as instructed).
  - Secure the route with `requirePermission('leave:approve')`.

### 2.2 Attendance Module (`attendance.controller.ts` & `attendance.routes.ts`)
- **Implement `getTodayStatus`**:
  - Add `GET /api/attendance/today` endpoint.
  - Return whether the logged-in user has clocked in today, and the `clockIn` / `clockOut` times.
- **Implement Correction Endpoints**:
  - Add `POST /api/attendance/corrections` (create correction request).
  - Add `GET /api/attendance/corrections` (list corrections, scoped to user via `buildEmployeeWhereClause`).
  - Add `PUT /api/attendance/corrections/:id/approve` (approve/reject corrections).
  - Secure these routes with `requirePermission('attendance:create')`, `attendance:view`, and `attendance:approve` respectively.

## 3. Frontend Implementation Tasks (`Attendance.jsx`)

### 3.1 State and API Initialization
- Update `useEffect` to fetch both `corrections` and `todayStatus`.
- Map the state variables `clockedIn` and `clockTime` to the real data returned from `GET /api/attendance/today`.

### 3.2 Action Handlers Updates
- **Check-In/Out**: Ensure `handleCheckIn` and `handleCheckOut` rely on `api.post` and `useToast` instead of raw `fetch` and `alert()`.
- **Leave Requests**: Ensure `submitLeave` and `approveLeave` use `api.post`/`api.put` with optimistic UI updates.
- **Correction Requests**: Implement `submitCorrection` and `approveCorrection` mapped to the new backend endpoints.

### 3.3 Cleanup
- Remove unused imports (`getEmp`, `getEmpName`) from `../utils/helpers` if they are no longer needed for rendering the UI (since the backend now returns populated relations).

## 4. Execution Strategy
1. **Backend First**: Write the controller methods and wire the routes.
2. **Frontend Second**: Update `Attendance.jsx` to consume the new endpoints.
3. **Commit**: Split into logical backend and frontend commits.

**Awaiting your approval to proceed with this implementation.**
