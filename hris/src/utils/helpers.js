import { DEPTS, POSITIONS, EMPLOYEES, INIT_SHIFTS, TAX_BRACKETS } from './mockData';

export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const getDeptName = id => DEPTS.find(d => d.id === id)?.name || "-";
export const getPosName = id => POSITIONS.find(p => p.id === id)?.name || "-";
export const getEmp = id => EMPLOYEES.find(e => e.id === id);
export const getEmpName = id => getEmp(id)?.name || "-";
export const getShift = id => INIT_SHIFTS.find(s => s.id === id);
export const fmt = n => n?.toLocaleString("th-TH") || "0";
export const fmtB = n => `฿${fmt(Math.round(n))}`;

export function generatePayslipHTML(payroll, emp, settings = null) {
  const shift = getShift(emp.shiftId);
  const companyName = settings?.companyName || "PS Company";
  const ssoRate = settings?.ssoRate ? parseFloat(settings.ssoRate) : 5;
  const ssoBaseCap = settings?.ssoBaseCap ? parseFloat(settings.ssoBaseCap) : 17500;
  const maxSso = Math.round(ssoBaseCap * (ssoRate / 100));
  const employerSso = payroll.employerSso || payroll.sso || maxSso;
  
  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>สลิปเงินเดือน ${emp.empCode} — ${payroll.period}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Sarabun','Arial',sans-serif;background:#f0f4f8;display:flex;justify-content:center;align-items:flex-start;min-height:100vh;padding:40px 20px;}
  .slip{background:#fff;width:600px;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.12);}
  .header{background:linear-gradient(135deg,#1A56DB,#7C3AED);color:#fff;padding:28px 32px;}
  .header h1{font-size:22px;font-weight:800;margin-bottom:4px;}
  .header p{font-size:13px;opacity:0.8;}
  .badge{display:inline-block;background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:99px;font-size:12px;margin-top:6px;}
  .emp-row{display:flex;align-items:center;gap:16px;padding:20px 32px;border-bottom:2px solid #E2E8F0;}
  .avatar{width:52px;height:52px;border-radius:50%;background:#EBF0FD;color:#1A56DB;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;flex-shrink:0;}
  .emp-info h2{font-size:17px;font-weight:700;color:#0F172A;}
  .emp-info p{font-size:13px;color:#64748B;margin-top:2px;}
  .emp-meta{margin-left:auto;text-align:right;font-size:12px;color:#64748B;}
  .emp-meta strong{color:#0F172A;display:block;font-size:13px;}
  .section{padding:20px 32px;}
  .section-title{font-size:11px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;}
  .row{display:flex;justify-content:space-between;padding:7px 0;font-size:14px;border-bottom:1px solid #F1F5F9;}
  .row:last-child{border-bottom:none;}
  .row .label{color:#334155;}
  .row .amount{font-weight:600;color:#0F172A;}
  .row .deduct{font-weight:600;color:#E02424;}
  .ot-row .amount{color:#0E9F6E;}
  .total-bar{background:#F8FAFC;border-top:2px solid #E2E8F0;padding:20px 32px;display:flex;justify-content:space-between;align-items:center;}
  .total-bar .label{font-size:16px;font-weight:700;color:#0F172A;}
  .total-bar .amount{font-size:26px;font-weight:800;color:#0E9F6E;}
  .footer{background:#F8FAFC;border-top:1px solid #E2E8F0;padding:14px 32px;text-align:center;font-size:12px;color:#94A3B8;}
  .shift-tag{display:inline-block;background:#EBF0FD;color:#1A56DB;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;margin-top:4px;}
  @media print{body{padding:0;background:#fff;}.slip{width:100%;box-shadow:none;border-radius:0;}}
</style>
</head>
<body>
<div class="slip">
  <div class="header">
    <h1>🏢 ${companyName}</h1>
    <p>Human Resource Information System</p>
    <span class="badge">สลิปเงินเดือน รอบ ${payroll.period}</span>
  </div>
  <div class="emp-row">
    <div class="avatar">${emp.name.split(" ").map(w => w[0]).slice(0, 2).join("")}</div>
    <div class="emp-info">
      <h2>${emp.name}</h2>
      <p>${getPosName(emp.posId)} · ${getDeptName(emp.deptId)}</p>
      <span class="shift-tag">⏰ ${shift?.name || "—"}</span>
    </div>
    <div class="emp-meta">
      <span>${emp.empCode}</span>
      <strong>วันที่จ่าย</strong>
      <span>${payroll.paidDate}</span>
    </div>
  </div>
  <div class="section">
    <div class="section-title">รายได้</div>
    <div class="row"><span class="label">เงินเดือนพื้นฐาน</span><span class="amount">${fmtB(payroll.baseSalary)}</span></div>
    ${payroll.otHours > 0 ? `<div class="row ot-row"><span class="label">ค่าโอที (${payroll.otHours} ชม. × อัตรา ${getShift(emp.shiftId)?.otRate || 1.5}x)</span><span class="amount">+${fmtB(payroll.otPay)}</span></div>` : ""}
    <div class="row" style="font-weight:700"><span class="label">รวมรายได้</span><span class="amount">${fmtB(payroll.gross)}</span></div>
  </div>
  <div class="section" style="padding-top:0">
    <div class="section-title">รายการหัก</div>
    <div class="row"><span class="label">ภาษีหัก ณ ที่จ่าย (คำนวณอัตราก้าวหน้า)</span><span class="deduct">-${fmtB(payroll.tax)}</span></div>
    <div class="row"><span class="label">ประกันสังคม (${ssoRate}% สูงสุด ฿${maxSso})</span><span class="deduct">-${fmtB(payroll.sso)}</span></div>
    ${payroll.providentFund > 0 ? `<div class="row"><span class="label">กองทุนสำรองเลี้ยงชีพ (5%)</span><span class="deduct">-${fmtB(payroll.providentFund)}</span></div>` : ""}
    ${payroll.loan > 0 ? `<div class="row"><span class="label">ชำระเงินกู้สวัสดิการ</span><span class="deduct">-${fmtB(payroll.loan)}</span></div>` : ""}
    ${payroll.other_deduct > 0 ? `<div class="row"><span class="label">หักอื่นๆ</span><span class="deduct">-${fmtB(payroll.other_deduct)}</span></div>` : ""}
    <div class="row" style="font-weight:700"><span class="label">รวมรายการหัก</span><span class="deduct">-${fmtB(payroll.tax + payroll.sso + (payroll.providentFund||0) + (payroll.loan||0) + payroll.other_deduct)}</span></div>
  </div>
  <div class="section" style="padding-top:0">
    <div class="section-title">ข้อมูลสะสมรายปี (YTD) & เงินสมทบ</div>
    <div class="row"><span class="label">เงินได้สะสมทั้งปี (โดยประมาณ)</span><span class="amount">${fmtB((payroll.baseSalary || 0) * 12 + (payroll.otPay || 0))}</span></div>
    <div class="row"><span class="label">ภาษีสะสม (โดยประมาณ)</span><span class="amount">${fmtB((payroll.tax || 0) * 12)}</span></div>
    <div class="row"><span class="label">เงินสมทบนายจ้าง (ประกันสังคม)</span><span class="amount">${fmtB(employerSso)}</span></div>
  </div>
  <div class="total-bar">
    <span class="label">💰 เงินสุทธิที่ได้รับ</span>
    <span class="amount">${fmtB(payroll.net)}</span>
  </div>
  <div class="footer">
    เอกสารนี้ออกโดยระบบ PS HRIS · ${new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
    · หากมีข้อสงสัยกรุณาติดต่อ HR
  </div>
</div>
<script>
  // Auto print on load if ?print=1
  if(new URLSearchParams(location.search).get("print")==="1"){ window.onload=()=>window.print(); }
</script>
</body></html>`;
}

export function downloadPayslip(payroll, emp, settings = null) {
  const html = generatePayslipHTML(payroll, emp, settings);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payslip_${emp.empCode}_${payroll.period}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function previewPayslip(payroll, emp, settings = null) {
  const html = generatePayslipHTML(payroll, emp, settings);
  const w = window.open("", "_blank", "width=680,height=820");
  w.document.write(html);
  w.document.close();
}

export const TH_HOLIDAYS_2025 = [
  "2025-01-01", "2025-02-12", "2025-04-06", "2025-04-13", "2025-04-14", "2025-04-15",
  "2025-05-01", "2025-05-04", "2025-05-12", "2025-06-03", "2025-07-10", "2025-07-28",
  "2025-08-12", "2025-10-13", "2025-10-23", "2025-12-05", "2025-12-10", "2025-12-31",
];

export function isPublicHoliday(dateStr) {
  return TH_HOLIDAYS_2025.includes(dateStr);
}

export function isWeekend(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function isHolidayOrWeekend(dateStr) {
  return isPublicHoliday(dateStr) || isWeekend(dateStr);
}

export function detectAttendanceStatus(clockIn, shiftStartTime, lateThresholdMins = 15) {
  if (!clockIn || !shiftStartTime) return "normal";
  const [cH, cM] = clockIn.split(":").map(Number);
  const [sH, sM] = shiftStartTime.split(":").map(Number);
  const clockInMins = cH * 60 + cM;
  const shiftStartMins = sH * 60 + sM;
  let diff = clockInMins - shiftStartMins;
  if (diff < -720) diff += 1440;
  if (diff < 0) return "early";
  if (diff > parseInt(lateThresholdMins)) return "late";
  return "normal";
}

export function countWorkingDays(startDate, endDate) {
  let count = 0;
  const d = new Date(startDate);
  const end = new Date(endDate);
  while (d <= end) {
    const ds = d.toISOString().slice(0, 10);
    if (!isWeekend(ds) && !isPublicHoliday(ds)) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}



export function calcOTPay(emp, hours, isHoliday, shifts, settings) {
  const shift = shifts.find(s => s.id === emp.shiftId);
  const dailyRate = emp.salary / 30;
  const hourlyRate = dailyRate / 8;
  const weekdayRate = settings?.otRate ? parseFloat(settings.otRate) : (shift?.otRate || 1.5);
  const holidayRate = shift?.otRateHoliday || 3;
  const rate = isHoliday ? holidayRate : weekdayRate;
  return Math.round(hourlyRate * rate * hours);
}


export const OT_WEEKLY_CAP = 36;
export function getWeeklyOTHours(empId, weekDate, otReqs) {
  const d = new Date(weekDate);
  const dayOfWeek = d.getDay();
  const weekStart = new Date(d); weekStart.setDate(d.getDate() - dayOfWeek);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
  const startStr = weekStart.toISOString().slice(0, 10);
  const endStr = weekEnd.toISOString().slice(0, 10);
  return otReqs
    .filter(o => o.empId === empId && o.status === "approved" && o.date >= startStr && o.date <= endStr)
    .reduce((sum, o) => sum + o.requestedHours, 0);
}

