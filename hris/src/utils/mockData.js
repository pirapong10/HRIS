export const AUDIT_LOGS = [];
export const logAudit = (actorId, action, module, targetId = null) => {
  AUDIT_LOGS.unshift({ id: Date.now(), actorId, action, module, targetId, createdAt: new Date().toLocaleString("th-TH") });
};

export const USERS = [
  { id: 1, email: "admin@company.com", passwordHash: "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9", role: "superadmin", name: "ธนพล วิเชียร" },
  { id: 2, email: "hr@company.com", passwordHash: "60b0289dfc498ab1e8e09fde4e574bfe9fa1e77e2e4dd3e4db498594aae2858a", role: "hr_admin", name: "นิตยา สมบูรณ์" },
  { id: 3, email: "emp@company.com", passwordHash: "b0f3dc6483c654427e769a21a4fbb498b94890b952dd64e1adbe990e77ca1947", role: "user", name: "สมชาย ใจดี", empId: 3 },
];

export const DEPTS = [
  { id: 10, name: "ผู้บริหาร (Executive)", code: "EXEC", headId: 1, employeeCount: 2, parentId: null, costCenterId: null },
  { id: 1, name: "ฝ่ายเทคโนโลยีสารสนเทศ", code: "IT", headId: 1, employeeCount: 12, parentId: 10, costCenterId: 1 },
  { id: 2, name: "ฝ่ายทรัพยากรบุคคล", code: "HR", headId: 2, employeeCount: 8, parentId: 10, costCenterId: 2 },
  { id: 3, name: "ฝ่ายการเงิน", code: "FIN", headId: null, employeeCount: 6, parentId: 10, costCenterId: null },
  { id: 4, name: "ฝ่ายการตลาด", code: "MKT", headId: null, employeeCount: 10, parentId: 10, costCenterId: null },
  { id: 5, name: "ฝ่ายออกแบบ UI/UX", code: "DES", headId: null, employeeCount: 4, parentId: 1, costCenterId: 1 },
];

export const POSITIONS = [
  { id: 1, name: "Software Engineer", deptId: 1, level: "Junior", salary: 35000 },
  { id: 2, name: "Senior Software Engineer", deptId: 1, level: "Senior", salary: 55000 },
  { id: 3, name: "HR Specialist", deptId: 2, level: "Junior", salary: 28000 },
  { id: 4, name: "HR Manager", deptId: 2, level: "Manager", salary: 45000 },
  { id: 5, name: "Financial Analyst", deptId: 3, level: "Junior", salary: 32000 },
];

export const COST_CENTERS = [
  { id: 1, code: "CC-IT-001", name: "IT Operations", budget: 1500000, fiscalYear: "2025" },
  { id: 2, code: "CC-HR-001", name: "HR & Recruitment", budget: 800000, fiscalYear: "2025" },
];

export const HEADCOUNT_REQUESTS = [
  { id: 1, posId: 1, quantity: 2, reason: "รองรับโปรเจกต์ใหม่", status: "pending_manager", requestedBy: 1, date: "2025-06-01" },
  { id: 2, posId: 5, quantity: 1, reason: "พนักงานเดิมลาออก", status: "approved", requestedBy: 2, date: "2025-05-15" }
];

export const EMPLOYEES = [
  { id: 1, empCode: "EMP001", name: "ธนพล วิเชียร", deptId: 1, posId: 2, type: "fulltime", status: "active", hireDate: "2021-03-01", dob: "1990-05-15", gender: "male", salary: 55000, bank: "กสิกรไทย", bankAcc: "xxx-x-xx001-x", phone: "081-234-5678", email: "thanapol@company.com", shiftId: 1, emName: "คุณแม่วิเชียร", emRel: "มารดา", emPhone: "089-999-9999" },
  { id: 2, empCode: "EMP002", name: "นิตยา สมบูรณ์", deptId: 2, posId: 4, type: "fulltime", status: "active", hireDate: "2020-06-15", dob: "1988-09-22", gender: "female", salary: 45000, bank: "ไทยพาณิชย์", bankAcc: "xxx-x-xx002-x", phone: "082-345-6789", email: "nittaya@company.com", shiftId: 1 },
  { id: 3, empCode: "EMP003", name: "สมชาย ใจดี", deptId: 1, posId: 1, type: "fulltime", status: "active", hireDate: "2023-01-10", dob: "1995-12-01", gender: "male", salary: 35000, bank: "กรุงเทพ", bankAcc: "xxx-x-xx003-x", phone: "083-456-7890", email: "somchai@company.com", shiftId: 2 },
  { id: 4, empCode: "EMP004", name: "วิภา รักดี", deptId: 3, posId: 5, type: "fulltime", status: "active", hireDate: "2022-08-20", dob: "1992-03-14", gender: "female", salary: 32000, bank: "กรุงไทย", bankAcc: "xxx-x-xx004-x", phone: "084-567-8901", email: "wipa@company.com", shiftId: 3 },
  { id: 5, empCode: "EMP005", name: "ชัยวัฒน์ ดีงาม", deptId: 4, posId: 1, type: "parttime", status: "active", hireDate: "2023-05-01", dob: "1998-07-25", gender: "male", salary: 18000, bank: "ทหารไทย", bankAcc: "xxx-x-xx005-x", phone: "085-678-9012", email: "chaiwat@company.com", shiftId: 1 },
];

export const EMP_DOCS = [
  { id: 1, empId: 1, name: "สัญญาจ้าง.pdf", type: "contract", date: "2021-03-01", size: "1.2 MB" },
  { id: 2, empId: 1, name: "สำเนาบัตรประชาชน.jpg", type: "id", date: "2021-03-01", size: "500 KB" },
  { id: 3, empId: 3, name: "ใบรับรองแพทย์_0125.pdf", type: "medical", date: "2025-01-15", size: "300 KB" }
];

export const EMP_HISTORY = [
  { id: 1, empId: 1, date: "2023-01-01", type: "promotion", oldVal: "Software Engineer", newVal: "Senior Software Engineer", remark: "Performance Review Q4" },
  { id: 2, empId: 1, date: "2022-01-01", type: "salary", oldVal: "40000", newVal: "55000", remark: "Annual Increase" }
];

export const ONBOARDING_TASKS = [
  { id: 1, empId: 3, task: "เซ็นสัญญาจ้าง", done: true },
  { id: 2, empId: 3, task: "รับมอบอุปกรณ์ (Laptop)", done: false },
  { id: 3, empId: 3, task: "สร้างบัญชีอีเมลบริษัท", done: true },
  { id: 4, empId: 3, task: "ปฐมนิเทศพนักงานใหม่", done: false },
  { id: 5, empId: 0, task: "ปฐมนิเทศพนักงานใหม่ (ตัวอย่าง)", done: false }
];

import { C } from './theme';

export const INIT_SHIFTS = [
  { id: 1, name: "Morning Shift", startTime: "08:00", endTime: "17:00", breakMins: 60, days: ["Mon", "Tue", "Wed", "Thu", "Fri"], otRate: 1.5, otRateHoliday: 3.0, color: C.brand },
  { id: 2, name: "Evening Shift", startTime: "14:00", endTime: "23:00", breakMins: 60, days: ["Mon", "Tue", "Wed", "Thu", "Fri"], otRate: 1.5, otRateHoliday: 3.0, color: C.purple },
  { id: 3, name: "Night Shift", startTime: "22:00", endTime: "07:00", breakMins: 60, days: ["Mon", "Tue", "Wed", "Thu", "Fri"], otRate: 2.0, otRateHoliday: 3.0, color: C.teal },
  { id: 4, name: "Weekend Shift", startTime: "08:00", endTime: "17:00", breakMins: 60, days: ["Sat", "Sun"], otRate: 2.0, otRateHoliday: 3.0, color: C.orange },
];

export const INIT_ATT_RAW = [
  { id: 1, empId: 1, date: "2025-06-16", clockIn: "08:52", clockOut: "20:05", shiftId: 1, note: "", otHours: 2, otApproved: true },
  { id: 2, empId: 2, date: "2025-06-16", clockIn: "09:01", clockOut: "18:00", shiftId: 1, note: "", otHours: 0, otApproved: false },
  { id: 3, empId: 3, date: "2025-06-16", clockIn: "14:15", clockOut: "23:30", shiftId: 2, note: "รถติด", otHours: 0.5, otApproved: false },
  { id: 4, empId: 1, date: "2025-06-17", clockIn: "08:58", clockOut: "19:00", shiftId: 1, note: "", otHours: 1, otApproved: true },
  { id: 5, empId: 2, date: "2025-06-17", clockIn: "09:00", clockOut: "17:55", shiftId: 1, note: "", otHours: 0, otApproved: false },
  { id: 6, empId: 3, date: "2025-06-17", clockIn: "13:50", clockOut: "23:00", shiftId: 2, note: "", otHours: 0, otApproved: false },
  { id: 7, empId: 4, date: "2025-06-16", clockIn: "22:00", clockOut: "07:00", shiftId: 3, note: "", otHours: 0, otApproved: false },
];

export const INIT_OT = [
  { id: 1, empId: 3, date: "2025-06-18", shiftId: 2, reason: "งานด่วน sprint deadline", requestedHours: 3, status: "pending", approver: null },
  { id: 2, empId: 1, date: "2025-06-19", shiftId: 1, reason: "รองรับ client presentation", requestedHours: 2, status: "approved", approver: "นิตยา สมบูรณ์" },
  { id: 3, empId: 4, date: "2025-06-20", shiftId: 3, reason: "ปิดงบเดือน", requestedHours: 2, status: "pending", approver: null },
];

export const LEAVES = [
  { id: 1, empId: 3, type: "ลากิจ", startDate: "2025-06-20", endDate: "2025-06-20", days: 1, status: "pending_manager", reason: "ธุระส่วนตัว" },
  { id: 2, empId: 1, type: "ลาพักร้อน", startDate: "2025-07-01", endDate: "2025-07-03", days: 3, status: "approved", reason: "พักผ่อน", approver: "นิตยา สมบูรณ์" },
  { id: 3, empId: 4, type: "ลาป่วย", startDate: "2025-06-15", endDate: "2025-06-15", days: 1, status: "pending_hr", reason: "ไม่สบาย", approver: "ธนพล วิเชียร" },
];

export const ATT_CORRECTIONS = [
  { id: 1, empId: 3, date: "2025-06-15", reason: "ลืมตอกบัตรตอนเช้า", requestedTime: "08:55", type: "clockIn", status: "pending_manager", approver: null }
];

export const INIT_LEAVE_BALANCE = EMPLOYEES.map(e => ({
  empId: e.id,
  balances: {
    "ลากิจ": { quota: 6, used: 0 },
    "ลาป่วย": { quota: 30, used: 0 },
    "ลาพักร้อน": { quota: 10, used: 0 },
    "ลาคลอด": { quota: 98, used: 0 },
  }
}));

LEAVES.filter(l => l.status === "approved").forEach(l => {
  const bal = INIT_LEAVE_BALANCE.find(b => b.empId === l.empId);
  if (bal && bal.balances[l.type]) bal.balances[l.type].used += l.days;
});

export const MOCK_SWAPS = [
  { id: 1, reqEmpId: 3, targetEmpId: 1, date: "2025-06-25", reason: "ติดธุระด่วนตอนเย็น", status: "pending" }
];

export const TAX_BRACKETS = [
  { min: 0, max: 150000, rate: 0 },
  { min: 150000, max: 300000, rate: 0.05 },
  { min: 300000, max: 500000, rate: 0.10 },
  { min: 500000, max: 750000, rate: 0.15 },
  { min: 750000, max: 1000000, rate: 0.20 },
  { min: 1000000, max: 2000000, rate: 0.25 },
  { min: 2000000, max: 5000000, rate: 0.30 },
  { min: 5000000, max: Infinity, rate: 0.35 }
];

export const INIT_PAYROLL = [];
