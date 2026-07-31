=== SPRINT: Payroll.jsx — Replace mockData with Real API ===

Read CONTEXT.md, tasks.md first.
PLANNING MODE — show plan before any code changes.
Wait for my approval before implementing.

---

## CONTEXT: สิ่งที่มีอยู่แล้ว (ห้ามแก้)

- /api/payroll GET — คืน PayrollRunDetail[] พร้อม employee relation
- /api/payroll/run POST — body: { period } คืน detail[] จาก component engine
- /api/payroll/:id/approve PUT — approve payroll run
- /api/payroll/:id/export POST — export bank file
- runPayrollEngine() — ทำงานถูกต้อง Sprint 1-2 verified
- useToast(), ConfirmModal — ใช้ได้เลย
- api Axios instance — import จาก ../utils/api

## สิ่งที่ต้องแก้ใน Payroll.jsx

ก่อนเริ่ม show me:
  grep -n "import\|useState\|useEffect\|fetch\|getEmp\|INIT_\|TAX_\|EMPLOYEES\|calcThaiTax\|period\|alert" hris/src/pages/Payroll.jsx

---

## FIX 1: ลบ mockData imports ทั้งหมด

Remove:
  import { INIT_PAYROLL, INIT_OT, EMPLOYEES, INIT_SHIFTS, TAX_BRACKETS } from '../utils/mockData';

Add:
  import api from '../utils/api';
  import { useToast } from '../components/common/Toast';

const { showToast } = useToast();

---

## FIX 2: state เริ่มต้น

Replace:
  const [payrolls, setPayrolls] = useState(INIT_PAYROLL);

With:
  const [payrolls, setPayrolls] = useState([]);
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

---

## FIX 3: useEffect — fetch real data

Replace current useEffect fetch() with:

```javascript
useEffect(() => {
  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payroll');
      const data = res.data;
      if (Array.isArray(data)) setPayrolls(data);
    } catch (err) {
      showToast('โหลดข้อมูล payroll ไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  };
  fetchPayroll();
}, []);
```

---

## FIX 4: runPayroll — ใช้ dynamic period + api

Replace hardcoded period + fetch() + alert():

```javascript
const runPayroll = async () => {
  setLoading(true);
  try {
    const res = await api.post('/payroll/run', { period: selectedPeriod });
    const newDetails = res.data;
    if (Array.isArray(newDetails)) {
      setPayrolls(prev => [
        ...newDetails,
        ...prev.filter(x => x.period !== selectedPeriod)
      ]);
      showToast(`รัน Payroll งวด ${selectedPeriod} สำเร็จ (${newDetails.length} คน)`, 'success');
    }
  } catch (err) {
    showToast(`รัน Payroll ไม่สำเร็จ: ${err.response?.data?.message || err.message}`, 'error');
  } finally {
    setLoading(false);
  }
};
```

---

## FIX 5: Period Selector UI

เพิ่ม period selector ใน "รัน Payroll" tab:

```jsx
{tab === "run" && (
  <Card>
    <div style={{ fontWeight: 700, marginBottom: 16 }}>รัน Payroll</div>
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 20 }}>
      <div style={{ flex: 1 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: 5 }}>
          งวดเงินเดือน
        </label>
        <input
          type="month"
          value={selectedPeriod}
          onChange={e => setSelectedPeriod(e.target.value)}
          style={{ border: `1px solid ${C.border}`, borderRadius: 8,
            padding: '8px 12px', fontSize: 14, outline: 'none', background: C.surface }}
        />
      </div>
      <Btn onClick={runPayroll} disabled={loading}>
        {loading ? 'กำลังประมวลผล...' : `▶ รัน Payroll ${selectedPeriod}`}
      </Btn>
    </div>
    <div style={{ fontSize: 13, color: C.textMuted, background: C.warningLight,
      borderRadius: 8, padding: '10px 14px' }}>
      ⚠️ การรัน Payroll จะคำนวณเงินเดือนใหม่ทั้งหมดตาม Component Engine
      สามารถรันซ้ำได้ — ระบบจะลบและสร้างผลใหม่ทุกครั้ง
    </div>
  </Card>
)}
```

---

## FIX 6: Employee name — ใช้ r.employee แทน getEmp()

ทุกจุดที่ใช้ getEmp(r.empId) หรือ getEmpName(r.empId):
- Replace ด้วย r.employee?.name หรือ r.employee?.empCode
- API /api/payroll คืน employee relation อยู่แล้ว (include: { employee: true })

ตรวจสอบก่อนว่า getPayroll() ใน controller include employee:
  grep -n "include.*employee\|employee.*include" backend/src/controllers/payroll.controller.ts

ถ้าไม่มี ให้เพิ่ม include: { employee: true } ใน findMany query ของ getPayroll()

---

## FIX 7: Bank Export — ใช้ r.employee จาก API data

Replace getEmp() ด้วย employee data จาก payrolls state:

```javascript
const handleBankExport = async () => {
  const periodData = payrolls.filter(p => p.period === selectedPeriod);
  if (periodData.length === 0) {
    showToast('ไม่มีข้อมูล payroll สำหรับงวดนี้', 'warning');
    return;
  }

  try {
    // ใช้ /api/payroll/:id/export ที่มีอยู่ถ้ามี run id
    const runId = periodData[0]?.payrollRunId;
    if (runId) {
      const res = await api.post(`/payroll/${runId}/export`);
      // ถ้า backend คืน file content
      const blob = new Blob([res.data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bank_transfer_${selectedPeriod}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('ส่งออกไฟล์ Bank Transfer สำเร็จ', 'success');
      return;
    }
  } catch (err) {
    // fallback to client-side generation
  }

  // Fallback: generate from payrolls state
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  let txt = `0140000000 ${dateStr} COMPANY_NAME\n`;
  periodData.forEach(pr => {
    const bankAcc = (pr.employee?.bankAcc || '').replace(/-/g, '').padEnd(15, ' ');
    const amount = Math.round(pr.net).toString().padStart(10, '0');
    const empCode = pr.employee?.empCode || '';
    txt += `${bankAcc} ${amount} ${empCode}\n`;
  });
  const blob = new Blob([txt], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bank_transfer_${selectedPeriod}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('ส่งออกไฟล์ Bank Transfer สำเร็จ', 'success');
};
```

---

## FIX 8: Bulk Download ZIP — ใช้ employee จาก state

Replace getEmp() ใน handleBulkDownload:

```javascript
const handleBulkDownload = async () => {
  const periodData = payrolls.filter(p => p.period === selectedPeriod);
  if (periodData.length === 0) {
    showToast('ไม่มีข้อมูลสำหรับงวดนี้', 'warning');
    return;
  }
  const zip = new JSZip();
  periodData.forEach(pr => {
    const emp = pr.employee;
    if (emp) {
      const html = generatePayslipHTML(pr, emp, settings);
      zip.file(`payslip_${emp.empCode}_${pr.period}.html`, html);
    }
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payslips_${selectedPeriod}.zip`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('ดาวน์โหลด ZIP สำเร็จ', 'success');
};
```

---

## FIX 9: Tax tab — ลบ TAX_BRACKETS และ EMPLOYEES mock

TAX_BRACKETS tab ปัจจุบันใช้:
1. TAX_BRACKETS จาก mockData — แทนด้วย hardcode array ใน component เอง
   (bracket ถูกต้องอยู่แล้วใน payrollFunctions.ts — copy มาใช้)
2. EMPLOYEES จาก mockData สำหรับตัวอย่างคำนวณ — แทนด้วย real employees จาก /api/employees

```javascript
// ใน Payroll.jsx — hardcode brackets (ไม่ต้อง import)
const TAX_BRACKETS_DISPLAY = [
  { min: 0,       max: 150000,   rate: 0 },
  { min: 150000,  max: 300000,   rate: 0.05 },
  { min: 300000,  max: 500000,   rate: 0.10 },
  { min: 500000,  max: 750000,   rate: 0.15 },
  { min: 750000,  max: 1000000,  rate: 0.20 },
  { min: 1000000, max: 2000000,  rate: 0.25 },
  { min: 2000000, max: 5000000,  rate: 0.30 },
  { min: 5000000, max: Infinity, rate: 0.35 },
];
```

สำหรับตัวอย่างคำนวณ — ดึงจาก payrolls state (real data) แทน EMPLOYEES mock:
แสดง payrolls งวดล่าสุด พร้อม baseSalary, tax จริงที่ engine คำนวณ

---

## FIX 10: Payslip detail — แก้ YTD hardcode ×6

Current code:
  ["รายได้สะสม (YTD)", selected.gross * 6, false],
  ["ภาษีสะสม (YTD)", selected.tax * 6, true],

YTD hardcode ×6 ผิด — ควรคำนวณจาก payroll runs จริงที่มีในระบบ:

```javascript
// คำนวณ YTD จาก payrolls state ที่ดึงมา
const ytdData = payrolls.filter(p => 
  p.empId === selected.empId && 
  p.period.startsWith(selected.period.split('-')[0]) && // ปีเดียวกัน
  p.period <= selected.period // ก่อนหรือเท่ากับงวดที่เลือก
);
const ytdGross = ytdData.reduce((s, p) => s + p.gross, 0);
const ytdTax   = ytdData.reduce((s, p) => s + p.tax, 0);

// ใช้แทนที่ selected.gross * 6 และ selected.tax * 6
["รายได้สะสม (YTD)", ytdGross, false],
["ภาษีสะสม (YTD)", ytdTax, true],
```

---

## FIX 11: StatCards — แสดง period จริง

Replace hardcode "พ.ค. 2568":
```javascript
const thaiMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const periodLabel = (() => {
  const [y, m] = selectedPeriod.split('-');
  return `${thaiMonths[parseInt(m) - 1]} ${parseInt(y) + 543}`;
})();

// ใน StatCard sub prop:
<StatCard label="เงินเดือนรวม" value={fmtB(totalGross)} sub={periodLabel} ... />
```

---

## FIX 12: myData — ลบ frontend scope filter

Replace:
  const myData = !isHR ? payrolls.filter(p => p.empId === (user.empId || 3)) : payrolls;

With:
  const myData = payrolls; // Backend scope/ownership handles this via PayrollScope

---

## Commit Strategy

  fix(payroll): remove mockData imports, add real API fetch with period selector
  fix(payroll): replace getEmp() mock lookups with employee relation from API
  fix(payroll): fix YTD calculation from real payroll history
  fix(payroll): replace hardcoded period and alert() with dynamic + toast

4 commits. Show diff for each before committing.

---

## Verification

1. เปิด Payroll page — ต้องไม่ crash (ถึงแม้ payrolls = [])
2. Tab "รัน Payroll" — เห็น month picker + ปุ่มรัน
3. รัน Payroll 2026-06 — toast ✅ และ table แสดงข้อมูลจริง
4. กดดูสลิป — แสดง YTD จากข้อมูลจริง (ไม่ใช่ ×6)
5. ส่งออก Bank Transfer — ไม่ crash ถ้า employee.bankAcc เป็น null
6. Tab ภาษี — แสดง brackets ถูกต้อง และตัวอย่างจาก payrolls จริง
7. grep -n "INIT_PAYROLL\|INIT_OT\|EMPLOYEES\|TAX_BRACKETS\|mockData\|localhost:3000\|alert(" hris/src/pages/Payroll.jsx
   Expected: 0 matches

---

## PLANNING MODE REMINDER

Show me first:
1. grep output จาก Payroll.jsx ที่ขอไว้ต้นนี้
2. grep -n "include.*employee" backend/src/controllers/payroll.controller.ts
   (ตรวจว่า getPayroll() return employee relation ด้วยไหม)

Then produce Implementation Plan Artifact.
Wait for approval before implementing.