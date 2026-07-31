=== SPRINT: Employee Module — F5 to F9 (All Remaining Features) ===

Read CONTEXT.md and tasks.md first.

PLANNING MODE: Produce ONE Implementation Plan Artifact covering all 5 features.
Show current code for every file you plan to touch BEFORE proposing changes.
Wait for my approval before writing any code.

---

## CONTEXT: สิ่งที่มีอยู่แล้ว (อย่า touch โดยไม่จำเป็น)

- Employee.jsx — F1-F4 เสร็จแล้ว ใช้ api Axios, empCode จาก backend, ไม่มี fetch()
- EmployeeProfile.jsx — แสดง fields พื้นฐาน (empCode, hireDate, phone, email, salary, bank)
- EmployeeHistory.jsx — มีอยู่แล้ว ดู implementation ก่อน
- EmpHistory model — มีใน schema (id, empId, date, type, oldVal, newVal, remark)
- updateEmployee controller — ใช้ spread ...data ไม่มี salary history tracking
- Modal, Inp, Sel, Btn, Card, Tabs — common UI components ใช้ได้เลย
- C (theme object) — ใช้สำหรับ colors/styling

---

## FILES TO SHOW BEFORE STARTING (required)

Run these first and show ALL outputs:

1. cat hris/src/components/employee/EmployeeHistory.jsx
2. cat hris/src/hooks/useEmployees.js
3. grep -A 60 "model Employee {" backend/prisma/schema.prisma
4. cat hris/src/App.jsx

Then produce Implementation Plan Artifact covering F5-F9.
Do NOT write code until I approve.

---

## F5: เพิ่ม fields ธนาคาร + SSO + ภาษีใน Add/Edit Modal

### Schema — เพิ่ม fields ใน Employee model

Fields ที่ต้องเพิ่ม (ยังไม่มีใน schema):
```prisma
  nationalId  String?   // เลขบัตรประชาชน / passport
  ssoNumber   String?   // เลขผู้ประกันตน
  taxId       String?   // เลขประจำตัวผู้เสียภาษี
  taxMethod   String?   @default("progressive")
  address     String?   // ที่อยู่
```

Fields ที่มีใน schema แต่ยังไม่อยู่ใน form: dob, gender, workCountry, taxCountry

After editing schema:
  npx prisma migrate dev --name add_employee_personal_fields
Show migration output.

### Modal — restructure เป็น Tabs

เปลี่ยนจาก flat grid เป็น 4 tabs:

Tab 1 "ข้อมูลพื้นฐาน":
  ชื่อ-นามสกุล (full width), แผนก, ตำแหน่ง,
  กะ, ประเภทพนักงาน, วันเริ่มงาน, วันเกิด,
  เพศ (select: ชาย/หญิง/ไม่ระบุ)

Tab 2 "ข้อมูลติดต่อ":
  โทรศัพท์, อีเมล, ที่อยู่ (textarea full width),
  เลขบัตรประชาชน/Passport,
  ── ผู้ติดต่อฉุกเฉิน ──
  ชื่อ, ความสัมพันธ์, เบอร์โทร

Tab 3 "การเงิน" (แสดงเฉพาะ isHR):
  เงินเดือน (บาท),
  ธนาคาร (select: กสิกร/กรุงเทพ/ไทยพาณิชย์/กรุงไทย/ทหารไทย/อื่นๆ),
  เลขบัญชี, วิธีคำนวณภาษี (select: Progressive/Flat Rate),
  เลขผู้ประกันตน (SSO), เลขผู้เสียภาษี

Tab 4 "ข้อมูลประเทศ":
  ประเทศที่ทำงาน (workCountry), ประเทศที่เสียภาษี (taxCountry)

### defaultEmp update

```javascript
const defaultEmp = {
  name: "", deptId: 1, posId: 1, type: "fulltime",
  hireDate: "", salary: "", phone: "", email: "",
  shiftId: 1, emName: "", emPhone: "", emRel: "",
  dob: "", gender: "", nationalId: "", address: "",
  bank: "", bankAcc: "", ssoNumber: "", taxId: "",
  taxMethod: "progressive", workCountry: "TH", taxCountry: "TH"
};
```

### EmployeeProfile.jsx — เพิ่ม sections

เพิ่ม 3 sections ใหม่:
- ข้อมูลส่วนตัว: dob, gender, nationalId, address
- ข้อมูลการเงิน (isHR only): bank, bankAcc, ssoNumber, taxId, taxMethod
- ข้อมูลประเทศ: workCountry, taxCountry (แสดงถ้า workCountry !== 'TH')

Commit: feat(employee): add personal, banking, SSO and tax fields to form and profile

---

## F6: Filter bar (แผนก, ประเภท, สถานะ)

### Filter state ใน Employee.jsx

```javascript
const [filterDept, setFilterDept] = useState('');
const [filterType, setFilterType] = useState('');
const [filterStatus, setFilterStatus] = useState('active');
```

### useEmployees hook — extend params

ส่ง filter params เพิ่มเติม:
  api.get('/employees', { params: { page, limit, search, deptId: filterDept, type: filterType, status: filterStatus } })

### Backend getEmployees() — รับ filter params

```typescript
const { deptId, type, status } = req.query;
if (deptId) finalWhere.deptId = Number(deptId);
if (type) finalWhere.type = type as string;
// status: ถ้าไม่ส่งมา default = 'active'
finalWhere.status = (status as string) || 'active';
```

NOTE: status filter ต้องไม่ override scopeWhere — merge ให้ถูกต้อง

### Filter UI

เพิ่มต่อจาก search bar:
```jsx
<Sel value={filterDept} onChange={v => { setFilterDept(v); setPage(1); }}
  options={[{ value: '', label: 'ทุกแผนก' }, ...depts.map(d => ({ value: d.id, label: d.name }))]} />
<Sel value={filterType} onChange={v => { setFilterType(v); setPage(1); }}
  options={[
    { value: '', label: 'ทุกประเภท' },
    { value: 'fulltime', label: 'พนักงานประจำ' },
    { value: 'parttime', label: 'พาร์ทไทม์' },
    { value: 'contract', label: 'สัญญาจ้าง' },
  ]} />
<Sel value={filterStatus} onChange={v => { setFilterStatus(v); setPage(1); }}
  options={[
    { value: '', label: 'ทุกสถานะ' },
    { value: 'active', label: 'ทำงานอยู่' },
    { value: 'inactive', label: 'พ้นสภาพ' },
  ]} />
```

Commit: feat(employee): add department/type/status filter bar

---

## F7: Salary History tracking ใน EmpHistory

### Backend — updateEmployee() track changes

Before updating, fetch current state then compare:

```typescript
const current = await prisma.employee.findUnique({
  where: { id: employeeId },
  select: { salary: true, posId: true, deptId: true, name: true }
});

const employee = await prisma.employee.update({ where: { id: employeeId }, data });

// Track salary change
if (current && data.salary !== undefined && Number(data.salary) !== current.salary) {
  await prisma.empHistory.create({
    data: {
      empId: employeeId,
      date: new Date().toISOString().split('T')[0],
      type: 'salary',
      oldVal: String(current.salary),
      newVal: String(data.salary),
      remark: `Updated by user ${req.user?.id}`
    }
  });
}

// Track position change
if (current && data.posId && Number(data.posId) !== current.posId) {
  await prisma.empHistory.create({
    data: {
      empId: employeeId,
      date: new Date().toISOString().split('T')[0],
      type: 'position',
      oldVal: String(current.posId),
      newVal: String(data.posId),
      remark: `Updated by user ${req.user?.id}`
    }
  });
}

// Track department change
if (current && data.deptId && Number(data.deptId) !== current.deptId) {
  await prisma.empHistory.create({
    data: {
      empId: employeeId,
      date: new Date().toISOString().split('T')[0],
      type: 'department',
      oldVal: String(current.deptId),
      newVal: String(data.deptId),
      remark: `Updated by user ${req.user?.id}`
    }
  });
}
```

### Frontend — EmployeeHistory.jsx update

Show me current file first, then update to show:

```
type config:
  salary     → 💰 ปรับเงินเดือน   → แสดง oldVal → newVal + % change
  position   → 📋 เปลี่ยนตำแหน่ง  → แสดง posName(oldVal) → posName(newVal)
  department → 🏢 เปลี่ยนแผนก     → แสดง deptName(oldVal) → deptName(newVal)
  other      → 📝 บันทึก           → แสดง newVal
```

getEmployeeDetails() already returns history[] — no backend change for this part.

Commit: feat(employee): track salary/position/dept changes in EmpHistory

---

## F8: ConfirmModal แทน window.confirm()

### Create hris/src/components/common/ConfirmModal.jsx

```jsx
import React from 'react';
import { Modal, Btn } from './UI';
import { C } from '../../utils/theme';

export const ConfirmModal = ({ title, message, confirmLabel = "ยืนยัน",
  confirmVariant = "danger", onConfirm, onClose }) => (
  <Modal title={title} onClose={onClose} width={420}>
    <p style={{ fontSize: 14, color: C.text, margin: '0 0 24px', lineHeight: 1.6 }}>
      {message}
    </p>
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
      <Btn variant="ghost" onClick={onClose}>ยกเลิก</Btn>
      <Btn variant={confirmVariant} onClick={() => { onConfirm(); onClose(); }}>
        {confirmLabel}
      </Btn>
    </div>
  </Modal>
);
```

### ใช้ใน Employee.jsx

```javascript
const [confirmState, setConfirmState] = useState(null);
// { empId, empName } or null

// Replace deleteEmp window.confirm:
const deleteEmp = (id, name) => setConfirmState({ empId: id, empName: name });

const handleConfirmDelete = async () => {
  try {
    await api.delete(`/employees/${confirmState.empId}`);
    setEmps(p => p.map(e => e.id === confirmState.empId ? { ...e, status: "inactive" } : e));
    showToast('ปิดการใช้งานพนักงานสำเร็จ', 'success');
  } catch (err) {
    showToast(`เกิดข้อผิดพลาด: ${err.response?.data?.message || err.message}`, 'error');
  }
};
```

```jsx
{confirmState && (
  <ConfirmModal
    title="ยืนยันการปิดการใช้งาน"
    message={`คุณต้องการปิดการใช้งานบัญชีของ "${confirmState.empName}" ใช่หรือไม่? การดำเนินการนี้สามารถย้อนกลับได้โดย Admin`}
    confirmLabel="ยืนยัน"
    onConfirm={handleConfirmDelete}
    onClose={() => setConfirmState(null)}
  />
)}
```

Commit: feat(ui): add ConfirmModal component, replace window.confirm in Employee

---

## F9: Toast notification แทน alert()

### Create hris/src/components/common/Toast.jsx

```jsx
import React, { useState, useCallback, createContext, useContext } from 'react';

export const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration);
  }, []);

  const config = {
    success: { bg: '#f0fdf4', border: '#86efac', color: '#166534', icon: '✅' },
    error:   { bg: '#fef2f2', border: '#fca5a5', color: '#991b1b', icon: '❌' },
    info:    { bg: '#eff6ff', border: '#93c5fd', color: '#1e40af', icon: 'ℹ️' },
    warning: { bg: '#fffbeb', border: '#fcd34d', color: '#92400e', icon: '⚠️' },
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(t => {
          const s = config[t.type] || config.success;
          return (
            <div key={t.id} style={{
              background: s.bg, border: `1px solid ${s.border}`, color: s.color,
              borderRadius: 10, padding: '12px 16px', fontSize: 14, fontWeight: 500,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              display: 'flex', alignItems: 'center', gap: 8,
              minWidth: 260, maxWidth: 400
            }}>
              <span>{s.icon}</span>
              <span style={{ flex: 1 }}>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
```

### Wrap App with ToastProvider

Show me current hris/src/App.jsx first, then wrap:
```jsx
import { ToastProvider } from './components/common/Toast';
// Wrap root element or router with <ToastProvider>
```

### Replace alert() in Employee.jsx

Replace all 3 alert() calls:
```javascript
// import
const { showToast } = useToast();

// handleFileUpload success
showToast('อัปโหลดเอกสารสำเร็จ', 'success');

// saveEmp success
showToast(editingEmp ? 'แก้ไขข้อมูลพนักงานสำเร็จ' : 'เพิ่มพนักงานใหม่สำเร็จ', 'success');

// saveEmp error
showToast(`บันทึกไม่สำเร็จ: ${err.message}`, 'error');
```

Commit: feat(ui): add Toast notification system, replace alert() in Employee

---

## Commit Strategy

  feat(employee): add personal, banking, SSO and tax fields to form and profile
  feat(employee): add department/type/status filter bar
  feat(employee): track salary/position/dept changes in EmpHistory
  feat(ui): add ConfirmModal component, replace window.confirm in Employee
  feat(ui): add Toast notification system, replace alert() in Employee

One commit per feature. Do NOT combine.
Do NOT touch: usePermission, AuthContext, scopeFilter, auth.middleware

---

## PLANNING MODE REMINDER

Show me these files FIRST before any plan:
1. cat hris/src/components/employee/EmployeeHistory.jsx
2. cat hris/src/hooks/useEmployees.js
3. grep -A 60 "model Employee {" backend/prisma/schema.prisma
4. cat hris/src/App.jsx

Then produce Implementation Plan Artifact.
One plan covering all F5-F9.
Wait for approval before implementing.


3 จุดที่ต้อง review ตอน agent ส่ง Plan กลับ:
F5 — ต้องดู migration output ก่อน approve implement เพราะ Employee table มี data จริงอยู่แล้ว
F6 — ตรวจว่า status filter ไม่ override scopeWhere ที่ backend สร้างจาก DataScope
F9 — ตรวจว่า ToastProvider ครอบ Router ถูกต้อง ไม่งั้น useToast() จะ return null ครับ