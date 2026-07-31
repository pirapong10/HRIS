=== SPRINT: Organizational Hierarchy & Multi-Branch Authorization ===

Read CONTEXT.md, tasks.md, Blueprint.md, and AUTHORIZATION_DESIGN.md first.

PLANNING MODE: Produce an Implementation Plan Artifact covering all steps.
Show current code for every file before proposing changes.
Wait for my approval before writing any code.

---

## CONTEXT: สิ่งที่มีแล้ว (อย่า touch โดยไม่จำเป็น)

- Department model มี parentId + self-relation ✅
- circular reference check ใน updateDepartment ✅
- buildEmployeeWhereClause() ทำงานอยู่ ให้ EXTEND เท่านั้น
- DataScope, PayrollScope, AuthGroup scope — ทำงานอยู่ ให้ EXTEND เท่านั้น

---

## STEP 1: ขยาย Department type

File: backend/prisma/schema.prisma

Show me current type field comment first:
  grep -n "type.*Company\|type.*Division\|type.*Department" backend/prisma/schema.prisma

Change the comment on type field to document all supported values:

```prisma
type String @default("Department")
// Supported: Company | Region | Branch | Division | Department | Section | Team
```

No migration needed — type is just a String field, no enum constraint.

Then verify frontend Organization module supports these types:
  grep -n "Company\|Division\|Department\|Section\|Team\|Branch\|Region" hris/src/pages/Organization.jsx | head -20

If Branch and Region are missing from any dropdown/select in the UI,
add them to the options list. Show me the current options before changing.

Commit: chore(org): document all supported Department.type values incl Branch and Region

---

## STEP 2: Fix getDepartments() to return tree structure

File: backend/src/controllers/department.controller.ts

Current getDepartments() returns a flat array — frontend cannot render
hierarchy without building the tree itself.

Show me current getDepartments() first (already have it, confirm no changes since audit).

Replace with tree-building version:

```typescript
export const getDepartments = async (req: Request, res: Response) => {
  try {
    const all = await prisma.department.findMany({
      where: { status: 'active' },
      include: {
        head: {
          select: { id: true, name: true, empCode: true }
        },
        costCenter: {
          select: { id: true, name: true, code: true }
        },
        _count: {
          select: { employees: { where: { status: 'active' } } }
        }
      },
      orderBy: { id: 'asc' }
    });

    // Build tree in memory
    const map = new Map<number, any>();
    all.forEach(d => map.set(d.id, { 
      ...d, 
      employeeCount: d._count.employees,
      children: [] 
    }));

    const roots: any[] = [];
    map.forEach(dept => {
      if (dept.parentId && map.has(dept.parentId)) {
        map.get(dept.parentId).children.push(dept);
      } else {
        roots.push(dept);
      }
    });

    res.json(roots);
  } catch (error) {
    console.error('getDepartments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
```

IMPORTANT: After changing this, check if frontend Organization.jsx
breaks because it expects a flat array:

  grep -n "departments\.map\|departments\.filter\|departments\.find" hris/src/pages/Organization.jsx

If frontend expects flat array → also expose a flat endpoint:
  GET /api/departments?flat=true → return flat array (for dropdowns)
  GET /api/departments          → return tree (for org chart display)

Show me the grep output and propose how to handle both cases.

Commit: feat(org): getDepartments returns tree structure with children[]

---

## STEP 3: Add expandToSubtree() to scopeFilter.ts

File: backend/src/utils/scopeFilter.ts

Show me full current file first:
  cat backend/src/utils/scopeFilter.ts

Add this new function BEFORE buildEmployeeWhereClause():

```typescript
/**
 * Recursively expands a list of department IDs to include
 * all descendant departments (subtree).
 * 
 * Example: expandToSubtree([2]) where dept 2 has children [3,4]
 *          and dept 3 has children [5] → returns [2,3,4,5]
 */
export async function expandToSubtree(deptIds: number[]): Promise<number[]> {
  if (!deptIds || deptIds.length === 0) return [];
  
  const result = new Set<number>(deptIds);
  const queue = [...deptIds];

  let safetyCounter = 0; // prevent infinite loop
  const MAX_DEPTH = 10;

  while (queue.length > 0 && safetyCounter < MAX_DEPTH * result.size) {
    const parentId = queue.shift()!;
    const children = await prisma.department.findMany({
      where: { parentId, status: 'active' },
      select: { id: true }
    });
    children.forEach(c => {
      if (!result.has(c.id)) {
        result.add(c.id);
        queue.push(c.id);
      }
    });
    safetyCounter++;
  }

  return [...result];
}
```

Then extend buildEmployeeWhereClause() to use expandToSubtree():

Find the section that builds deptId filter (both from DataScope and AuthGroup)
and wrap the final deptIds set with expandToSubtree() before querying:

```typescript
// After collecting all deptIds from DataScope + AuthGroup + JWT:
if (deptIds.size > 0) {
  // Expand to include all descendant departments
  const expandedDeptIds = await expandToSubtree([...deptIds]);
  where.deptId = { in: expandedDeptIds };
}
```

Also extend buildPayrollWhereClause() the same way:
Find where departments are used in PayrollScope filter and wrap with expandToSubtree().

Show me the diff for both functions before implementing.

Commit: feat(scope): add expandToSubtree() for hierarchical dept scope resolution

---

## STEP 4: Add hierarchy-aware DataScope assignment

File: backend/src/controllers/rbac.controller.ts (or wherever DataScope is managed)

First show me:
  grep -n "dataScope\|DataScope" backend/src/controllers/rbac.controller.ts | head -20
  grep -n "PUT.*scope\|POST.*scope\|dataScope" backend/src/routes/rbac.routes.ts

When Admin assigns DataScope to a user, they should be able to pick:
- A specific department (leaf node) → scope is that dept only
- A Branch/Region/Division node → scope covers entire subtree automatically
  via expandToSubtree() at query time

No schema change needed — scopeDeptIds already stores JSON array.
The expansion happens at QUERY time in buildEmployeeWhereClause(), not at SAVE time.

Verify the current DataScope update endpoint accepts departmentIds correctly.
Show me the current implementation.

If the endpoint is missing or incomplete, add:

```typescript
// PUT /api/rbac/users/:id/scope
export const updateUserScope = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { departmentIds, costCenterIds, employeeTypes, jobGrades } = req.body;

  // Validate: all deptIds must exist and be active
  if (departmentIds?.length > 0) {
    const valid = await prisma.department.count({
      where: { id: { in: departmentIds }, status: 'active' }
    });
    if (valid !== departmentIds.length) {
      return res.status(400).json({ message: 'One or more department IDs are invalid' });
    }
  }

  const scope = await prisma.dataScope.upsert({
    where: { userId: Number(id) },
    update: {
      departmentIds: departmentIds ? JSON.stringify(departmentIds) : null,
      costCenterIds: costCenterIds ? JSON.stringify(costCenterIds) : null,
      employeeTypes: employeeTypes ? JSON.stringify(employeeTypes) : null,
      jobGrades: jobGrades ? JSON.stringify(jobGrades) : null,
    },
    create: {
      userId: Number(id),
      departmentIds: departmentIds ? JSON.stringify(departmentIds) : null,
      costCenterIds: costCenterIds ? JSON.stringify(costCenterIds) : null,
      employeeTypes: employeeTypes ? JSON.stringify(employeeTypes) : null,
      jobGrades: jobGrades ? JSON.stringify(jobGrades) : null,
    }
  });

  await writeAudit({
    userId: req.user!.id,
    action: 'UPDATE',
    module: 'access_control',
    recordId: String(id),
    details: `Updated DataScope for user ${id}: depts=${JSON.stringify(departmentIds)}`,
    ipAddress: req.ip
  });

  res.json(scope);
};
```

Commit: feat(rbac): add/verify DataScope update endpoint with dept validation

---

## STEP 5: Seed data — สร้าง hierarchy จริงสำหรับ testing

File: backend/prisma/seed_company.js (or equivalent seed file)

Show me current seed file first:
  cat backend/prisma/seed_company.js | head -60

Add multi-branch hierarchy to seed data.
Create in ORDER (parent before children):

```javascript
// Level 0 — Company root
{ code: 'HQ',     name: 'สำนักงานใหญ่',      type: 'Company',    parentId: null }

// Level 1 — Regions + HQ Division
{ code: 'REG-C',  name: 'ภาคกลาง',            type: 'Region',     parentId: HQ.id }
{ code: 'REG-N',  name: 'ภาคเหนือ',            type: 'Region',     parentId: HQ.id }
{ code: 'DIV-HQ', name: 'ฝ่ายสนับสนุน HQ',    type: 'Division',   parentId: HQ.id }

// Level 2 — Branches under regions
{ code: 'BKK',    name: 'สาขากรุงเทพ',         type: 'Branch',     parentId: REG_C.id }
{ code: 'CNX',    name: 'สาขาเชียงใหม่',        type: 'Branch',     parentId: REG_N.id }
{ code: 'LPG',    name: 'สาขาลำปาง',            type: 'Branch',     parentId: REG_N.id }

// Level 3 — Departments under branches
{ code: 'BKK-HR', name: 'HR กรุงเทพ',          type: 'Department', parentId: BKK.id }
{ code: 'BKK-IT', name: 'IT กรุงเทพ',          type: 'Department', parentId: BKK.id }
{ code: 'CNX-HR', name: 'HR เชียงใหม่',         type: 'Department', parentId: CNX.id }
{ code: 'CNX-IT', name: 'IT เชียงใหม่',         type: 'Department', parentId: CNX.id }

// Level 4 — Sections (optional, for depth test)
{ code: 'CNX-IT-SUP', name: 'IT Support เชียงใหม่', type: 'Section', parentId: CNX_IT.id }
```

After seeding, verify tree with:
  SELECT id, name, type, parentId FROM "Department" ORDER BY parentId NULLS FIRST, id;

Commit: chore(seed): add multi-branch org hierarchy for testing

---

## STEP 6: Verify end-to-end

Do NOT skip any of these checks. Show ALL outputs.

### Test A — Tree API
curl -s http://localhost:3000/api/departments \
  -H "Authorization: Bearer <admin_token>" | python -m json.tool | grep -E "name|type|children|id"

Expected: nested JSON with children arrays, not flat array

### Test B — Subtree scope expansion
Create a test user with DataScope = { departmentIds: [REG_N.id] }
Then call GET /api/employees as that user
Expected: sees employees from REG_N + CNX + LPG + CNX_HR + CNX_IT + CNX_IT_SUP
NOT expected: sees employees from BKK or HQ

Add console.log in expandToSubtree() temporarily:
  console.log('[expandToSubtree] input:', deptIds, '→ expanded:', result)
Show me the log output.

### Test C — AuthGroup subtree scope
Create AuthGroup with scopeDeptIds = [CNX.id]
Assign to test user
Call GET /api/employees
Expected: sees only CNX subtree employees

### Test D — Flat array still works for dropdowns
curl -s "http://localhost:3000/api/departments?flat=true" \
  -H "Authorization: Bearer <admin_token>" | python -m json.tool | grep "name"

Expected: flat array (for Add Employee modal dropdown)

### Test E — expandToSubtree safety
Temporarily create a circular reference directly in DB:
  UPDATE "Department" SET "parentId" = <child_id> WHERE id = <parent_id>;
Then call GET /api/employees
Expected: does NOT infinite loop, returns within 2 seconds
Then fix the circular reference.

---

## Commit Strategy

  chore(org): document all supported Department.type values incl Branch and Region
  feat(org): getDepartments returns tree structure with children[]
  feat(scope): add expandToSubtree() for hierarchical dept scope resolution
  feat(rbac): add/verify DataScope update endpoint with dept validation
  chore(seed): add multi-branch org hierarchy for testing

One commit per step. Do not combine.

---

## PLANNING MODE REMINDER

Before writing any code, show me:

1. grep output from STEP 1 (current type values in frontend)
2. grep output from STEP 2 (how frontend uses departments array)
3. Full current scopeFilter.ts
4. grep output from STEP 4 (current DataScope endpoints)
5. First 60 lines of seed file

Then produce Implementation Plan Artifact covering all 6 steps.
Flag any assumption you make about existing code.
Wait for my approval before implementing each step.