=== SPRINT: Attendance.jsx — Replace mockData + Wire Real API ===

Read CONTEXT.md, tasks.md first.
PLANNING MODE — show plan before any code changes.
Wait for my approval before implementing.

---

## CONTEXT: สิ่งที่มีอยู่แล้ว

- useAttendance(isHR) hook — fetch /api/attendance ✅
- useLeaves() hook — fetch /api/leaves ✅  
- /api/leaves GET, GET /:id, POST ✅
- /api/attendance GET, POST /clock-in, POST /clock-out ✅
- api Axios instance, useToast(), ConfirmModal ✅

## สิ่งที่ขาด — ต้องสร้างก่อน implement frontend

Show me first:
  cat backend/src/controllers/leave.controller.ts
  cat backend/src/controllers/attendance.controller.ts
  grep -rn "correction\|Correction" backend/src/routes/attendance.routes.ts

---

## BACKEND GAPS ที่ต้องสร้างก่อน

### GAP 1: Leave approval endpoint

ปัจจุบัน leave.routes.ts ไม่มี PUT /:id/approve
เพิ่ม:
  PUT /api/leaves/:id/approve
    body: { status: 'approved' | 'rejected', comment?: string }
    requirePermission('leave:approve')
    writeAudit() → action: 'UPDATE', module: 'attendance'

Controller logic:
  1. ตรวจว่า leave exists
  2. ถ้า approve → check leave balance (leaveBalance model หรือ field ใน Employee)
     ถ้าไม่มี leave balance model ให้ flag และ approve ได้โดยไม่ check ก่อน
  3. update status + approvedBy + approvedAt
  4. return updated leave

Show me if LeaveBalance model exists:
  grep -n "LeaveBalance\|leaveBalance\|leave_balance" backend/prisma/schema.prisma

### GAP 2: Attendance Correction endpoints

ปัจจุบัน attendance.routes.ts มีแค่ clock-in/out ไม่มี correction
เพิ่ม:
  POST /api/attendance/corrections
    body: { date, type, requestedTime, reason }
    requirePermission('attendance:create')
    
  GET /api/attendance/corrections
    requirePermission('attendance:view')
    apply buildEmployeeWhereClause scope
    
  PUT /api/attendance/corrections/:id/approve
    body: { status: 'approved' | 'rejected' }
    requirePermission('attendance:approve')
    writeAudit()

Check if AttendanceCorrection model exists:
  grep -A 10 "model AttendanceCorrection" backend/prisma/schema.prisma

If model doesn't exist, propose schema and wait for approval before migrate.

### GAP 3: Check clock-in status endpoint

ปัจจุบัน Attendance.jsx ไม่รู้ว่า user clock-in ไปแล้วหรือยัง
เพิ่ม:
  GET /api/attendance/today
    return: { clockedIn: boolean, clockIn: string|null, clockOut: string|null }
    requirePermission('attendance:view')

---

## FRONTEND FIXES

### FIX 1: ลบ mockData imports

Remove:
  import { INIT_SHIFTS, INIT_OT, ATT_CORRECTIONS, INIT_LEAVE_BALANCE, EMPLOYEES } from '../utils/mockData';

Add:
  import api from '../utils/api';
  import { useToast } from '../components/common/Toast';
  import { ConfirmModal } from '../components/common/ConfirmModal';

### FIX 2: state เริ่มต้น

Replace:
  const [corrections, setCorrections] = useState(ATT_CORRECTIONS);
  const [leaveBalances, setLeaveBalances] = useState(INIT_LEAVE_BALANCE);

With:
  const [corrections, setCorrections] = useState([]);
  const [loadingCorrections, setLoadingCorrections] = useState(false);
  const [clockedIn, setClockedIn] = useState(false);  // keep existing
  const [clockTime, setClockTime] = useState(null);    // keep existing
  const { showToast } = useToast();

### FIX 3: useEffect — fetch corrections + today status

```javascript
useEffect(() => {
  // Fetch corrections
  const fetchCorrections = async () => {
    setLoadingCorrections(true);
    try {
      const res = await api.get('/attendance/corrections');
      setCorrections(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err) {
      showToast('โหลดคำขอแก้เวลาไม่สำเร็จ', 'error');
    } finally {
      setLoadingCorrections(false);
    }
  };

  // Check today's clock-in status
  const fetchTodayStatus = async () => {
    try {
      const res = await api.get('/attendance/today');
      setClockedIn(res.data.clockedIn);
      setClockTime(res.data.clockIn ? new Date(res.data.clockIn).toLocaleTimeString('th-TH') : null);
    } catch (err) {
      // silent fail — not critical
    }
  };

  fetchCorrections();
  fetchTodayStatus();
}, []);
```

### FIX 4: handleCheckIn + handleCheckOut — แทน fetch() + alert()

```javascript
const handleCheckIn = () => {
  if (!navigator.geolocation) {
    showToast('เบราว์เซอร์ไม่รองรับ GPS', 'error');
    return;
  }
  showToast('กำลังตรวจสอบพิกัด GPS...', 'info');
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      const dist = getDistance(OFFICE_LAT, OFFICE_LNG, latitude, longitude);
      if (dist > ALLOWED_RADIUS) {
        showToast(`เช็คอินล้มเหลว — อยู่ห่าง ${Math.round(dist).toLocaleString()} เมตร (เกินระยะ ${ALLOWED_RADIUS} เมตร)`, 'error');
        return;
      }
      try {
        const res = await api.post('/attendance/clock-in', { lat: latitude, lng: longitude });
        setClockedIn(true);
        setClockTime(res.data.clockIn ? new Date(res.data.clockIn).toLocaleTimeString('th-TH') : new Date().toLocaleTimeString('th-TH'));
        showToast(`เช็คอินสำเร็จ (ระยะห่าง: ${Math.round(dist)} เมตร)`, 'success');
      } catch (err) {
        showToast(`เช็คอินล้มเหลว: ${err.response?.data?.message || err.message}`, 'error');
      }
    },
    () => showToast('ไม่สามารถดึงตำแหน่ง GPS ได้ กรุณาอนุญาต Location Permission', 'error'),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
};

const handleCheckOut = () => {
  if (!navigator.geolocation) {
    showToast('เบราว์เซอร์ไม่รองรับ GPS', 'error');
    return;
  }
  showToast('กำลังตรวจสอบพิกัด GPS...', 'info');
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      const dist = getDistance(OFFICE_LAT, OFFICE_LNG, latitude, longitude);
      if (dist > ALLOWED_RADIUS) {
        showToast(`เช็คเอาท์ล้มเหลว — อยู่ห่าง ${Math.round(dist).toLocaleString()} เมตร`, 'error');
        return;
      }
      try {
        await api.post('/attendance/clock-out', { lat: latitude, lng: longitude });
        setClockedIn(false);
        setClockTime(null);
        showToast(`เช็คเอาท์สำเร็จ (ระยะห่าง: ${Math.round(dist)} เมตร)`, 'success');
      } catch (err) {
        showToast(`เช็คเอาท์ล้มเหลว: ${err.response?.data?.message || err.message}`, 'error');
      }
    },
    () => showToast('ไม่สามารถดึงตำแหน่ง GPS ได้', 'error'),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
};
```

### FIX 5: submitLeave — แทน fetch() + alert()

```javascript
const submitLeave = async () => {
  const days = newLeave.startDate && newLeave.endDate
    ? countWorkingDays(newLeave.startDate, newLeave.endDate) : 1;
  try {
    const res = await api.post('/leaves', {
      empId: user.empId,
      ...newLeave,
      days,
      status: 'pending_manager'
    });
    setLeaves(p => [...p, res.data]);
    setShowLeaveModal(false);
    setLeaveWarning(null);
    showToast('ยื่นคำขอลาสำเร็จ', 'success');
  } catch (err) {
    showToast(`ยื่นคำขอลาไม่สำเร็จ: ${err.response?.data?.message || err.message}`, 'error');
  }
};
```

### FIX 6: approveLeave — เรียก API จริง

```javascript
const approveLeave = async (id, status) => {
  try {
    const res = await api.put(`/leaves/${id}/approve`, { status });
    setLeaves(p => p.map(l => l.id === id ? { ...l, ...res.data } : l));
    setLeaveWarning(null);
    showToast(`${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}คำขอลาสำเร็จ`, 'success');
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    if (msg.includes('quota') || msg.includes('สิทธิ์')) {
      setLeaveWarning(`⚠️ ${msg}`);
    } else {
      showToast(`ดำเนินการไม่สำเร็จ: ${msg}`, 'error');
    }
  }
};
```

### FIX 7: submitCorrection — เรียก API จริง

```javascript
const submitCorrection = async () => {
  try {
    const res = await api.post('/attendance/corrections', {
      empId: user.empId,
      ...newCorrection,
      status: 'pending_manager'
    });
    setCorrections(p => [...p, res.data]);
    setShowCorrectionModal(false);
    showToast('ส่งคำร้องแก้เวลาสำเร็จ', 'success');
  } catch (err) {
    showToast(`ส่งคำร้องไม่สำเร็จ: ${err.response?.data?.message || err.message}`, 'error');
  }
};
```

### FIX 8: approveCorrection — เรียก API จริง

```javascript
const approveCorrection = async (id, status) => {
  try {
    const res = await api.put(`/attendance/corrections/${id}/approve`, { status });
    setCorrections(p => p.map(c => c.id === id ? { ...c, ...res.data } : c));
    showToast(`${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}คำขอแก้เวลาสำเร็จ`, 'success');
  } catch (err) {
    showToast(`ดำเนินการไม่สำเร็จ: ${err.response?.data?.message || err.message}`, 'error');
  }
};
```

### FIX 9: ลบ getEmp / getEmpName จาก Attendance.jsx

ตรวจว่ายังใช้อยู่ที่ไหน:
  grep -n "getEmp\|getEmpName\|EMPLOYEES" hris/src/pages/Attendance.jsx

ถ้าใช้ใน sub-components ให้ flag ว่าต้องแก้ component นั้นด้วย

---

## Commit Strategy

Backend (committed to root repo):
  feat(attendance): add correction CRUD endpoints
  feat(leaves): add approval endpoint PUT /:id/approve
  feat(attendance): add GET /today for clock-in status

Frontend (committed to hris/ repo):
  fix(attendance): remove mockData, wire real API for leaves and corrections
  fix(attendance): replace fetch()+alert() with api+toast in clock-in/out

---

## PLANNING MODE REMINDER

Show me BEFORE writing any code:
1. cat backend/src/controllers/leave.controller.ts
2. cat backend/src/controllers/attendance.controller.ts
3. grep -A 10 "model AttendanceCorrection" backend/prisma/schema.prisma
4. grep -n "LeaveBalance\|leaveQuota" backend/prisma/schema.prisma
5. grep -n "getEmp\|getEmpName\|EMPLOYEES\|leaveBalance\|INIT_" hris/src/pages/Attendance.jsx

Then produce Implementation Plan Artifact.
Flag any schema that needs migration — wait for approval before migrate.
Wait for approval before implementing.