=== SPRINT: Employee Module — Critical Bug Fixes (F1–F4) ===

Read CONTEXT.md and tasks.md first.
This is a bug-fix sprint only. No new features. No UI changes.

PLANNING MODE: Produce an Implementation Plan Artifact covering 
all 4 fixes before writing a single line of code.
Wait for my approval before implementing.

---

## F1: Move empCode generation to backend

PROBLEM:
Employee.jsx has this at the top (module-level variable):
  let _empCodeCounter = 5;
  payload.empCode = `EMP${String(_empCodeCounter).padStart(3, '0')}`;

This resets on every page refresh and will produce duplicate 
empCodes if two tabs are open simultaneously.

FIX:
- Remove empCode generation entirely from Employee.jsx
- Backend employee.controller.ts must auto-generate empCode 
  on POST /api/employees
- Use this pattern:
    const count = await prisma.employee.count();
    const empCode = `EMP${String(count + 1).padStart(3, '0')}`;
- empCode must NOT be in the POST body from frontend

Show me current employee.controller.ts create() function 
before proposing the fix.

---

## F2: Fix undefined setEmpDocs in Employee.jsx

PROBLEM:
Employee.jsx line ~66:
  setEmpDocs(p => [...p, newDoc]);
  
setEmpDocs is never declared anywhere in the component.
This will throw ReferenceError the moment a user uploads a document.

FIX:
- Audit the full handleFileUpload function
- If document state is managed in selected.docs only, 
  remove the setEmpDocs call entirely
- If docs need their own state, add: const [empDocs, setEmpDocs] = useState([]);
- Verify EmployeeDocs component receives docs correctly after fix
- Do NOT change EmployeeDocs.jsx unless necessary

---

## F3: Replace all hardcoded fetch() with api Axios instance

PROBLEM:
Employee.jsx uses raw fetch() with hardcoded URLs in 3 places:
  fetch("http://localhost:3000/api/employees", ...)
  fetch(`http://localhost:3000/api/employees/${editingEmp}`, ...)
  fetch(`http://localhost:3000/api/employees/${id}`, ...)

And in useEffect for depts/positions:
  fetch("http://localhost:3000/api/departments", ...)
  fetch("http://localhost:3000/api/positions", ...)

This bypasses the Axios interceptor that handles:
  - Auto-attach JWT token
  - 401 → auto refresh token (P4-3)
  - Consistent error handling

FIX:
- Find where the api Axios instance is defined 
  (likely src/utils/api.js or src/services/api.js)
  Run: find hris/src -name "api.js" -o -name "api.ts" | head -5
- Replace ALL fetch() calls in Employee.jsx with api.get/post/put/delete
- Replace useEffect dept/position fetch() calls with api.get()
- Remove manual Authorization header construction — interceptor handles it
- Keep the same state update logic, only change the HTTP call

---

## F4: Remove DataScope filter from frontend

PROBLEM:
Employee.jsx line ~81:
  const viewData = !isHR ? emps.filter(e => e.id === user.empId) : emps;

This filters employees on the FRONTEND. It is insecure because:
- All employee records are still sent over the network
- Anyone can inspect network tab and see all employees
- Backend buildEmployeeWhereClause() already does this correctly

FIX:
- Remove this line entirely:
    const viewData = !isHR ? emps.filter(e => e.id === user.empId) : emps;
- Replace with:
    const viewData = emps;
- Confirm that useEmployees hook calls GET /api/employees
  and that the backend already scopes by DataScope
- Run: grep -n "buildEmployeeWhereClause" backend/src/controllers/employee.controller.ts
  Show me the output to confirm backend scope is active

---

## Commit Strategy

One commit per fix:
  fix(employee): move empCode generation to backend controller
  fix(employee): resolve undefined setEmpDocs in handleFileUpload  
  fix(employee): replace fetch() with api Axios instance
  fix(employee): remove insecure frontend DataScope filter

DO NOT combine into one commit.
DO NOT touch EmployeeProfile.jsx, EmployeeDocs.jsx, 
EmployeeHistory.jsx, or EmployeeOnboarding.jsx unless F2 requires it.
DO NOT add new features or UI changes in this sprint.

---

Produce the Implementation Plan Artifact now.
Show me findings for each F before proposing solutions.
Wait for approval.