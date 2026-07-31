=== SPRINT 3: Payroll Component Settings UI ===

Read CONTEXT.md, tasks.md first.

PLANNING MODE: Produce ONE Implementation Plan Artifact.
Show current code for every file before proposing changes.
Wait for my approval before writing any code.

---

## CONTEXT: สิ่งที่มีอยู่แล้ว

- Settings.jsx มี tab "payroll" อยู่แล้ว — ต้องขยาย ไม่ใช่สร้างใหม่
- /api/payroll-components CRUD + /test endpoint พร้อมแล้ว
- UI components ที่ใช้ได้: Modal, Inp, Sel, Btn, Tbl, Card, Tabs, Badge
- C (theme object), useToast(), ConfirmModal — ใช้ได้เลย
- api Axios instance — ใช้แทน fetch() เสมอ

## ปัญหาที่ต้องแก้ก่อนเริ่ม UI

SUPER_ADMIN ติด 403 เมื่อเรียก /api/payroll-components
เพราะ seed ไม่ได้ assign settings:view ให้ SUPER_ADMIN

First run:
  grep -n "settings:view\|settings:create\|settings:edit\|settings:delete" backend/prisma/seed.ts
  
Show which roles currently have settings:* permissions.
If SUPER_ADMIN is missing any settings:* permissions, 
add them to seed and re-run:
  npx ts-node backend/prisma/seed.ts
  
Verify fix:
  curl -s http://localhost:3000/api/payroll-components \
    -H "Authorization: Bearer <admin_token>"
  → should return JSON array, not 403

Commit: fix(seed): ensure SUPER_ADMIN has all settings permissions

---

## STEP 1: แทนที่ mockData ใน Settings.jsx

Show current imports at top of Settings.jsx:
  head -20 hris/src/pages/Settings.jsx

Settings.jsx ยังใช้ USERS และ AUDIT_LOGS จาก mockData:
  grep -n "USERS\|AUDIT_LOGS\|mockData" hris/src/pages/Settings.jsx

Replace ด้วย real API calls:
- USERS → api.get('/rbac/users')
- AUDIT_LOGS → api.get('/rbac/audit-logs') 
  (ถ้า endpoint ไม่มี ให้ flag แต่ไม่ต้องสร้างใหม่ในสปรินต์นี้)

Import useToast() และ useEffect สำหรับ fetch:
```jsx
const { showToast } = useToast();
const [users, setUsers] = useState([]);
const [auditLogs, setAuditLogs] = useState([]);

useEffect(() => {
  if (isSA) {
    api.get('/rbac/users').then(r => setUsers(r.data)).catch(() => {});
    api.get('/rbac/audit-logs').then(r => setAuditLogs(r.data?.data || r.data || [])).catch(() => {});
  }
}, [isSA]);
```

Commit: fix(settings): replace mockData with real API calls for users and audit logs

---

## STEP 2: Payroll Component Manager ใน Settings payroll tab

### State ที่ต้องเพิ่มใน Settings component

```javascript
const [components, setComponents] = useState([]);
const [loadingComps, setLoadingComps] = useState(false);
const [showCompModal, setShowCompModal] = useState(false);
const [editingComp, setEditingComp] = useState(null);
const [confirmDeleteComp, setConfirmDeleteComp] = useState(null);
const [testResult, setTestResult] = useState(null);
const [testLoading, setTestLoading] = useState(false);

// Fetch components when payroll tab is active
useEffect(() => {
  if (tab === 'payroll') {
    setLoadingComps(true);
    api.get('/payroll-components')
      .then(r => setComponents(r.data))
      .catch(() => showToast('โหลดข้อมูล component ไม่สำเร็จ', 'error'))
      .finally(() => setLoadingComps(false));
  }
}, [tab]);
```

### defaultComp state

```javascript
const defaultComp = {
  code: '', name: '', type: 'earning', calcMethod: 'formula',
  formula: '', functionName: '', isTaxable: true, isSSOBase: false,
  sortOrder: 99, isActive: true
};
const [compForm, setCompForm] = useState(defaultComp);
```

### Section ที่ต้องเพิ่มใน payroll tab — ต่อจาก global settings เดิม

```jsx
{/* ─── Payroll Component Manager ─── */}
<div style={{ marginTop: 28 }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', 
    alignItems: 'center', marginBottom: 14 }}>
    <div>
      <div style={{ fontWeight: 700, fontSize: 15 }}>Payroll Components</div>
      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
        จัดการรายการเงินได้/เงินหักและสูตรคำนวณ
      </div>
    </div>
    <Btn onClick={() => { setEditingComp(null); setCompForm(defaultComp); setShowCompModal(true); }}>
      + สร้าง Component
    </Btn>
  </div>

  {loadingComps ? (
    <div style={{ textAlign: 'center', padding: 24, color: C.textMuted }}>กำลังโหลด...</div>
  ) : (
    <Tbl
      columns={[
        { key: 'sortOrder', label: '#', render: r => (
          <span style={{ fontFamily: 'monospace', color: C.textMuted }}>{r.sortOrder}</span>
        )},
        { key: 'code', label: 'รหัส', render: r => (
          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: C.brand }}>{r.code}</span>
        )},
        { key: 'name', label: 'ชื่อ' },
        { key: 'type', label: 'ประเภท', render: r => (
          <Badge
            label={r.type === 'earning' ? 'เงินได้' : 'เงินหัก'}
            bg={r.type === 'earning' ? '#f0fdf4' : '#fef2f2'}
            color={r.type === 'earning' ? '#166534' : '#991b1b'}
          />
        )},
        { key: 'formula', label: 'สูตร/ฟังก์ชัน', render: r => (
          <code style={{ fontSize: 12, background: '#f1f5f9', 
            padding: '2px 8px', borderRadius: 4, color: '#334155' }}>
            {r.calcMethod === 'function' ? `fn: ${r.functionName}` : r.formula}
          </code>
        )},
        { key: 'flags', label: 'Flag', render: r => (
          <div style={{ display: 'flex', gap: 4 }}>
            {r.isTaxable && <Badge label="ภาษี" bg="#eff6ff" color="#1e40af" />}
            {r.isSSOBase && <Badge label="SSO" bg="#f0fdf4" color="#166534" />}
            {!r.isActive && <Badge label="ปิดใช้" bg="#f1f5f9" color="#64748b" />}
          </div>
        )},
        { key: 'actions', label: '', render: r => (
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn variant="secondary" size="sm" onClick={() => {
              setEditingComp(r.id);
              setCompForm({ ...r });
              setTestResult(null);
              setShowCompModal(true);
            }}>แก้ไข</Btn>
            <Btn variant="danger" size="sm" onClick={() => setConfirmDeleteComp(r)}>
              ลบ
            </Btn>
          </div>
        )},
      ]}
      data={[...components].sort((a, b) => a.sortOrder - b.sortOrder)}
    />
  )}
</div>
```

---

## STEP 3: Modal สร้าง/แก้ไข Component (พร้อม Formula Tester)

```jsx
{showCompModal && (
  <Modal
    title={editingComp ? `แก้ไข Component: ${compForm.code}` : 'สร้าง Payroll Component'}
    onClose={() => { setShowCompModal(false); setTestResult(null); }}
    width={600}
  >
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      
      {/* Row 1 */}
      <Inp label="รหัส (code) *" value={compForm.code}
        onChange={v => setCompForm(p => ({ ...p, code: v.toUpperCase() }))}
        readOnly={!!editingComp}
        placeholder="เช่น HOUSING_ALLOW" />
      <Inp label="ชื่อ *" value={compForm.name}
        onChange={v => setCompForm(p => ({ ...p, name: v }))} />

      {/* Row 2 */}
      <Sel label="ประเภท" value={compForm.type}
        onChange={v => setCompForm(p => ({ ...p, type: v }))}
        options={[
          { value: 'earning', label: 'เงินได้ (Earning)' },
          { value: 'deduction', label: 'เงินหัก (Deduction)' },
        ]} />
      <Sel label="วิธีคำนวณ" value={compForm.calcMethod}
        onChange={v => setCompForm(p => ({ ...p, calcMethod: v, formula: '', functionName: '' }))}
        options={[
          { value: 'formula', label: 'สูตร (Formula)' },
          { value: 'function', label: 'ฟังก์ชัน (Function)' },
        ]} />

      {/* Formula or Function — full width */}
      {compForm.calcMethod === 'formula' ? (
        <div style={{ gridColumn: '1/-1' }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: 5 }}>
            สูตรคำนวณ *
          </label>
          <input
            value={compForm.formula}
            onChange={e => setCompForm(p => ({ ...p, formula: e.target.value }))}
            placeholder="เช่น Salary * 3  หรือ  MIN(BASIC * 0.05, 750)"
            style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8,
              padding: '8px 12px', fontSize: 13, fontFamily: 'monospace',
              outline: 'none', background: C.surface, boxSizing: 'border-box' }}
          />
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
            ตัวแปรที่ใช้ได้: Salary, OTHours, LateMinutes, LoanDeduction, 
            BASIC, OT_PAY, BONUS, SSO, PVF, TAX, LATE_DED, LOAN_DED
          </div>
        </div>
      ) : (
        <div style={{ gridColumn: '1/-1' }}>
          <Sel label="ฟังก์ชัน (Function)" value={compForm.functionName}
            onChange={v => setCompForm(p => ({ ...p, functionName: v }))}
            options={[
              { value: '', label: '-- เลือกฟังก์ชัน --' },
              { value: 'calculateThaiTax', label: 'calculateThaiTax — ภาษีขั้นบันได (ไทย)' },
            ]} />
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
            ฟังก์ชันเหล่านี้ถูกกำหนดโดย Developer ไม่สามารถแก้ไขสูตรผ่าน UI ได้
          </div>
        </div>
      )}

      {/* Row 4 - Sort + Flags */}
      <Inp label="ลำดับคำนวณ (sortOrder)" value={compForm.sortOrder}
        onChange={v => setCompForm(p => ({ ...p, sortOrder: Number(v) }))} type="number" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'flex-end', paddingBottom: 4 }}>
        {[
          { key: 'isTaxable', label: 'นับรวมฐานภาษี' },
          { key: 'isSSOBase', label: 'นับรวมฐาน SSO' },
          { key: 'isActive', label: 'เปิดใช้งาน' },
        ].map(f => (
          <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={compForm[f.key]}
              onChange={e => setCompForm(p => ({ ...p, [f.key]: e.target.checked }))} />
            {f.label}
          </label>
        ))}
      </div>
    </div>

    {/* ─── Formula Tester ─── (แสดงเฉพาะ calcMethod = formula) */}
    {compForm.calcMethod === 'formula' && compForm.formula && (
      <div style={{ marginTop: 20, background: '#f8fafc', borderRadius: 10,
        padding: 16, border: `1px solid ${C.border}` }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
          🧪 ทดสอบสูตร
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <Inp label="Salary" type="number" placeholder="30000"
            value={testVars.Salary} onChange={v => setTestVars(p => ({ ...p, Salary: Number(v) }))} />
          <Inp label="OTHours" type="number" placeholder="0"
            value={testVars.OTHours} onChange={v => setTestVars(p => ({ ...p, OTHours: Number(v) }))} />
          <Inp label="BASIC" type="number" placeholder="30000"
            value={testVars.BASIC} onChange={v => setTestVars(p => ({ ...p, BASIC: Number(v) }))} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
          <Btn variant="secondary" onClick={handleTestFormula} disabled={testLoading}>
            {testLoading ? 'กำลังทดสอบ...' : 'รัน'}
          </Btn>
          {testResult && (
            testResult.valid ? (
              <div style={{ fontSize: 14, fontWeight: 600,
                color: '#166534', background: '#f0fdf4',
                padding: '6px 14px', borderRadius: 8 }}>
                ✅ ผลลัพธ์: {testResult.result.toLocaleString()} บาท
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#991b1b', background: '#fef2f2',
                padding: '6px 14px', borderRadius: 8 }}>
                ❌ {testResult.error}
              </div>
            )
          )}
        </div>
      </div>
    )}

    {/* Action buttons */}
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
      <Btn variant="ghost" onClick={() => { setShowCompModal(false); setTestResult(null); }}>
        ยกเลิก
      </Btn>
      <Btn onClick={handleSaveComp}>
        {editingComp ? 'บันทึกการแก้ไข' : 'สร้าง Component'}
      </Btn>
    </div>
  </Modal>
)}
```

---

## STEP 4: Handler functions

เพิ่มใน Settings component:

```javascript
// Test formula tester vars
const [testVars, setTestVars] = useState({ Salary: 30000, OTHours: 0, BASIC: 30000 });

const handleTestFormula = async () => {
  if (!compForm.formula) return;
  setTestLoading(true);
  setTestResult(null);
  try {
    const res = await api.post('/payroll-components/test', {
      formula: compForm.formula,
      dummyVars: testVars
    });
    setTestResult(res.data);
  } catch (err) {
    setTestResult({ valid: false, error: err.response?.data?.error || 'ไม่สามารถทดสอบได้' });
  } finally {
    setTestLoading(false);
  }
};

const handleSaveComp = async () => {
  if (!compForm.code || !compForm.name) {
    showToast('กรุณากรอกรหัสและชื่อ Component', 'error');
    return;
  }
  if (compForm.calcMethod === 'formula' && !compForm.formula) {
    showToast('กรุณากรอกสูตรคำนวณ', 'error');
    return;
  }
  if (compForm.calcMethod === 'function' && !compForm.functionName) {
    showToast('กรุณาเลือกฟังก์ชัน', 'error');
    return;
  }
  try {
    if (editingComp) {
      const res = await api.put(`/payroll-components/${editingComp}`, compForm);
      setComponents(p => p.map(c => c.id === editingComp ? res.data : c));
      showToast('แก้ไข Component สำเร็จ', 'success');
    } else {
      const res = await api.post('/payroll-components', compForm);
      setComponents(p => [...p, res.data]);
      showToast('สร้าง Component สำเร็จ', 'success');
    }
    setShowCompModal(false);
    setTestResult(null);
  } catch (err) {
    showToast(`ไม่สามารถบันทึกได้: ${err.response?.data?.message || err.message}`, 'error');
  }
};

const handleDeleteComp = async () => {
  try {
    await api.delete(`/payroll-components/${confirmDeleteComp.id}`);
    setComponents(p => p.filter(c => c.id !== confirmDeleteComp.id));
    showToast(`ลบ "${confirmDeleteComp.name}" สำเร็จ`, 'success');
  } catch (err) {
    showToast(`ลบไม่สำเร็จ: ${err.response?.data?.message || err.message}`, 'error');
  }
};
```

---

## STEP 5: ConfirmModal สำหรับ Delete Component

```jsx
{confirmDeleteComp && (
  <ConfirmModal
    title="ยืนยันการลบ Component"
    message={`ลบ "${confirmDeleteComp.name}" (${confirmDeleteComp.code})?
      Component นี้จะถูกปิดการใช้งาน (soft delete) 
      ประวัติ Payroll ที่ผ่านมาจะไม่ได้รับผลกระทบ`}
    confirmLabel="ยืนยันการลบ"
    onConfirm={handleDeleteComp}
    onClose={() => setConfirmDeleteComp(null)}
  />
)}
```

---

## Commit Strategy

  fix(seed): ensure SUPER_ADMIN has all settings permissions
  fix(settings): replace mockData with real API calls for users and audit logs
  feat(settings): add Payroll Component manager UI with formula tester

3 commits. Do not combine.

---

## Verification

1. เปิด Settings → tab "เงินเดือน"
   ต้องเห็น table แสดง 8 components (BASIC, OT_PAY, BONUS, SSO, PVF, TAX, LATE_DED, LOAN_DED)

2. คลิก "+ สร้าง Component"
   ใส่ code="HOUSING", name="ค่าที่พัก", type=earning, 
   formula="Salary*0.1", sortOrder=2.5
   กด "รัน" ใน formula tester → ต้องเห็น ✅ ผลลัพธ์: 3,000 บาท (สำหรับ Salary=30000)
   กด "สร้าง Component" → ต้องเห็น toast ✅ และ table แสดง component ใหม่

3. คลิก "แก้ไข" component BONUS
   เปลี่ยน formula จาก "0" เป็น "Salary * 0.5"
   กด "รัน" → ต้องเห็น ✅ 15,000 บาท
   กด "บันทึกการแก้ไข" → toast ✅

4. คลิก "ลบ" component HOUSING ที่สร้างใหม่
   ต้องเห็น ConfirmModal ไม่ใช่ browser alert
   กด "ยืนยัน" → toast ✅ และ HOUSING หายจาก table

5. ทดสอบ formula ผิด syntax:
   ใส่ formula = "Salary ***" แล้วกด "รัน"
   ต้องเห็น ❌ error message ไม่ใช่หน้า crash

6. ทดสอบ soft delete — component ที่ "ลบ" ต้องไม่หาย 
   จากฐานข้อมูลจริง (isActive=false):
   SELECT code, "isActive" FROM "PayrollComponent" WHERE code='HOUSING';
   ต้องได้ isActive=false ไม่ใช่ row หายไปจาก DB

Show all 6 verification outputs.

---

## PLANNING MODE REMINDER

Show me first:
1. grep output จาก seed: settings:* permissions ปัจจุบัน
2. grep -n "USERS\|AUDIT_LOGS\|mockData" hris/src/pages/Settings.jsx

Then produce Implementation Plan Artifact.
Fix seed permissions FIRST (pre-step) before any UI changes.