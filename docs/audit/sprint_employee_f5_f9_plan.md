# Implementation Plan: Sprint Employee Module (F5 - F9)

This plan outlines the architecture, database schema changes, backend logic, and frontend upgrades required to implement the remaining Employee module features (F5 to F9).

---

## 📅 Architecture & Schema Modifications

### 1. Database Schema Extension (F5)

We will add new personal, national identity, and tax fields to the `Employee` model in [schema.prisma](file:///d:/Project/HRIS/backend/prisma/schema.prisma):

```prisma
model Employee {
  // Existing fields ...
  
  // New fields
  nationalId  String?   // เลขบัตรประชาชน / passport
  ssoNumber   String?   // เลขผู้ประกันตน
  taxId       String?   // เลขประจำตัวผู้เสียภาษี
  taxMethod   String?   @default("progressive")
  address     String?   // ที่อยู่
  
  // Existing relations ...
}
```

---

## 🛠️ Detailed Phase-by-Phase Plan

### Feature 5: Bank, SSO, Tax fields in Form Modal & Profile
1. **Database Migration**: Run the Prisma migration to add the new fields to the database. Since the database already contains records, the new fields are optional (`String?`) to prevent breaking existing data.
2. **Form Restructuring (Employee.jsx)**:
   - Introduce a tabbed interface with 4 tabs inside the modal:
     - **ข้อมูลพื้นฐาน**: `name`, `deptId`, `posId`, `shiftId`, `type`, `hireDate`, `dob`, `gender` (Dropdown: ชาย / หญิง / ไม่ระบุ).
     - **ข้อมูลติดต่อ**: `phone`, `email`, `address` (textarea), `nationalId`, and Emergency Contact fields.
     - **การเงิน** (Only visible if `isHR` is true): `salary`, `bank` (Dropdown: กสิกรไทย, กรุงเทพ, ไทยพาณิชย์, กรุงไทย, ทหารไทยธนชาต, อื่นๆ), `bankAcc`, `taxMethod` (Dropdown: Progressive, Flat Rate), `ssoNumber`, `taxId`.
     - **ข้อมูลประเทศ**: `workCountry`, `taxCountry` (dropdowns/inputs).
   - Update `defaultEmp` state initializer to contain all new fields.
3. **Profile Panel Update (EmployeeProfile.jsx)**:
   - Update to render sections for:
     - **ข้อมูลส่วนตัว**: `dob`, `gender`, `nationalId`, `address`.
     - **ข้อมูลการเงิน** (HR only): `bank`, `bankAcc`, `ssoNumber`, `taxId`, `taxMethod`.
     - **ข้อมูลประเทศ**: `workCountry`, `taxCountry` (shown only if `workCountry !== 'TH'`).

### Feature 6: Advanced Filter Bar (Dept, Type, Status)
1. **Backend Integration (employee.controller.ts)**:
   - In `getEmployees`, extract query parameters: `deptId`, `type`, `status`.
   - Update `finalWhere` query safely:
     ```typescript
     if (deptId) finalWhere.deptId = Number(deptId);
     if (type) finalWhere.type = type as string;
     finalWhere.status = (status as string) || 'active';
     ```
2. **Hook Extension (useEmployees.js)**:
   - Pass `deptId`, `type`, and `status` query parameters to the `api.get('/employees')` request.
3. **Frontend UI Update (Employee.jsx)**:
   - Add selectors for Department, Type, and Status filters next to the Search bar.
   - Trigger a refetch and reset `page` to `1` when any filter changes.

### Feature 7: Salary & Career History Tracking
1. **Backend Trigger (employee.controller.ts)**:
   - In `updateEmployee`, fetch the current state before applying updates.
   - Compare `salary`, `posId`, and `deptId`.
   - If any has changed, create an `EmpHistory` record detailing the change type, old value, new value, and remark (including the user ID who updated it).
2. **Frontend UI Update (EmployeeHistory.jsx)**:
   - Render descriptive labels, colors, and calculate changes:
     - **salary**: Display "💰 ปรับเงินเดือน" with old salary, new salary, and `% change` calculated in UI.
     - **position**: Display "📋 เปลี่ยนตำแหน่ง" resolving the old and new position names (using list of positions available).
     - **department**: Display "🏢 เปลี่ยนแผนก" resolving old and new department names.

### Feature 8: Custom ConfirmModal
1. **Create Component (ConfirmModal.jsx)**:
   - Create a clean modal style matching the application theme.
2. **Integrate in Employee.jsx**:
   - Replace the legacy `window.confirm` for employee deactivation.
   - Use React state (`confirmState`) to control the display and track the target employee ID/name.

### Feature 9: Toast Notification System
1. **Create Toast Context & Provider (Toast.jsx)**:
   - Create context to handle temporary toast overlays for `success`, `error`, `info`, and `warning` types.
2. **Global Integration (App.jsx)**:
   - Wrap the main router/application structure with `<ToastProvider>`.
3. **Refactor Employee.jsx**:
   - Replace `alert()` calls for upload success, save success, and save errors with `showToast`.

---

## 🔒 Verification Plan

### Manual Verification Steps
- Check that the database migration runs cleanly without data loss.
- Verify that only HR can see financial information in both the Modal and the Profile component.
- Verify that filtering by department, type, or status updates the table in real-time.
- Check that changing a salary or position logs an entry in the History tab.
- Test the custom ConfirmModal and Toast notifications for all success/failure scenarios.
