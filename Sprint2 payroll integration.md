=== SPRINT 2: Integrate Payroll Component Engine into runPayroll() ===

Read CONTEXT.md, tasks.md, Blueprint.md first.

PLANNING MODE: Produce ONE Implementation Plan Artifact.
Show current code for every file before proposing changes.
Wait for my approval before writing any code.

This sprint touches LIVE payroll calculation. Extra caution required.

---

## CONTEXT: สิ่งที่มีอยู่แล้ว (จาก Sprint 1 — ห้ามแก้)

- payrollEngine.ts — runPayrollEngine(baseVariables) ทำงานถูกต้อง verified
- payrollFunctions.ts — calculateThaiTax() ถูกต้อง รวม SSO/PVF deduction + guard
- 6 default components seeded: BASIC, OT_PAY, BONUS, SSO, TAX, LATE_DED
- buildPayrollWhereClause() — PayrollScope enforcement, ห้ามแก้ logic

## ปัญหาที่ค้างจาก audit เดิม — ต้องแก้ในสปรินต์นี้

1. providentFund = emp.salary * 0.05  ← hardcode, ต้องเป็น component แทน
2. loan = emp.id === 1 ? 1500 : 0     ← mock data ต้องลบทิ้ง
3. paidDate = `${period}-30`          ← ต้องเป็นวันทำการสุดท้ายของเดือน หรือ field ที่ approve กำหนด

## DO NOT modify (engine จาก Sprint 1)

- payrollEngine.ts core logic
- payrollFunctions.ts calculateThaiTax bracket logic
- buildPayrollWhereClause()

---

## STEP 0: แสดงโค้ดปัจจุบันก่อนเริ่ม

Run and show full output:

  cat backend/src/controllers/payroll.controller.ts
  cat backend/src/utils/payroll.ts
  grep -n "OTHours\|LateMinutes\|attendance" backend/src/controllers/payroll.controller.ts

Confirm: where does OTHours and LateMinutes currently come from?
(prisma.oT query? attendance aggregation? Show the exact query.)

---

## STEP 1: เพิ่ม PVF และ LOAN เป็น PayrollComponent

PVF (Provident Fund) ปัจจุบัน hardcode salary*0.05 — ทำให้เป็น component:

  code: 'PVF', name: 'กองทุนสำรองเลี้ยงชีพ', type: 'deduction',
  calcMethod: 'formula', formula: 'BASIC*0.05', sortOrder: 4.5
  (ต้องอยู่ก่อน TAX เพราะ calculateThaiTax ใช้ vars.PVF)

LOAN — เนื่องจากเป็นจำนวนเงินที่ผูกกับพนักงานแต่ละคนต่อรอบ (ไม่ใช่ formula ที่คำนวณจาก salary)
ไม่ควรเป็น PayrollComponent แบบ formula — ให้ทำเป็น "manual input per employee per run" แทน:

ตรวจสอบว่ามี field สำหรับเก็บ employee loan balance อยู่แล้วหรือไม่:
  grep -n "loan\|Loan" backend/prisma/schema.prisma

ถ้าไม่มี ให้เสนอ schema เพิ่ม:
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

แสดง schema ที่เสนอ พร้อม migration ก่อน implement — ห้าม proceed ถ้าผมยังไม่ approve schema นี้

Re-order sortOrder ของ components ทั้งหมดให้ถูกต้อง:
  1: BASIC
  2: OT_PAY
  3: BONUS
  4: SSO
  4.5: PVF       (ใหม่ — ก่อน TAX)
  5: TAX
  6: LATE_DED
  7: LOAN_DED    (ใหม่ — manual amount, ไม่ใช่ formula)

LOAN_DED component:
  code: 'LOAN_DED', type: 'deduction', calcMethod: 'formula', 
  formula: 'LoanDeduction'  
  (LoanDeduction เป็นตัวแปรที่ inject เข้า baseVariables ต่อ employee 
   จาก EmployeeLoan.monthlyDeduct ที่ status='active', ไม่ใช่ hardcode)

Commit: feat(payroll): add PVF component and EmployeeLoan model for dynamic loan deduction

---

## STEP 2: แก้ paidDate ให้ถูกต้อง

ปัจจุบัน: `${period}-30` (ผิดสำหรับเดือนที่มี 28/29/31 วัน)

แก้เป็น Last business day calculation:
```typescript
function getLastBusinessDay(period: string): string {
  // period format: "2026-06"
  const [year, month] = period.split('-').map(Number);
  const lastDay = new Date(year, month, 0); // วันสุดท้ายของเดือน
  
  // ถ้าตรงเสาร์-อาทิตย์ ให้ถอยมาเป็นวันศุกร์
  const dow = lastDay.getDay();
  if (dow === 0) lastDay.setDate(lastDay.getDate() - 2); // Sunday → Friday
  if (dow === 6) lastDay.setDate(lastDay.getDate() - 1); // Saturday → Friday
  
  return lastDay.toISOString().split('T')[0];
}
```

ไม่ต้องเช็ค public holiday ในสปรินต์นี้ (เก็บไว้ backlog) — แค่แก้ weekend ให้ถูกก่อน

Commit: fix(payroll): calculate correct last business day instead of hardcoded -30

---

## STEP 3: เชื่อม runPayrollEngine() เข้า runPayroll() controller

Show current runPayroll() FULL function first.

Replace the hardcoded calculation block with:

```typescript
// For each employee in scope:
const attendance = await getAttendanceSummary(emp.id, period); 
// (use existing OT/attendance fetch logic — DO NOT change how OT/attendance is queried)

const activeLoan = await prisma.employeeLoan.findFirst({
  where: { empId: emp.id, status: 'active' }
});

const baseVariables = {
  Salary: emp.salary,
  OTHours: attendance.otHours,
  LateMinutes: attendance.lateMinutes,
  LoanDeduction: activeLoan?.monthlyDeduct || 0,
};

const result = await runPayrollEngine(baseVariables);

// Save PayrollRunDetail using result.gross, result.deductions, result.net
// Map result.computed to existing fields where possible:
//   baseSalary = result.computed.BASIC
//   otPay      = result.computed.OT_PAY
//   tax        = result.computed.TAX
//   sso        = result.computed.SSO
//   providentFund = result.computed.PVF
//   loan       = result.computed.LOAN_DED
//   gross      = result.gross
//   net        = result.net

// Also save each result.results[] entry into PayrollComponentResult
// linked to the created PayrollRunDetail.id

paidDate = getLastBusinessDay(period);
```

IMPORTANT decisions to confirm with me before implementing:
- employerSso field — does runPayrollEngine() need to compute this too, 
  or is it calculated separately? Show current employerSso logic first.
- If an employee has active loan but remainingBal < monthlyDeduct, 
  should it deduct remainingBal instead? (partial final payment)
  Propose handling, wait for approval.

Show me the full diff of runPayroll() before committing.

Commit: feat(payroll): integrate component engine into runPayroll, remove hardcoded values

---

## STEP 4: ลบ mock data และ dead code

After Step 3 is verified working:
  grep -n "emp.id === 1" backend/src/controllers/payroll.controller.ts
  
Confirm this mock loan logic is now unused, then remove it.

DO NOT remove old calcThaiTax/calcSso/calcOTPay from utils/payroll.ts yet 
unless you confirm nothing else in the codebase still imports them:
  grep -rn "calcThaiTax\|calcSso\|calcOTPay" backend/src/

If anything else still uses them, leave them and flag it to me.
If nothing else uses them, remove and commit separately.

Commit: chore(payroll): remove mock loan data and unused legacy calc functions (if safe)

---

## STEP 5: Update PayrollRunDetail to link component results

Confirm PayrollComponentResult.payrollDetailId is populated correctly 
for every component on every employee in a payroll run.

Test query after running one payroll:
  SELECT pcr.*, pc.code, pc.name 
  FROM "PayrollComponentResult" pcr
  JOIN "PayrollComponent" pc ON pcr."componentId" = pc.id
  WHERE pcr."payrollDetailId" = <some_detail_id>
  ORDER BY pc."sortOrder";

Show this output — should show all 7-8 components with their amounts 
for one employee, matching the totals in PayrollRunDetail.

---

## Verification — CRITICAL, do not skip

1. Run payroll for a test employee with known values:
   Salary=30000, OTHours=10, LateMinutes=0, no active loan
   Compare against Sprint 1's verified manual calc:
     BASIC=30000, OT_PAY=1875, SSO=750, PVF=1500, TAX≈?, LATE_DED=0
   (recompute TAX manually with PVF now included as deduction)

2. Run payroll for an employee WITH an active loan
   Verify LOAN_DED appears correctly in PayrollRunDetail.loan field

3. Verify paidDate for period="2026-02" (Feb, 28 days, check if Feb 28 2026 
   falls on weekend) — show the actual output date

4. Query PayrollComponentResult for one full employee record, 
   show all component breakdowns

5. Confirm DENIED scope still works — PAYROLL_OFFICER outside scope 
   still gets empty result (re-run Sprint's P1-2 style test)

6. git log --oneline -10

Show ALL outputs. Do not mark Sprint 2 complete until verified.

---

## Commit Strategy

  feat(payroll): add PVF component and EmployeeLoan model for dynamic loan deduction
  fix(payroll): calculate correct last business day instead of hardcoded -30
  feat(payroll): integrate component engine into runPayroll, remove hardcoded values
  chore(payroll): remove mock loan data and unused legacy calc functions (if safe)

One commit per step. Stop and ask before STEP 3 if any "IMPORTANT decisions" 
section is unclear — do not guess on employerSso or partial loan payment logic.

---

## PLANNING MODE REMINDER

Show me first (STEP 0):
1. Full payroll.controller.ts
2. Full utils/payroll.ts  
3. How OTHours/LateMinutes currently get queried

Then produce Implementation Plan Artifact for all 5 steps.
Flag the 2 "IMPORTANT decisions" explicitly and wait for my answer 
before writing STEP 3 code.