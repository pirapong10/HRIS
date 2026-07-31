# Employee Module — Bug Fixes (F1–F4) Implementation Plan

## Findings & Analysis

### F1: Move empCode generation to backend
**Finding:** Currently, `employee.controller.ts` expects the frontend to provide all data for `createEmployee`. 
```typescript
export const createEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { id, department, position, shift, createdAt, updatedAt, ...data } = req.body;
    const employee = await prisma.employee.create({ data });
```
**Proposed Fix:** 
1. In `employee.controller.ts`, count the number of employees using `prisma.employee.count()` and generate `empCode` server-side before creation.
2. In `Employee.jsx`, remove the `_empCodeCounter` and `payload.empCode` assignments entirely so it is completely handled by the backend.

### F2: Fix undefined setEmpDocs in Employee.jsx
**Finding:** In `Employee.jsx` line 70, `setEmpDocs(p => [...p, newDoc]);` is called but `empDocs`/`setEmpDocs` is never defined with `useState`. The document state is properly handled by `setSelected` right after it: `setSelected(p => ({ ...p, docs: [...(p.docs || []), newDoc] }));`.
**Proposed Fix:** 
1. Remove `setEmpDocs(p => [...p, newDoc]);` from `handleFileUpload` completely. The existing `setSelected` call properly propagates the new document state to the `EmployeeDocs` component without needing a separate state variable.

### F3: Replace all hardcoded fetch() with api Axios instance
**Finding:** The `api` Axios instance is defined at `hris/src/utils/api.js`.
**Proposed Fix:** 
1. In `Employee.jsx`, import `api` from `../utils/api`.
2. Replace all `fetch("http://localhost:3000/api/...", opts).then(r => r.json())` calls with `api.get('/api/...')`.
3. Replace all POST/PUT/DELETE `fetch` calls in `saveEmp` and `deleteEmp` with `api.post`, `api.put`, and `api.delete`.
4. Remove manual header construction `{"Authorization": "Bearer..."}` as the interceptor in `api.js` automatically manages this.

### F4: Remove DataScope filter from frontend
**Finding:** The backend `getEmployees` function in `employee.controller.ts` already correctly invokes `await buildEmployeeWhereClause(req.user)`. The frontend redundantly applies an insecure filter on line 87.
**Proposed Fix:** 
1. In `Employee.jsx`, replace `const viewData = !isHR ? emps.filter(e => e.id === user.empId) : emps;` with `const viewData = emps;`.
2. Rename `viewData` / `filtered` usage correctly to just point directly to `emps`.

---

## Commit Strategy
The implementation will be done strictly according to your requirements. One separate Git commit will be created for each of the four fixes using the exact commit message formats specified. 

*Waiting for your approval to begin implementing these changes.*
