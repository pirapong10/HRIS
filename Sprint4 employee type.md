=== SPRINT 4: EmployeeType — Full Implementation ===

Read CONTEXT.md, tasks.md first.
PLANNING MODE — show plan and ALL pre-flight checks before any code.
This sprint touches Payroll Engine (verified Sprint 1-2). Extra caution required.

---

## CONTEXT: สิ่งที่มีอยู่แล้ว (ห้ามเปลี่ยน logic)

- runPayrollEngine() — ทำงานถูกต้อง verified ห้ามแก้ core execution logic
- calculateThaiTax() — bracket ถูกต้อง ห้ามแก้
- SSO-before-TAX guard — ห้ามลบ
- Employee.type = String ("fulltime"/"parttime"/"contract") — ต้อง migrate
- Employee.taxMethod = String ("progressive") — ต้อง migrate ไปอยู่ใน EmployeeType

---

## PRE-FLIGHT: Show these before planning

1. cat backend/prisma/schema.prisma | grep -A 5 "model Position"
   (ต้องรู้ว่า Position มี relation อะไรบ้าง)

2. node -e "const {PrismaClient}=require('@prisma/client');
   const p=new PrismaClient();
   p.employee.groupBy({by:['type'],_count:true})
   .then(r=>r.forEach(x=>console.log(x))).finally(()=>process.exit(0))"
   (ต้องรู้ว่ามี type ไหนบ้างใน DB ปัจจุบัน และแต่ละ type มีกี่คน)

3. Show current runPayroll() full function:
   cat backend/src/controllers/payroll.controller.ts | grep -A 80 "export const runPayroll"

Show all 3 outputs before continuing.

---

## STEP 1: Schema — สร้าง EmployeeType model

Add to backend/prisma/schema.prisma:

```prisma
model EmployeeType {
  id          Int      @id @default(autoincrement())
  code        String   @unique  // "fulltime", "parttime", "contract", "intern"
  name        String            // "พนักงานประจำ", "พาร์ทไทม์"
  color       String   @default("#3B82F6")
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)

  // SSO Rules
  ssoEnabled      Boolean @default(true)
  ssoRate         Float   @default(0.05)
  ssoCap          Float   @default(750)
  ssoEmployerRate Float   @default(0.05)

  // Tax Rules
  taxMethod    String  @default("progressive")
  // "progressive" = Thai RD bracket (uses calculateThaiTax function)
  // "flat"        = flat rate %
  // "wht"         = withholding tax %
  // "exempt"      = no tax
  taxFlatRate  Float?

  // Work Rules
  otEligible       Boolean @default(true)
  leaveEligible    Boolean @default(true)
  annualLeave      Int     @default(6)
  includeInPayroll Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  employees Employee[]
}
```

Also modify Employee model — add relation alongside existing type field:
```prisma
  // NEW — add these 2 lines
  employeeTypeId  Int?
  employeeType    EmployeeType? @relation(fields: [employeeTypeId], references: [id])
  
  // KEEP existing type String field — will use during migration, remove later
  type       String  @default("fulltime")
```

Run: npx prisma migrate dev --name add_employee_type_model
Show migration output.

Commit: feat(schema): add EmployeeType model with SSO/tax/work rules

---

## STEP 2: Seed default EmployeeTypes

Add to backend/prisma/seed.ts — upsertEmployeeTypes() function:

```typescript
async function upsertEmployeeTypes() {
  const types = [
    {
      code: 'fulltime', name: 'พนักงานประจำ', color: '#3B82F6', sortOrder: 1,
      ssoEnabled: true, ssoRate: 0.05, ssoCap: 750, ssoEmployerRate: 0.05,
      taxMethod: 'progressive', taxFlatRate: null,
      otEligible: true, leaveEligible: true, annualLeave: 6, includeInPayroll: true
    },
    {
      code: 'parttime', name: 'พาร์ทไทม์', color: '#8B5CF6', sortOrder: 2,
      ssoEnabled: true, ssoRate: 0.05, ssoCap: 750, ssoEmployerRate: 0.05,
      taxMethod: 'progressive', taxFlatRate: null,
      otEligible: true, leaveEligible: false, annualLeave: 0, includeInPayroll: true
    },
    {
      code: 'contract', name: 'สัญญาจ้าง (Contractor)', color: '#F59E0B', sortOrder: 3,
      ssoEnabled: false, ssoRate: 0, ssoCap: 0, ssoEmployerRate: 0,
      taxMethod: 'wht', taxFlatRate: 0.03,
      otEligible: false, leaveEligible: false, annualLeave: 0, includeInPayroll: true
    },
    {
      code: 'intern', name: 'นักศึกษาฝึกงาน', color: '#10B981', sortOrder: 4,
      ssoEnabled: false, ssoRate: 0, ssoCap: 0, ssoEmployerRate: 0,
      taxMethod: 'exempt', taxFlatRate: null,
      otEligible: false, leaveEligible: false, annualLeave: 0, includeInPayroll: false
    },
  ];

  for (const t of types) {
    await prisma.employeeType.upsert({
      where: { code: t.code },
      update: t,
      create: t,
    });
  }
  console.log('✅ EmployeeType seeded');
}
```

Call from main() in seed.ts.
Run: npx ts-node prisma/seed.ts
Show seed output.

Commit: chore(seed): add default EmployeeType records

---

## STEP 3: Migrate Employee data — link employeeTypeId

CRITICAL: Do NOT delete Employee.type string field yet.
Only populate employeeTypeId from existing type string.

```typescript
// Run as standalone script: backend/prisma/migrate_employee_types.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function migrate() {
  const types = await prisma.employeeType.findMany();
  const typeMap = new Map(types.map(t => [t.code, t.id]));

  const employees = await prisma.employee.findMany({
    select: { id: true, type: true, employeeTypeId: true }
  });

  let updated = 0;
  for (const emp of employees) {
    const typeId = typeMap.get(emp.type);
    if (typeId && emp.employeeTypeId !== typeId) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { employeeTypeId: typeId }
      });
      updated++;
    }
  }
  console.log(`Migrated ${updated} / ${employees.length} employees`);

  // Verify
  const unmapped = await prisma.employee.count({ where: { employeeTypeId: null } });
  console.log(`Employees without employeeTypeId: ${unmapped}`);
}

migrate().finally(() => prisma.$disconnect());
```

Run: npx ts-node prisma/migrate_employee_types.ts
Show output — must show 0 unmapped employees.

Commit: chore(data): migrate employee type string to employeeTypeId relation

---

## STEP 4: Update Payroll Engine to read EmployeeType rules

### 4a: Update runPayrollEngine() in payrollEngine.ts

Add EmployeeType context to variables:

```typescript
export async function runPayrollEngine(
  baseVariables: Record<string, number>,
  employeeTypeId?: number  // NEW optional param
): Promise<{ computed, results, gross, deductions, net }> {
  
  // Load EmployeeType rules if provided
  let empType = null;
  if (employeeTypeId) {
    empType = await prisma.employeeType.findUnique({
      where: { id: employeeTypeId }
    });
  }

  const components = await prisma.payrollComponent.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  });

  // ... existing execution loop unchanged ...
}
```

### 4b: Update PAYROLL_FUNCTIONS to use EmployeeType SSO rules

The current SSO formula is: `MIN(BASIC * 0.05, 750)`
This is hardcoded in the database formula string.

For employees where ssoEnabled = false (contractor, intern),
SSO should be 0 regardless of the formula.

Approach: inject EmployeeType SSO vars into scope:

```typescript
// In runPayrollEngine, before the component loop, inject type vars:
if (empType) {
  baseVariables.SSO_RATE = empType.ssoEnabled ? empType.ssoRate : 0;
  baseVariables.SSO_CAP = empType.ssoEnabled ? empType.ssoCap : 0;
  baseVariables.SSO_EMPLOYER_RATE = empType.ssoEnabled ? empType.ssoEmployerRate : 0;
  baseVariables.INCLUDE_IN_PAYROLL = empType.includeInPayroll ? 1 : 0;
}

// Default values if no type
if (!baseVariables.SSO_RATE) baseVariables.SSO_RATE = 0.05;
if (!baseVariables.SSO_CAP) baseVariables.SSO_CAP = 750;
```

Update SSO formula in DB from:
  `MIN(BASIC * 0.05, 750)`
to:
  `MIN(BASIC * SSO_RATE, SSO_CAP)`

This makes SSO formula respect EmployeeType rules automatically.

### 4c: Update calculateThaiTax to respect taxMethod

In payrollFunctions.ts, update calculateThaiTax to check empType:

Actually, better approach: inject tax override variable:
```typescript
// In runPayrollEngine:
if (empType) {
  baseVariables.TAX_METHOD = empType.taxMethod === 'progressive' ? 1 : 0;
  baseVariables.TAX_FLAT_RATE = empType.taxFlatRate || 0;
}
```

Update PAYROLL_FUNCTIONS to handle different tax methods:
```typescript
function calculateThaiTax(vars: Record<string, number>): number {
  // If taxMethod is not progressive, use flat rate or return 0
  if (vars.TAX_METHOD === 0) {
    if (vars.TAX_FLAT_RATE > 0) {
      // WHT or flat: apply flat rate to gross income
      return Math.round((vars.TaxableIncome || 0) * vars.TAX_FLAT_RATE);
    }
    return 0; // exempt
  }
  // Progressive (existing logic unchanged)
  // ...existing bracket calculation...
}
```

### 4d: Update runPayroll() controller to pass employeeTypeId

```typescript
// In payroll.controller.ts runPayroll():
// When building baseVariables per employee:
const baseVariables = {
  Salary: emp.salary,
  OTHours: otHours,
  LateMinutes: 0,
  LoanDeduction: loanDeduct,
};

const result = await runPayrollEngine(
  baseVariables,
  emp.employeeTypeId || undefined  // NEW — pass type ID
);
```

IMPORTANT: Show me the current runPayroll() baseVariables block
before modifying. Do not change anything else in that function.

### 4e: Update SSO formula in DB

```typescript
// Run after implementing engine changes:
await prisma.payrollComponent.update({
  where: { code: 'SSO' },
  data: { formula: 'MIN(BASIC * SSO_RATE, SSO_CAP)' }
});
console.log('SSO formula updated');
```

Show me before running — confirm SSO_RATE and SSO_CAP are
injected into scope before SSO component runs.

Commit: feat(payroll): update engine to read SSO and tax rules from EmployeeType

---

## STEP 5: CRUD API for EmployeeType

Create: backend/src/controllers/employeeType.controller.ts
Create: backend/src/routes/employeeType.routes.ts

Endpoints:
  GET    /api/employee-types          requirePermission('settings:view')
  POST   /api/employee-types          requirePermission('settings:create')
  PUT    /api/employee-types/:id      requirePermission('settings:edit')
  DELETE /api/employee-types/:id      requirePermission('settings:delete')
    → soft delete: isActive = false
    → block if employees assigned: check count first

Register in index.ts.

Commit: feat(api): add CRUD endpoints for EmployeeType

---

## STEP 6: Frontend — Employee form + Settings UI

### 6a: Employee.jsx — replace type dropdown

Current (hardcode):
  options={[{value:"fulltime",label:"ประจำ"},{value:"parttime",label:"พาร์ทไทม์"}]}

Replace with:
  - Add state: const [employeeTypes, setEmployeeTypes] = useState([])
  - Fetch in useEffect: api.get('/employee-types').then(r => setEmployeeTypes(r.data || []))
  - Change Sel: options={employeeTypes.map(t => ({value: t.id, label: t.name}))}
  - Change field: newEmp.employeeTypeId instead of newEmp.type
  - Badge in table: show employeeType.name + employeeType.color from r.employeeType

NOTE: Employee.type (string) stays in DB for now.
     Employee.employeeTypeId is what the form saves.
     Backend createEmployee/updateEmployee must handle employeeTypeId.

### 6b: Settings.jsx — EmployeeType management tab

Add new tab "ประเภทพนักงาน" in Settings payroll section (or create new tab).

Table columns: ชื่อ, รหัส, SSO, OT, ภาษี, จำนวนพนักงาน, actions
Modal: same section pattern as PayrollComponent modal

Show current Settings.jsx tabs before modifying:
  grep -n "tab\|Tab\|tabs" hris/src/pages/Settings.jsx | head -20

---

## Verification — CRITICAL

1. Regression test — payroll still works for fulltime employee:
   Run payroll for a fulltime employee (salary=30000, OTHours=10)
   Expected: SSO=750 (MIN(30000*0.05, 750)), TAX≈190 (progressive)
   MUST match Sprint 2 verified results exactly

2. New behavior — contractor employee:
   Create test employee with employeeTypeId = contract type id
   Run payroll
   Expected: SSO=0 (ssoEnabled=false), TAX=gross*0.03 (WHT flat rate)

3. New behavior — intern employee:
   Expected: SSO=0, TAX=0 (exempt)

4. Employee form — dropdown shows EmployeeType names not hardcode strings

5. Settings → EmployeeType tab shows 4 types with correct rules

6. git log --oneline -8 (backend)
7. git log --oneline -5 (hris/)

---

## Commit Strategy

Backend:
  feat(schema): add EmployeeType model with SSO/tax/work rules
  chore(seed): add default EmployeeType records
  chore(data): migrate employee type string to employeeTypeId relation
  feat(payroll): update engine to read SSO and tax rules from EmployeeType
  feat(api): add CRUD endpoints for EmployeeType

Frontend:
  feat(employee): replace hardcode type dropdown with EmployeeType API
  feat(settings): add EmployeeType management tab

---

## PLANNING MODE REMINDER

Show pre-flight outputs first (3 items at top).
Then produce Implementation Plan Artifact covering all 6 steps.

Flag any risk to Payroll Engine — especially:
- SSO_RATE/SSO_CAP variable injection timing vs SSO component sortOrder
- TAX_METHOD variable must be injected BEFORE TAX component runs
- SSO-before-TAX guard must still work after changes

Wait for approval before implementing each step.
DO NOT implement Step 4 (Payroll Engine) without explicit approval
after seeing Steps 1-3 work correctly.