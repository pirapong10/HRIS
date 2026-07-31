# 🚀 Task: Sprint 6 - Time & Attendance System (Phase 1)

## 📌 1. Project Context & Objectives
**System:** PS Trading Enterprise HRIS
**Module:** Time & Attendance (T&A)
**Objective:** Implement a robust, scalable, and location-aware Time & Attendance module that mandates real-time photo capture (Live Photo) and geofencing validation to prevent buddy punching and time fraud.
**Architecture:** Node.js/Express (Backend), React/Vite (Frontend), Prisma/PostgreSQL (Database). Adheres to Controller-Service-Repository pattern.

## ⚠️ 2. Strict Business Rules & Constraints
The AI Agent MUST strictly adhere to the following rules:
1. **Live Photo is MANDATORY:** `checkInPhoto` is required at the database level. API must reject requests lacking a `req.file`.
2. **Geofencing:** Check-in coordinates must be calculated against `SystemConfig` (`companyLat`, `companyLng`) using the Haversine formula.
3. **No Isolated Systems:** All actions must log to the existing `EnterpriseAuditLog`.
4. **Clean Architecture:** Do not mix business logic inside controllers. Keep routes clean. Use custom error handlers.

---

## 🛠️ 3. Execution Plan

### Step 1: Database Schema Modifications (`backend/prisma/schema.prisma`)
Define the foundational tables for T&A. Run `npx prisma format` and `npx prisma generate` after modification.

*   **Update `SystemConfig` Model:**
    *   `companyLat` (Float?): Central latitude of the office.
    *   `companyLng` (Float?): Central longitude of the office.
    *   `allowedRadiusM` (Int?): Allowed check-in radius in meters (e.g., 100).
*   **Create `Shift` Model:**
    *   `id` (Int @id @default(autoincrement()))
    *   `name` (String): e.g., "Standard Office Hours"
    *   `startTime` (String): e.g., "09:00"
    *   `endTime` (String): e.g., "18:00"
    *   `isFlexible` (Boolean @default(false))
    *   `lateThresholdMins` (Int @default(15))
*   **Create `Attendance` Model:**
    *   `id` (Int @id @default(autoincrement()))
    *   `employeeId` (Int): Relation to `Employee`
    *   `date` (DateTime @db.Date): For easy querying per day
    *   `checkInTime` (DateTime)
    *   `checkOutTime` (DateTime?)
    *   `checkInLat` (Float)
    *   `checkInLng` (Float)
    *   `checkInPhoto` (String): **Required field.** Stores the file path.
    *   `checkOutPhoto` (String?): Optional for check-out.
    *   `status` (String): Enum string -> 'ON_TIME', 'LATE', 'OUT_OF_ZONE'
    *   `createdAt` & `updatedAt`

### Step 2: Backend Upload Middleware (`backend/src/middlewares/upload.middleware.ts`)
*   Implement a new `multer` instance export named `uploadAttendancePhoto`.
*   **Storage:** `backend/uploads/attendance/` (Create dir automatically if it doesn't exist).
*   **Security:** Restrict to `image/jpeg` and `image/png`. Max size: 5MB.

### Step 3: Backend Business Logic (`backend/src/services/attendance.service.ts`)
*   **Function `calculateDistance(lat1, lon1, lat2, lon2)`:** Implement the Haversine formula to return distance in meters.
*   **Function `recordCheckIn(employeeId, lat, lng, photoPath)`:**
    *   Fetch `SystemConfig`. Calculate distance. If distance > `allowedRadiusM`, set status to `OUT_OF_ZONE`.
    *   Fetch Employee's assigned `Shift` (or default shift). Compare current time with `startTime` + `lateThresholdMins`. If late, set status to `LATE`, else `ON_TIME`.
    *   Use Prisma `$transaction` to insert the `Attendance` record AND write an entry to `EnterpriseAuditLog`.

### Step 4: Backend API Controllers & Routes (`backend/src/controllers/`, `backend/src/routes/`)
*   **Controller (`attendance.controller.ts`):**
    *   Extract `lat`, `lng` from `req.body`.
    *   Extract `req.file?.filename`. 
    *   **Validation:** If `!req.file` or `!lat` or `!lng`, throw `400 Bad Request`.
    *   Call `AttendanceService.recordCheckIn`.
*   **Route (`attendance.routes.ts`):**
    *   `POST /api/attendance/check-in` 
    *   Attach auth middleware, then `uploadAttendancePhoto.single('photo')`, then controller.
*   **Static Expose (`backend/src/index.ts`):**
    *   Ensure `/uploads` is exposed via `express.static` so frontend can render the images.

### Step 5: Frontend UI Preparation (Next Phase - Do Not Implement Yet)
*   *Note for AI: Acknowledge these requirements but do not generate frontend code in this run.*
*   Requires `react-webcam` for live capture.
*   Requires `navigator.geolocation` for GPS.
*   Submit via `FormData`.

---

## ✅ 4. Definition of Done (DoD)
- [ ] `schema.prisma` is updated and migrated without errors.
- [ ] Multer middleware handles attendance photos securely.
- [ ] Service layer accurately calculates Geofence (Haversine) and Late thresholds.
- [ ] API rejects check-ins without photos.
- [ ] Audit Log is recorded upon successful check-in.