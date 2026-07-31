# Sprint 2 Implementation Plan: Integrate Payroll Engine

## STEP 0: Code Discovery Responses

**1. OTHours and LateMinutes Query Logic**
Currently, `OTHours` is queried directly from the `OT` model by summing `requestedHours` where `status === 'approved'` for the given period.
Exact query:
```typescript
const ots = await prisma.oT.findMany({
  where: {
    empId: emp.id,
    date: { startsWith: period },
    status: 'approved'
  }
});
const otHours = ots.reduce((sum, o) => sum + o.requestedHours, 0);
```

**LateMinutes** is currently **NOT** queried, calculated, or used anywhere in `runPayroll()`. There is also no `lateMinutes` column in the `Attendance` model. For this integration, I will pass `LateMinutes: 0` as the default (or keep it hardcoded to 0) since calculating it from `clockIn` and `shift.startTime` across the entire month is outside the current scope of the existing logic.

---

## STEP 1: Add PVF Component and EmployeeLoan Model

**Schema Update (`backend/prisma/schema.prisma`):**
I will add the `EmployeeLoan` model:
```prisma
model EmployeeLoan {
  id            Int      @id @default(autoincrement())
  empId         Int
  amount        Float          // ยอดกู้ทั้งหมด
  monthlyDeduct Float          // หักต่อเดือน
  remainingBal  Float          // ยอดคงเหลือ
  startDate     DateTime
  status        String   @default("active") // active | completed | cancelled
  employee      Employee @relation(fields: [empId], references: [id])
}
```
*(Wait for approval before generating migration)*

**Seed Update (`backend/prisma/seed_components.ts` and `seed.ts`):**
I will insert PVF and LOAN_DED components and re-order sortOrder:
1. `BASIC` (1)
2. `OT_PAY` (2)
3. `BONUS` (3)
4. `SSO` (4)
5. `PVF` (4.5) - `type: 'deduction', calcMethod: 'formula', formula: 'BASIC * 0.05'`
6. `TAX` (5)
7. `LATE_DED` (6)
8. `LOAN_DED` (7) - `type: 'deduction', calcMethod: 'formula', formula: 'LoanDeduction'`

---

## STEP 2: Calculate Last Business Day

I will add the `getLastBusinessDay` function at the top of `payroll.controller.ts` (or in a utils file like `dateUtils.ts`):
```typescript
function getLastBusinessDay(period: string): string {
  const [year, month] = period.split('-').map(Number);
  const lastDay = new Date(year, month, 0); // last day of month
  
  const dow = lastDay.getDay();
  if (dow === 0) lastDay.setDate(lastDay.getDate() - 2); // Sun -> Fri
  if (dow === 6) lastDay.setDate(lastDay.getDate() - 1); // Sat -> Fri
  
  // Format as YYYY-MM-DD local
  const offset = lastDay.getTimezoneOffset();
  lastDay.setMinutes(lastDay.getMinutes() - offset);
  return lastDay.toISOString().split('T')[0];
}
```

---

## STEP 3: Integrate runPayrollEngine()

**IMPORTANT DECISIONS:**
1. **`employerSso` logic:** In the current `calcSso`, `employerSso` is simply equal to the employee's `sso`. I will set `employerSso: result.computed.SSO || 0` directly. 
2. **Partial Loan Payment:** If `remainingBal < monthlyDeduct`, the deduction should only be the remaining balance. I will calculate `LoanDeduction` as:
   ```typescript
   const activeLoan = await prisma.employeeLoan.findFirst({
     where: { empId: emp.id, status: 'active' }
   });
   let loanDeduct = 0;
   if (activeLoan) {
     loanDeduct = Math.min(activeLoan.monthlyDeduct, activeLoan.remainingBal);
   }
   ```
*(Let me know if you approve this partial payment logic and the employerSso logic)*

**runPayroll() Integration Logic:**
Instead of the hardcoded calculations, I will replace the inside of the loop with:
```typescript
const ots = await prisma.oT.findMany({ ... }); // Existing query
const otHours = ots.reduce((sum, o) => sum + o.requestedHours, 0);

const activeLoan = await prisma.employeeLoan.findFirst({
  where: { empId: emp.id, status: 'active' }
});
const loanDeduct = activeLoan ? Math.min(activeLoan.monthlyDeduct, activeLoan.remainingBal) : 0;

const baseVariables = {
  Salary: emp.salary,
  OTHours: otHours,
  LateMinutes: 0, // Not currently tracked in DB
  LoanDeduction: loanDeduct,
};

const result = await runPayrollEngine(baseVariables);

payrollResults.push({
  payrollRunId: payrollRun.id,
  empId: emp.id,
  gross: result.gross,
  otHours,
  otPay: result.computed.OT_PAY || 0,
  baseSalary: result.computed.BASIC || emp.salary,
  tax: result.computed.TAX || 0,
  sso: result.computed.SSO || 0,
  employerSso: result.computed.SSO || 0, // Employer matches employee
  providentFund: result.computed.PVF || 0,
  loan: result.computed.LOAN_DED || 0,
  other_deduct: 0,
  net: result.net,
  status: "paid",
  paidDate: getLastBusinessDay(period)
});

// We also need to save result.results into PayrollComponentResult 
// (will use prisma.payrollRunDetail.create with include: { componentResults: { create: ... } })
```

---

## STEP 4 & 5: Cleanup and Component Links
- I will verify if `calcSso`, `calcThaiTax`, and `calcOTPay` are used anywhere else (using `grep`). If not, I will remove them.
- I will verify the mock `emp.id === 1` loan logic is gone.
- Instead of `payrollRunDetail.createMany` (which does not support nested relations), I will use a transaction or loop to create `payrollRunDetail` along with its `componentResults` array.

---

## Conclusion
Please review:
1. The new schema (`EmployeeLoan`)
2. The `employerSso` matching logic
3. The partial loan deduction (`Math.min`)

Once approved, I will begin implementing Step 1.
