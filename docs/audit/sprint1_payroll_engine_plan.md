# Sprint 1 Implementation Plan: Payroll Component Formula Engine

> **Status:** AWAITING APPROVAL  
> **Do NOT touch:** payroll.controller.ts runPayroll(), scopeFilter.ts, buildPayrollWhereClause, existing calcThaiTax/calcSso/calcOTPay

---

## Pre-implementation Findings

### calcThaiTax brackets (confirmed from payroll.ts)
| Annual Income Range | Rate |
|---------------------|------|
| 0 – 150,000 | 0% |
| 150,001 – 300,000 | 5% |
| 300,001 – 500,000 | 10% |
| 500,001 – 750,000 | 15% |
| 750,001 – 1,000,000 | 20% |
| 1,000,001 – 2,000,000 | 25% |
| 2,000,001 – 5,000,000 | 30% |
| 5,000,001+ | 35% |

Deductions applied before bracket: `expense = min(income × 0.5, 100,000)` + `personal = 60,000` + SSO + PVF

### Seed file
- **File:** `backend/prisma/seed.ts` ✅ (only one, no seed_company.js)
- **Problem:** `package.json` has NO `prisma.seed` field → must add before `npx prisma db seed` works
- **Fix:** Add `"prisma": { "seed": "ts-node prisma/seed.ts" }` to `package.json`

---

## STEP 1 — Install mathjs

**File:** `backend/package.json`

```bash
cd backend
npm install mathjs
```

**Also add seed config to package.json:**
```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

**Commit:** `chore(deps): add mathjs for payroll formula engine`

---

## STEP 2 — Schema: 3 new models

**File:** `backend/prisma/schema.prisma`

**Add 3 models** (after PayrollRunDetail, before EmpDoc):

```prisma
model PayrollVariable {
  id          Int     @id @default(autoincrement())
  code        String  @unique
  name        String
  source      String  // "employee" | "attendance" | "manual" | "computed"
  sourceField String?
  dataType    String  @default("number")
  description String?
}

model PayrollComponent {
  id           Int      @id @default(autoincrement())
  code         String   @unique
  name         String
  type         String                // "earning" | "deduction"
  calcMethod   String   @default("formula") // "formula" | "function"
  formula      String?
  functionName String?
  isTaxable    Boolean  @default(true)
  isSSOBase    Boolean  @default(false)
  sortOrder    Int      @default(0)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  results      PayrollComponentResult[]
}

model PayrollComponentResult {
  id              Int    @id @default(autoincrement())
  payrollDetailId Int
  componentId     Int
  amount          Float
  formulaUsed     String

  payrollDetail   PayrollRunDetail @relation(fields: [payrollDetailId], references: [id], onDelete: Cascade)
  component       PayrollComponent @relation(fields: [componentId], references: [id])
}
```

**Also add** reverse relation to `PayrollRunDetail`:
```prisma
componentResults PayrollComponentResult[]
```

**Run:**
```bash
npx prisma migrate dev --name add_payroll_component_engine
```

Show migration output before continuing.

**Commit:** `feat(schema): add PayrollVariable, PayrollComponent, PayrollComponentResult models`

---

## STEP 3 — payrollFunctions.ts registry

**Create:** `backend/src/utils/payrollFunctions.ts`

Port `calcThaiTax` brackets exactly from `payroll.ts`.  
Input: `vars.TaxableIncome` (annual taxable income, already net of deductions)  
Output: annual tax → caller divides by 12 for monthly WHT

```typescript
type PayrollFunction = (vars: Record<string, number>) => number;

const TAX_BRACKETS = [
  { min: 0,       max: 150000,   rate: 0 },
  { min: 150001,  max: 300000,   rate: 0.05 },
  { min: 300001,  max: 500000,   rate: 0.10 },
  { min: 500001,  max: 750000,   rate: 0.15 },
  { min: 750001,  max: 1000000,  rate: 0.20 },
  { min: 1000001, max: 2000000,  rate: 0.25 },
  { min: 2000001, max: 5000000,  rate: 0.30 },
  { min: 5000001, max: Infinity, rate: 0.35 },
];

function calculateThaiTax(vars: Record<string, number>): number {
  const annualGross = (vars.TaxableIncome || 0) * 12;
  const deductExpense = Math.min(annualGross * 0.5, 100000);
  const deductPersonal = 60000;
  const taxable = Math.max(0, annualGross - deductExpense - deductPersonal);
  let tax = 0;
  for (const b of TAX_BRACKETS) {
    if (taxable <= b.min) break;
    tax += (Math.min(taxable, b.max) - b.min) * b.rate;
  }
  return Math.round(tax / 12); // Return monthly WHT
}

export const PAYROLL_FUNCTIONS: Record<string, PayrollFunction> = {
  calculateThaiTax,
};
```

> **Note:** OLD `calcThaiTax` in `payroll.ts` is NOT deleted — stays until Sprint 3.

**Commit:** `feat(payroll): add payrollFunctions registry with calculateThaiTax`

---

## STEP 4 — payrollEngine.ts formula executor

**Create:** `backend/src/utils/payrollEngine.ts`

Uses `mathjs evaluate()` for formula components, `PAYROLL_FUNCTIONS` registry for function components.  
Components run in `sortOrder` ASC — earlier results accumulate into scope for later components.

Key details:
- `TaxableIncome` in scope = sum of all taxable earnings computed so far (updated each iteration)
- `MIN`, `MAX`, `ROUND` injected into mathjs scope for convenience
- Throws descriptive error on bad formula or non-number result

Also exports `validateFormula()` for the `/test` endpoint (no DB write, pure evaluation).

**Commit:** `feat(payroll): add formula execution engine with dependency-ordered calculation`

---

## STEP 5 — Seed default components

**File:** `backend/prisma/seed.ts`

Add `upsertPayrollComponents()` function with 6 components using `upsert({ where: { code } })` to be idempotent:

| sortOrder | code | name | type | method | formula/fn |
|-----------|------|------|------|--------|-----------|
| 1 | BASIC | เงินเดือนฐาน | earning | formula | `Salary` |
| 2 | OT_PAY | ค่าล่วงเวลา | earning | formula | `(Salary/30/8)*OTHours*1.5` |
| 3 | BONUS | โบนัส | earning | formula | `0` |
| 4 | SSO | ประกันสังคม | deduction | formula | `MIN(BASIC*0.05, 750)` |
| 5 | TAX | ภาษีหัก ณ ที่จ่าย | deduction | function | `calculateThaiTax` |
| 6 | LATE_DED | หักมาสาย | deduction | formula | `(Salary/30/8/60)*LateMinutes` |

Call from `main()` at end of existing seed file.

**Run:**
```bash
npx prisma db seed
```

Show seed output.

**Commit:** `chore(seed): add default payroll components`

---

## STEP 6 — CRUD API for PayrollComponent

**Create:** `backend/src/controllers/payrollComponent.controller.ts`  
**Create:** `backend/src/routes/payrollComponent.routes.ts`  
**Modify:** `backend/src/index.ts` (register route)

| Method | Path | Permission | Notes |
|--------|------|-----------|-------|
| GET | `/api/payroll-components` | `settings:view` | Return all, ordered by sortOrder |
| POST | `/api/payroll-components` | `settings:create` | Create, writeAudit |
| PUT | `/api/payroll-components/:id` | `settings:edit` | Update, writeAudit |
| DELETE | `/api/payroll-components/:id` | `settings:delete` | Soft delete: `isActive=false`, writeAudit |
| POST | `/api/payroll-components/test` | `settings:edit` | Call `validateFormula()`, return `{valid, error?, result?}` — no DB write |

**Commit:** `feat(api): add CRUD endpoints for PayrollComponent with formula test`

---

## STEP 7 — Out of scope (Sprint 2)

Do NOT integrate `runPayrollEngine()` into `payroll.controller.ts runPayroll()` in this sprint.  
The 3 hardcoded bugs (providentFund, loan, paidDate) will be fixed in Sprint 2 alongside engine integration.

---

## Verification Plan (after all 6 steps)

1. **Valid formula test** — `POST /api/payroll-components/test` `{"formula":"MIN(Salary*0.05,750)","dummyVars":{"Salary":30000}}` → `{valid:true, result:750}`
2. **Invalid syntax test** — same endpoint with `"Salary***0.05"` → `{valid:false, error:"..."}`
3. **Standalone engine test script** — `backend/src/scripts/test_payroll_engine.ts` with `{Salary:30000, OTHours:10, LateMinutes:0}`, compare TAX output vs old `calcThaiTax(30000*12,...)`
4. **`git log --oneline -8`** — verify 6 commits in order

---

## File Summary

| Action | File |
|--------|------|
| MODIFY | `backend/package.json` (add mathjs + prisma.seed config) |
| MODIFY | `backend/prisma/schema.prisma` (add 3 models + reverse relation) |
| CREATE | `backend/src/utils/payrollFunctions.ts` |
| CREATE | `backend/src/utils/payrollEngine.ts` |
| MODIFY | `backend/prisma/seed.ts` (add upsertPayrollComponents) |
| CREATE | `backend/src/controllers/payrollComponent.controller.ts` |
| CREATE | `backend/src/routes/payrollComponent.routes.ts` |
| MODIFY | `backend/src/index.ts` (register /api/payroll-components) |
| CREATE | `backend/src/scripts/test_payroll_engine.ts` (verification only) |
