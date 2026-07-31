# Sprint 3: Payroll Component Settings UI - Implementation Plan

## 0. Pre-Step: Fix Seed Permissions
**File:** `backend/prisma/seed.ts`
- **Issue:** The `SUPER_ADMIN` role lacks `settings:*` permissions, causing a 403 error for API calls. Also, `seed.ts` currently only uses `findFirst` to find roles but does not ensure they exist with the correct permissions.
- **Action:** Add code to `seed.ts` to `upsert` the `SUPER_ADMIN` role and its permissions (`settings:view`, `settings:create`, `settings:edit`, `settings:delete`).
- **Commit:** `fix(seed): ensure SUPER_ADMIN has all settings permissions`

## 1. Replace `mockData` with API Calls
**File:** `hris/src/pages/Settings.jsx`
- **Action:** Remove imports for `USERS` and `AUDIT_LOGS` from `../utils/mockData`.
- **Action:** Import `useToast` and add `useEffect` to fetch `/rbac/users` and `/rbac/audit-logs` from the API. Update state variables accordingly.
- **Commit:** `fix(settings): replace mockData with real API calls for users and audit logs`

## 2. Payroll Component Manager UI
**File:** `hris/src/pages/Settings.jsx`
- **Action:** Add state for `components`, `compForm`, `editingComp`, `testVars`, `testResult`, etc.
- **Action:** Add a new `useEffect` block that fetches `/payroll-components` when the `payroll` tab is active.
- **Action:** Replace the static Payroll tab content with a dynamic `Tbl` showing the fetched components. Add a "+ สร้าง Component" button.
- **Action:** Implement `handleSaveComp` to create/update components via `POST /payroll-components` or `PUT /payroll-components/:id`.
- **Action:** Implement `handleDeleteComp` and add a `ConfirmModal` for soft-deleting components.

## 3. Modal & Formula Tester
**File:** `hris/src/pages/Settings.jsx`
- **Action:** Create a `Modal` for adding/editing a component (`compForm`).
- **Action:** Implement form inputs for code, name, type, calcMethod, formula/functionName, sortOrder, isTaxable, isSSOBase, isActive.
- **Action:** Add a Formula Tester UI that allows testing the formula via `POST /payroll-components/test`.
- **Action:** Implement `handleTestFormula` to send dummy variables and display the test result.
- **Commit:** `feat(settings): add Payroll Component manager UI with formula tester`
