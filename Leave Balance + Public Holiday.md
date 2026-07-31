=== SPRINT 6: Leave Balance + Public Holiday ===

Read CONTEXT.md first. PLANNING MODE.
Show plan before any code.

Pre-flight — show these first:
1. cat backend/src/controllers/leave.controller.ts
2. grep -n "leave\|Leave" backend/src/routes/leave.routes.ts

---

## STEP 1: Schema — 2 new models

Add to schema.prisma:

```prisma
model LeaveBalance {
  id          Int      @id @default(autoincrement())
  empId       Int
  year        Int      // e.g. 2026
  leaveType   String   // "sick", "annual", "personal", "maternity"
  entitled    Float    // สิทธิ์ทั้งหมด (วัน)
  used        Float    @default(0) // ใช้ไปแล้ว
  pending     Float    @default(0) // รออนุมัติ
  remaining   Float    // entitled - used
  
  employee    Employee @relation(fields: [empId], references: [id])
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([empId, year, leaveType])
}

model PublicHoliday {
  id          Int      @id @default(autoincrement())
  date        String   // "2026-01-01"
  name        String   // "วันขึ้นปีใหม่"
  nameEn      String?  // "New Year's Day"
  isRecurring Boolean  @default(false) // ทุกปี (เช่น ปีใหม่) หรือเฉพาะปี
  year        Int?     // null ถ้า isRecurring=true
  
  createdAt   DateTime @default(now())
}
```

Also add reverse relation to Employee:
  leaveBalances LeaveBalance[]

Run: npx prisma migrate dev --name add_leave_balance_and_public_holiday
Show migration output.

Commit: feat(schema): add LeaveBalance and PublicHoliday models

---

## STEP 2: Seed default Thai public holidays 2026

Add upsertPublicHolidays() to seed.ts:

```typescript
const holidays2026 = [
  { date: '2026-01-01', name: 'วันขึ้นปีใหม่', nameEn: "New Year's Day", isRecurring: true },
  { date: '2026-02-12', name: 'วันมาฆบูชา', nameEn: 'Makha Bucha Day', isRecurring: false, year: 2026 },
  { date: '2026-04-06', name: 'วันจักรี', nameEn: 'Chakri Memorial Day', isRecurring: true },
  { date: '2026-04-13', name: 'วันสงกรานต์', nameEn: 'Songkran Festival', isRecurring: true },
  { date: '2026-04-14', name: 'วันสงกรานต์', nameEn: 'Songkran Festival', isRecurring: true },
  { date: '2026-04-15', name: 'วันสงกรานต์', nameEn: 'Songkran Festival', isRecurring: true },
  { date: '2026-05-01', name: 'วันแรงงานแห่งชาติ', nameEn: 'National Labour Day', isRecurring: true },
  { date: '2026-05-04', name: 'วันฉัตรมงคล', nameEn: 'Coronation Day', isRecurring: true },
  { date: '2026-06-03', name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี', nameEn: "Queen's Birthday", isRecurring: true },
  { date: '2026-07-28', name: 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว', nameEn: "King's Birthday", isRecurring: true },
  { date: '2026-08-12', name: 'วันแม่แห่งชาติ', nameEn: "Mother's Day", isRecurring: true },
  { date: '2026-10-13', name: 'วันคล้ายวันสวรรคต ร.9', nameEn: 'Memorial Day R.9', isRecurring: true },
  { date: '2026-10-23', name: 'วันปิยมหาราช', nameEn: 'Chulalongkorn Day', isRecurring: true },
  { date: '2026-12-05', name: 'วันพ่อแห่งชาติ', nameEn: "Father's Day", isRecurring: true },
  { date: '2026-12-10', name: 'วันรัฐธรรมนูญ', nameEn: 'Constitution Day', isRecurring: true },
  { date: '2026-12-31', name: 'วันสิ้นปี', nameEn: "New Year's Eve", isRecurring: true },
];

for (const h of holidays2026) {
  await prisma.publicHoliday.upsert({
    where: { 
      // use date as unique key
      id: (await prisma.publicHoliday.findFirst({ where: { date: h.date } }))?.id || 0
    },
    update: {},
    create: h,
  });
}
```

Better approach — use createMany with skipDuplicates:
```typescript
await prisma.publicHoliday.createMany({
  data: holidays2026,
  skipDuplicates: true,
});
console.log('✅ Public holidays 2026 seeded');
```

Run seed and show output.
Commit: chore(seed): add Thai public holidays 2026

---

## STEP 3: Initialize LeaveBalance when leave is approved

Update leave.controller.ts approveLeave():

When status changes to 'approved':
1. Check/create LeaveBalance record for emp+year+leaveType
2. Add leave.days to `used`, subtract from `remaining`
3. If no balance record → create with entitled from EmployeeType.annualLeave

```typescript
// After updating leave status to 'approved':
const leaveYear = parseInt(leave.startDate.substring(0, 4));
const entitled = leave.employee?.employeeType?.annualLeave || 6;

await prisma.leaveBalance.upsert({
  where: { empId_year_leaveType: {
    empId: leave.empId,
    year: leaveYear,
    leaveType: leave.type,
  }},
  create: {
    empId: leave.empId,
    year: leaveYear,
    leaveType: leave.type,
    entitled,
    used: leave.days,
    pending: 0,
    remaining: entitled - leave.days,
  },
  update: {
    used: { increment: leave.days },
    remaining: { decrement: leave.days },
  }
});
```

Also update `pending` field when leave is submitted (POST /leaves):
```typescript
// In createLeave():
await prisma.leaveBalance.upsert({
  where: { empId_year_leaveType: { empId, year, leaveType } },
  create: { empId, year, leaveType: type, entitled, used: 0, pending: days, remaining: entitled },
  update: { pending: { increment: days } },
});
```

And decrease pending when approved/rejected.

Show me current approveLeave() and createLeave() before modifying.

Commit: feat(leave): track LeaveBalance on submit/approve/reject

---

## STEP 4: API endpoints

Add to leave.routes.ts:

GET /api/leaves/balance
  → return LeaveBalance for current user (req.user.empId) current year
  requirePermission('leave:view')
  
GET /api/leaves/balance/:empId
  → return LeaveBalance for specific employee (HR only)
  requirePermission('leave:view') + scope check

GET /api/public-holidays
  → return all holidays for current/next year
  authenticate (no special permission needed)

POST /api/public-holidays
  → create holiday
  requirePermission('settings:create')

DELETE /api/public-holidays/:id
  → delete holiday
  requirePermission('settings:delete')

Commit: feat(api): add leave balance and public holiday endpoints

---

## STEP 5: Frontend updates

### 5a: Attendance.jsx — show leave balance

In Leave tab, fetch and display remaining balance:
```javascript
const [leaveBalance, setLeaveBalance] = useState([]);

useEffect(() => {
  api.get('/leaves/balance').then(r => {
    setLeaveBalance(Array.isArray(r.data) ? r.data : []);
  }).catch(() => {});
}, []);
```

Display as cards above leave request form:
```jsx
{leaveBalance.length > 0 && (
  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
    {leaveBalance.map(b => (
      <div key={b.id} style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: '12px 16px', minWidth: 140
      }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{b.leaveType}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: b.remaining > 0 ? C.success : C.danger }}>
          {b.remaining}
        </div>
        <div style={{ fontSize: 11, color: C.textMuted }}>
          วันคงเหลือ (ใช้ไป {b.used}/{b.entitled})
        </div>
      </div>
    ))}
  </div>
)}
```

### 5b: Settings.jsx — Public Holiday management

Add "วันหยุด" tab in Settings payroll section:

Table: วันที่, ชื่อวันหยุด, ชื่อภาษาอังกฤษ, ทุกปี (✅/❌), actions
Button: "+ เพิ่มวันหยุด"
Modal: date picker, ชื่อ TH, ชื่อ EN, toggle isRecurring

```javascript
const [holidays, setHolidays] = useState([]);
// Fetch: api.get('/public-holidays')
// Create: api.post('/public-holidays', { date, name, nameEn, isRecurring })
// Delete: api.delete(`/public-holidays/${id}`)
```

---

## Verification

1. npx prisma migrate status → up to date
2. SELECT date, name FROM "PublicHoliday" ORDER BY date LIMIT 5;
   → shows Thai holidays
3. Submit leave request → LeaveBalance created/updated
4. Approve leave → LeaveBalance.used incremented, remaining decremented
5. GET /api/leaves/balance → returns balance cards
6. Settings → วันหยุด tab → shows 16 Thai holidays
7. git log --oneline -6 (backend)
8. git log --oneline -4 (hris/)

Show ALL 8 verification outputs.

---

## PLANNING MODE REMINDER

Show pre-flight first:
  cat backend/src/controllers/leave.controller.ts
  grep -n "router\." backend/src/routes/leave.routes.ts

Then produce Implementation Plan.
Wait for approval before implementing.