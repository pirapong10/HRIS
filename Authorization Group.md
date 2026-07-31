=== SPRINT 1: Authorization Group — Backend Schema + API ===

Read CONTEXT.md, tasks.md, Blueprint.md, and AUTHORIZATION_DESIGN.md first.

PLANNING MODE: Produce an Implementation Plan Artifact covering all steps.
Wait for my approval before writing any code.

---

## CONTEXT: สิ่งที่มีอยู่แล้ว (อย่า touch)

- User, Role, Permission, RolePermission, UserRole — ใช้งานอยู่ ห้าม modify
- DataScope, PayrollScope — ใช้งานอยู่ ห้าม modify schema
- buildEmployeeWhereClause() — ใช้งานอยู่ ให้ EXTEND ไม่ใช่ rewrite
- loadUserPermissions() — ใช้งานอยู่ ให้ EXTEND ไม่ใช่ rewrite
- requirePermission() middleware — ใช้งานอยู่ ไม่ต้องแก้

---

## STEP 1: Schema — เพิ่ม 3 models ใหม่

เพิ่มใน backend/prisma/schema.prisma ต่อท้าย (อย่าแก้ model เดิม):

```prisma
model AuthGroup {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  color       String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  scopeDeptIds       String? // JSON: [1,2,3]
  scopeCostCenterIds String? // JSON: [1,2]
  scopeEmpTypes      String? // JSON: ["fulltime","parttime"]
  scopeJobGrades     String? // JSON: ["E1","E2"]

  permissions AuthGroupPermission[]
  members     AuthGroupMember[]
}

model AuthGroupPermission {
  id           Int        @id @default(autoincrement())
  groupId      Int
  permissionId Int
  group        AuthGroup  @relation(fields: [groupId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([groupId, permissionId])
}

model AuthGroupMember {
  id         Int       @id @default(autoincrement())
  groupId    Int
  userId     Int
  assignedBy Int
  assignedAt DateTime  @default(now())
  group      AuthGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([groupId, userId])
}
```

Also add reverse relations to existing models:
- Permission model: add `authGroupPermissions AuthGroupPermission[]`
- User model: add `authGroupMembers AuthGroupMember[]`

After editing schema.prisma, run:
  npx prisma migrate dev --name add_auth_groups
  npx prisma generate

Show migration output before proceeding.

---

## STEP 2: CRUD API — /api/auth-groups

Create: backend/src/controllers/authGroup.controller.ts
Create: backend/src/routes/authGroup.routes.ts

### Endpoints required:

GET    /api/auth-groups
  → return all active groups with member count and permission list
  → requirePermission('access_control:view')

POST   /api/auth-groups
  → create new group
  → body: { name, description?, color?, scopeDeptIds?, scopeCostCenterIds?,
             scopeEmpTypes?, scopeJobGrades?, permissionIds: number[] }
  → requirePermission('access_control:create')

GET    /api/auth-groups/:id
  → return group detail with full members list and permissions
  → requirePermission('access_control:view')

PUT    /api/auth-groups/:id
  → update group info + replace permissions (delete old, insert new)
  → body: same as POST
  → requirePermission('access_control:edit')

DELETE /api/auth-groups/:id
  → soft delete: set isActive = false
  → do NOT hard delete — preserve audit trail
  → requirePermission('access_control:delete')

POST   /api/auth-groups/:id/members
  → assign users to group
  → body: { userIds: number[] }
  → requirePermission('access_control:edit')
  → record assignedBy = req.user.id

DELETE /api/auth-groups/:id/members/:userId
  → remove user from group
  → requirePermission('access_control:edit')

GET    /api/auth-groups/:id/members
  → return members with user info (id, email, empId, roles)
  → requirePermission('access_control:view')

### Register route in backend/src/index.ts:
  app.use('/api/auth-groups', authGroupRoutes);

---

## STEP 3: Extend loadUserPermissions()

File: backend/src/utils/rbac.ts (or wherever loadUserPermissions is defined)

First run: grep -rn "loadUserPermissions" backend/src/
Show me the current full implementation before modifying.

Extend to union permissions from AuthGroup:

```typescript
export async function loadUserPermissions(userId: number) {
  // SOURCE 1: Role-based permissions (existing — do not change)
  const rolePerms = await prisma.rolePermission.findMany({
    where: { role: { userRoles: { some: { userId } } } },
    include: { permission: { select: { code: true } } }
  });

  // SOURCE 2: AuthGroup permissions (NEW)
  const groupPerms = await prisma.authGroupPermission.findMany({
    where: {
      group: {
        isActive: true,
        members: { some: { userId } }
      }
    },
    include: { permission: { select: { code: true } } }
  });

  // Union — deduplicate
  const allCodes = [
    ...rolePerms.map(p => p.permission.code),
    ...groupPerms.map(p => p.permission.code)
  ];

  return {
    permissions: [...new Set(allCodes)],
    // keep other fields that existing callers expect
  };
}
```

IMPORTANT: Show the current return shape of loadUserPermissions()
before modifying — must preserve existing callers.

---

## STEP 4: Extend buildEmployeeWhereClause()

File: backend/src/utils/scopeFilter.ts

Extend to union scope from AuthGroup:

```typescript
export async function buildEmployeeWhereClause(user: RequestUser) {
  if (user.level >= 80) return {};

  // SOURCE 1: DataScope (existing — do not change logic)
  const dataScope = await prisma.dataScope.findUnique({
    where: { userId: user.id }
  });

  // SOURCE 2: AuthGroup scopes (NEW)
  const authGroups = await prisma.authGroup.findMany({
    where: {
      isActive: true,
      members: { some: { userId: user.id } }
    },
    select: {
      scopeDeptIds: true,
      scopeCostCenterIds: true,
      scopeEmpTypes: true,
      scopeJobGrades: true
    }
  });

  // Union all deptIds from all sources
  const deptIds = new Set<number>();
  const empTypes = new Set<string>();
  const jobGrades = new Set<string>();

  // From DataScope
  if (dataScope?.departmentIds) {
    JSON.parse(dataScope.departmentIds).forEach((id: number) => deptIds.add(Number(id)));
  }
  if (dataScope?.employeeTypes) {
    JSON.parse(dataScope.employeeTypes).forEach((t: string) => empTypes.add(t));
  }
  if (dataScope?.jobGrades) {
    JSON.parse(dataScope.jobGrades).forEach((g: string) => jobGrades.add(g));
  }

  // From AuthGroups
  authGroups.forEach(g => {
    if (g.scopeDeptIds) JSON.parse(g.scopeDeptIds).forEach((id: number) => deptIds.add(Number(id)));
    if (g.scopeEmpTypes) JSON.parse(g.scopeEmpTypes).forEach((t: string) => empTypes.add(t));
    if (g.scopeJobGrades) JSON.parse(g.scopeJobGrades).forEach((gr: string) => jobGrades.add(gr));
  });

  // EMPLOYEE level — always restrict to self
  if (user.level <= 10) {
    return { id: user.empId || -1 };
  }

  // No scope from any source
  if (deptIds.size === 0 && empTypes.size === 0 && jobGrades.size === 0) {
    // Fall back to JWT deptIds
    if (user.deptIds?.length > 0) {
      return { deptId: { in: user.deptIds } };
    }
    return { id: -1 };
  }

  // Build combined where clause
  const where: Prisma.EmployeeWhereInput = {};
  if (deptIds.size > 0) where.deptId = { in: [...deptIds] };
  if (empTypes.size > 0) where.type = { in: [...empTypes] };
  if (jobGrades.size > 0) where.position = { grade: { in: [...jobGrades] } };

  return where;
}
```

IMPORTANT: Show current full buildEmployeeWhereClause() before modifying.
Run: cat backend/src/utils/scopeFilter.ts

---

## STEP 5: Audit Logging

All AuthGroup mutations must call writeAudit():

- Create group → action: 'CREATE', module: 'access_control'
- Update group → action: 'UPDATE', module: 'access_control'  
- Delete group → action: 'DELETE', module: 'access_control'
- Add member   → action: 'UPDATE', details: `Added user ${userId} to group ${groupId}`
- Remove member → action: 'UPDATE', details: `Removed user ${userId} from group ${groupId}`

---

## Commit Strategy

One commit per step:
  feat(schema): add AuthGroup, AuthGroupPermission, AuthGroupMember models
  feat(api): add CRUD endpoints for /api/auth-groups
  feat(rbac): extend loadUserPermissions to union AuthGroup permissions
  feat(scope): extend buildEmployeeWhereClause to union AuthGroup scopes
  feat(audit): add audit logging to AuthGroup mutations

---

## Verification after implementation

Run these and show ALL outputs:

1. npx prisma studio (or)
   SELECT * FROM "AuthGroup"; 
   → should return empty table (migration succeeded)

2. curl -X POST http://localhost:3000/api/auth-groups \
     -H "Authorization: Bearer <admin_token>" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "หัวหน้ากะ IT",
       "color": "#3B82F6",
       "scopeDeptIds": "[3]",
       "permissionIds": [<shift:view id>, <shift:approve id>, <ot:approve id>, <leave:approve id>]
     }'
   → should return created group with id

3. curl -X POST http://localhost:3000/api/auth-groups/1/members \
     -H "Authorization: Bearer <admin_token>" \
     -H "Content-Type: application/json" \
     -d '{ "userIds": [<test_user_id>] }'
   → should return success

4. Login as test_user → check JWT permissions include shift:approve, ot:approve
   grep for these codes in the token payload (decode at jwt.io)

5. GET /api/employees as test_user
   → should return ONLY employees in deptId 3

Show all 5 outputs before marking Sprint 1 complete.

---

## PLANNING MODE REMINDER

Do NOT write code until you show me:
1. Current loadUserPermissions() full implementation
2. Current buildEmployeeWhereClause() full implementation  
3. Implementation Plan Artifact for all 5 steps
4. Estimated files to be created/modified list

Wait for approval on each step if changes differ from this spec.