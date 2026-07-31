# Payroll.jsx Implementation Plan

## Goal
Replace all `mockData` imports and usage with real API integration in `hris/src/pages/Payroll.jsx`.

## Steps
1. **Remove Mock Data Imports & Add API/Toast** (Fix 1)
   - Remove `import { INIT_PAYROLL, ... } from '../utils/mockData'`
   - Add `import api from '../utils/api'` and `import { useToast }`

2. **Update State Variables** (Fix 2)
   - Initialize `payrolls` as `[]`.
   - Add `payrollRuns`, `loading`, and `selectedPeriod` (default to current `YYYY-MM`).

3. **Fetch Real Payroll Data** (Fix 3)
   - Update `useEffect` to use `api.get('/payroll')`.
   - Set the `payrolls` state with the response data and handle loading/errors with toasts.

4. **Dynamic Period & API for runPayroll** (Fix 4)
   - Modify `runPayroll` to use `selectedPeriod`.
   - Use `api.post('/payroll/run')` and `showToast` for success/error handling.

5. **Period Selector UI** (Fix 5)
   - Add a month picker input (`<input type="month">`) for `selectedPeriod` in the "รัน Payroll" tab.
   - Update the UI to reflect dynamic period text and loading state.

6. **Replace getEmp() Mock Lookups** (Fix 6)
   - The backend API already includes `employee: true` (verified).
   - Replace all `getEmp(r.empId)` and `getEmpName(r.empId)` calls with `r.employee?.name` or `r.employee?.empCode`.

7. **Update Bank Export** (Fix 7)
   - Replace `getEmp()` with `r.employee`.
   - Attempt to use `/api/payroll/:id/export`. Fallback to client-side text generation using the data from state if needed.

8. **Update Bulk Download (ZIP)** (Fix 8)
   - Replace `getEmp()` with `pr.employee`.
   - Generate ZIP only for the `selectedPeriod`.

9. **Update Tax Tab** (Fix 9)
   - Remove `TAX_BRACKETS` import and use a hardcoded `TAX_BRACKETS_DISPLAY` array in the component.
   - Use actual data from the `payrolls` state instead of the `EMPLOYEES` mock for the calculation examples.

10. **Fix YTD Calculations** (Fix 10)
    - Remove the hardcoded `selected.gross * 6` and `selected.tax * 6`.
    - Calculate YTD dynamically by filtering the `payrolls` state for records of the same employee in the same year, up to the selected period.

11. **Update StatCards Period** (Fix 11)
    - Replace the hardcoded "พ.ค. 2568" with a dynamically generated Thai month/year string based on `selectedPeriod`.

12. **Remove Frontend Scope Filter** (Fix 12)
    - Change `myData` to equal `payrolls`, relying on the backend to enforce `PayrollScope` based on the user's role.

## Commit Strategy
The implementation will be divided into 4 logical commits:
1. `fix(payroll): remove mockData imports, add real API fetch with period selector`
2. `fix(payroll): replace getEmp() mock lookups with employee relation from API`
3. `fix(payroll): fix YTD calculation from real payroll history`
4. `fix(payroll): replace hardcoded period and alert() with dynamic + toast`
