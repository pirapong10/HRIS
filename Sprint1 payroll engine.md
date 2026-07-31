=== SPRINT 1: Payroll Component Formula Engine ===

Read CONTEXT.md, tasks.md, Blueprint.md first.

PLANNING MODE: Produce ONE Implementation Plan Artifact.
Show current code for every file before proposing changes.
Wait for my approval before writing any code.

---

## CONTEXT: สิ่งที่มีอยู่แล้ว (ห้าม touch โดยไม่จำเป็น)

- buildPayrollWhereClause() — PayrollScope enforcement ทำงานอยู่ ห้ามแก้ logic
- calcThaiTax, calcSso, calcOTPay ใน ../utils/payroll — เป็น reference implementation
  ที่ถูกต้องตามกฎหมายไทย ใช้เป็นต้นแบบเขียน calculateThaiTax() ใหม่ ไม่ใช่ลบทิ้ง
- PayrollRun, PayrollRunDetail schema — มีอยู่แล้ว ห้ามลบ field เดิม
- DO NOT need backward compatibility — payroll runs ที่ผ่านมาไม่ต้อง match ผลลัพธ์เป๊ะ
  หลัง migrate ไปใช้ component engine

## ปัญหาที่พบใน payroll.controller.ts ปัจจุบัน (ต้องแก้ไปด้วยกัน)

1. providentFund = emp.salary * 0.05  ← hardcode ไม่ผ่าน settings
2. loan = emp.id === 1 ? 1500 : 0     ← mock data ที่ยังหลงเหลืออยู่ ต้องลบ
3. paidDate = `${period}-30`          ← hardcode วันที่ 30 ทุกเดือน ไม่ถูกต้อง
   ทุกเดือน ควรเป็นวันทำการสุดท้ายของเดือนนั้น หรือ field ที่ admin กำหนดตอน approve

mathjs ยังไม่ได้ติดตั้ง ต้อง npm install ก่อน

---

## STEP 1: ติดตั้ง mathjs

cd backend && npm install mathjs
Show package.json diff after install.

Commit: chore(deps): add mathjs for payroll formula engine

---

## STEP 2: Schema — เพิ่ม 3 models ใหม่

Add to backend/prisma/schema.prisma (อย่าแก้ PayrollRun/PayrollRunDetail เดิม):

```prisma
model PayrollVariable {
  id          Int      @id @default(autoincrement())
  code        String   @unique
  name        String
  source      String   // "employee" | "attendance" | "manual" | "computed"
  sourceField String?
  dataType    String   @default("number")
  description String?
}

model PayrollComponent {
  id           Int      @id @default(autoincrement())
  code         String   @unique
  name         String
  type         String              // "earning" | "deduction"
  calcMethod   String   @default("formula") // "formula" | "function"
  formula      String?             // used when calcMethod = "formula"
  functionName String?             // used when calcMethod = "function"
  isTaxable    Boolean  @default(true)
  isSSOBase    Boolean  @default(false)
  sortOrder    Int      @default(0)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  results      PayrollComponentResult[]
}

model PayrollComponentResult {
  id              Int      @id @default(autoincrement())
  payrollDetailId Int
  componentId     Int
  amount          Float
  formulaUsed     String   // snapshot of formula/functionName at calc time

  payrollDetail   PayrollRunDetail @relation(fields: [payrollDetailId], references: [id], onDelete: Cascade)
  component       PayrollComponent @relation(fields: [componentId], references: [id])
}
```

Also add reverse relation to PayrollRunDetail:
  componentResults PayrollComponentResult[]

Run: npx prisma migrate dev --name add_payroll_component_engine
Show migration output before continuing.

Commit: feat(schema): add PayrollVariable, PayrollComponent, PayrollComponentResult models

---

## STEP 3: Payroll Functions Registry

Create: backend/src/utils/payrollFunctions.ts

First show me current calcThaiTax implementation:
  cat backend/src/utils/payroll.ts

Use it as reference to write calculateThaiTax() in the new registry pattern:

```typescript
type PayrollFunction = (vars: Record<string, number>) => number;

function calculateThaiTax(vars: Record<string, number>): number {
  // Port the EXACT bracket logic from existing calcThaiTax in utils/payroll.ts
  // Input: vars.TaxableIncome (monthly) 
  // Must produce same bracket boundaries as the existing implementation:
  //   0-150k=0%, 150k-300k=5%, 300k-500k=10%, 500k-750k=15%,
  //   750k-1M=20%, 1M-2M=25%, 2M-5M=30%, 5M+=35%
  // (confirm exact brackets against current calcThaiTax before porting)
}

export const PAYROLL_FUNCTIONS: Record<string, PayrollFunction> = {
  calculateThaiTax,
};
```

Do NOT delete the old calcThaiTax/calcSso/calcOTPay from utils/payroll.ts yet —
they will be removed in Sprint 3 after the new engine is verified to work.

Commit: feat(payroll): add payrollFunctions registry with calculateThaiTax

---

## STEP 4: Formula Execution Engine

Create: backend/src/utils/payrollEngine.ts

```typescript
import { evaluate } from 'mathjs';
import { prisma } from '../prisma';
import { PAYROLL_FUNCTIONS } from './payrollFunctions';

interface ComponentResult {
  code: string;
  amount: number;
  formulaUsed: string;
}

export async function runPayrollEngine(
  baseVariables: Record<string, number>
): Promise<{ computed: Record<string, number>; results: ComponentResult[]; gross: number; deductions: number; net: number }> {

  const components = await prisma.payrollComponent.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  });

  const computed: Record<string, number> = {};
  const results: ComponentResult[] = [];

  for (const comp of components) {
    const scope = { ...baseVariables, ...computed };

    // Inject TaxableIncome before any 'function' type component runs
    // (recompute each iteration since computed grows)
    scope.TaxableIncome = components
      .filter(c => c.isTaxable && computed[c.code] !== undefined)
      .reduce((sum, c) => sum + (c.type === 'earning' ? computed[c.code] : -computed[c.code]), 0);

    let amount: number;
    try {
      if (comp.calcMethod === 'function') {
        const fn = PAYROLL_FUNCTIONS[comp.functionName!];
        if (!fn) throw new Error(`Unknown function: ${comp.functionName}`);
        amount = fn(scope);
      } else {
        const mathScope = { ...scope, MIN: Math.min, MAX: Math.max, ROUND: Math.round };
        amount = evaluate(comp.formula!, mathScope);
      }
    } catch (err: any) {
      throw new Error(`Component "${comp.code}" calculation failed: ${err.message}`);
    }

    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new Error(`Component "${comp.code}" produced invalid result: ${amount}`);
    }

    computed[comp.code] = amount;
    results.push({ code: comp.code, amount, formulaUsed: comp.formula || comp.functionName || '' });
  }

  const gross = components.filter(c => c.type === 'earning')
    .reduce((sum, c) => sum + (computed[c.code] || 0), 0);
  const deductions = components.filter(c => c.type === 'deduction')
    .reduce((sum, c) => sum + (computed[c.code] || 0), 0);

  return { computed, results, gross, deductions, net: gross - deductions };
}

export function validateFormula(formula: string, dummyVars: Record<string, number>): { valid: boolean; error?: string; result?: number } {
  try {
    const scope = { ...dummyVars, MIN: Math.min, MAX: Math.max, ROUND: Math.round };
    const result = evaluate(formula, scope);
    if (typeof result !== 'number' || isNaN(result)) {
      return { valid: false, error: 'Formula did not produce a valid number' };
    }
    return { valid: true, result };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}
```

Commit: feat(payroll): add formula execution engine with dependency-ordered calculation

---

## STEP 5: Seed default components

File: backend/prisma/seed.ts (or wherever seed lives — confirm path first)

Add these 6 default components in this exact sortOrder:

```javascript
{ code: 'BASIC',     name: 'เงินเดือนฐาน',   type: 'earning',    calcMethod: 'formula', formula: 'Salary', isTaxable: true, sortOrder: 1 }
{ code: 'OT_PAY',    name: 'ค่าล่วงเวลา',    type: 'earning',    calcMethod: 'formula', formula: '(Salary/30/8)*OTHours*1.5', isTaxable: true, sortOrder: 2 }
{ code: 'BONUS',     name: 'โบนัส',          type: 'earning',    calcMethod: 'formula', formula: '0', isTaxable: true, sortOrder: 3 }
{ code: 'SSO',       name: 'ประกันสังคม',    type: 'deduction',  calcMethod: 'formula', formula: 'MIN(BASIC*0.05, 750)', isSSOBase: false, sortOrder: 4 }
{ code: 'TAX',       name: 'ภาษีหัก ณ ที่จ่าย', type: 'deduction', calcMethod: 'function', functionName: 'calculateThaiTax', sortOrder: 5 }
{ code: 'LATE_DED',  name: 'หักมาสาย',       type: 'deduction',  calcMethod: 'formula', formula: '(Salary/30/8/60)*LateMinutes', sortOrder: 6 }
```

Run seed and show output.

Commit: chore(seed): add default payroll components

---

## STEP 6: CRUD API for PayrollComponent

Create: backend/src/controllers/payrollComponent.controller.ts
Create: backend/src/routes/payrollComponent.routes.ts

Endpoints:
  GET    /api/payroll-components           requirePermission('settings:view')
  POST   /api/payroll-components           requirePermission('settings:create')
  PUT    /api/payroll-components/:id       requirePermission('settings:edit')
  DELETE /api/payroll-components/:id       requirePermission('settings:delete') — soft delete (isActive=false)
  POST   /api/payroll-components/test      requirePermission('settings:edit')
    body: { formula: string, dummyVars: Record<string, number> }
    → calls validateFormula(), returns { valid, error?, result? }
    → does NOT save anything, pure test endpoint

All mutations call writeAudit() with module: 'settings'.

Register route in index.ts.

Commit: feat(api): add CRUD endpoints for PayrollComponent with formula test

---

## STEP 7: DO NOT integrate into runPayroll() controller yet

This sprint stops here. Do NOT modify payroll.controller.ts runPayroll() function.
That integration (replacing hardcoded providentFund/loan/paidDate and switching
to runPayrollEngine()) happens in Sprint 2 after this engine is verified standalone.

---

## Verification — run these and show ALL outputs

1. Test formula validation with valid formula:
   curl -X POST http://localhost:3000/api/payroll-components/test \
     -H "Authorization: Bearer <admin_token>" -H "Content-Type: application/json" \
     -d '{"formula":"MIN(Salary*0.05,750)","dummyVars":{"Salary":30000}}'
   Expected: { valid: true, result: 750 }

2. Test formula validation with invalid syntax:
   curl -X POST http://localhost:3000/api/payroll-components/test \
     -H "Authorization: Bearer <admin_token>" -H "Content-Type: application/json" \
     -d '{"formula":"Salary***0.05","dummyVars":{"Salary":30000}}'
   Expected: { valid: false, error: "..." }

3. Write a standalone test script (do not touch real payroll yet):
   backend/src/scripts/test_payroll_engine.ts
   
   Manually call runPayrollEngine() with:
     baseVariables = { Salary: 30000, OTHours: 10, LateMinutes: 0 }
   
   Show full output: computed{}, results[], gross, deductions, net
   
   Then verify TAX result roughly matches what calcThaiTax(30000) 
   from the OLD utils/payroll.ts produces for the same salary
   (run both side by side, show both numbers — should be close, 
   does not need to be exact per the "no backward compat" decision)

4. git log --oneline -8

Show all outputs before marking Sprint 1 complete.

---

## Commit Strategy (7 commits)

  chore(deps): add mathjs for payroll formula engine
  feat(schema): add PayrollVariable, PayrollComponent, PayrollComponentResult models
  feat(payroll): add payrollFunctions registry with calculateThaiTax
  feat(payroll): add formula execution engine with dependency-ordered calculation
  chore(seed): add default payroll components
  feat(api): add CRUD endpoints for PayrollComponent with formula test

One commit per step. Do NOT touch payroll.controller.ts runPayroll() in this sprint.

---

## PLANNING MODE REMINDER

Show me first:
1. cat backend/src/utils/payroll.ts (full file — for porting calcThaiTax brackets exactly)
2. Confirm seed file path (seed.ts vs seed_company.js — which one is run by `npx prisma db seed`?)

Then produce Implementation Plan Artifact for all 7 steps.
Wait for approval before implementing.