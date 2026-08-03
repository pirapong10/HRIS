import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { usePermission } from '../../hooks/usePermission';
import { Card, Tbl, Avatar, Badge, statusBadge, Btn, Inp, Sel, Modal, StatCard } from '../common/UI';
import { C } from '../../utils/theme';
import { fmtB, getEmp, getEmpName, getShift, isHolidayOrWeekend, calcOTPay, getWeeklyOTHours, OT_WEEKLY_CAP } from '../../utils/helpers';
const INIT_SHIFTS = [];
const INIT_OT = [];
const EMPLOYEES = [];

export const OTRequests = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { canApproveAtt } = usePermission();
  const isHR = canApproveAtt;
  const [otReqs, setOtReqs] = useState(INIT_OT);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ empId: user.empId || 3, date: "", shiftId: 1, reason: "", requestedHours: 1, isHoliday: false });
  const [otCapWarning, setOtCapWarning] = useState(null);

  const approve = (id, status) => {
    if (status === "approved") {
      const req = otReqs.find(o => o.id === id);
      if (req) {
        const currentWeeklyOT = getWeeklyOTHours(req.empId, req.date, otReqs);
        if (currentWeeklyOT + req.requestedHours > OT_WEEKLY_CAP) {
          setOtCapWarning(`⚠️ ไม่สามารถอนุมัติ: OT สัปดาห์นี้ของ ${getEmpName(req.empId)} จะเกิน ${OT_WEEKLY_CAP} ชม. (ปัจจุบัน ${currentWeeklyOT} + ขอ ${req.requestedHours} = ${currentWeeklyOT + req.requestedHours} ชม.) ตาม พ.ร.บ.คุ้มครองแรงงาน มาตรา 24`);
          return;
        }
      }
    }
    setOtCapWarning(null);
    setOtReqs(p => p.map(o => o.id === id ? { ...o, status, approver: user.name } : o));
  };

  const submit = () => {
    const today = new Date().toISOString().split("T")[0];
    if (form.date < today) {
      alert("❌ ไม่อนุญาตให้เบิกโอทีย้อนหลัง ระบบบังคับให้ต้องส่งคำขออนุมัติล่วงหน้า (Pre-approval) ก่อนเริ่มปฏิบัติงานจริงเท่านั้น");
      return;
    }
    const empId = parseInt(form.empId);
    const hours = parseFloat(form.requestedHours);
    const autoIsHoliday = form.date ? isHolidayOrWeekend(form.date) : form.isHoliday;
    setOtReqs(p => [...p, { ...form, id: Date.now(), status: "pending_manager", approver: null, empId, shiftId: parseInt(form.shiftId), requestedHours: hours, isHoliday: autoIsHoliday }]);
    setShowModal(false);
  };

  const viewData = isHR ? otReqs : otReqs.filter(o => o.empId === (user.empId || 3));

  const calcPreview = (ot) => {
    const emp = getEmp(parseInt(ot.empId));
    if (!emp) return 0;
    return calcOTPay(emp, parseFloat(ot.requestedHours || 0), ot.isHoliday, INIT_SHIFTS, settings);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, color: C.text }}>คำขอโอที</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>คำนวณอัตราโอทีตามกะและวันหยุด · OT สูงสุด {OT_WEEKLY_CAP} ชม./สัปดาห์ (กม.แรงงาน)</div>
        </div>
        <Btn onClick={() => setShowModal(true)}>+ ขอทำโอที</Btn>
      </div>

      {otCapWarning && (
        <div style={{ background: C.dangerLight, color: C.danger, borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{otCapWarning}</span>
          <button onClick={() => setOtCapWarning(null)} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontWeight: 700 }}>✕</button>
        </div>
      )}

      {isHR && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
          <StatCard label="รอหัวหน้าอนุมัติ" value={otReqs.filter(o => o.status === "pending_manager").length} color={C.warning} icon="⏳" />
          <StatCard label="รอ HR อนุมัติ" value={otReqs.filter(o => o.status === "pending_hr").length} color={C.brand} icon="👀" />
          <StatCard label="อนุมัติแล้ว" value={otReqs.filter(o => o.status === "approved").length} color={C.success} icon="✅" />
        </div>
      )}

      <Card style={{ padding: 0 }}>
        <Tbl columns={[
          ...(isHR ? [{
            key: "emp", label: "พนักงาน", render: r => (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Avatar name={getEmpName(r.empId)} size={28} />
                {getEmpName(r.empId)}
              </div>
            )
          }] : []),
          { key: "date", label: "วันที่" },
          { key: "shift", label: "กะ", render: r => { const s = getShift(r.shiftId); return s ? <Badge label={s.name} bg={s.color + "18"} color={s.color} /> : "-"; } },
          { key: "hours", label: "ชม.ที่ขอ", render: r => `${r.requestedHours} ชม.` },
          {
            key: "pay", label: "ค่าโอที (ประมาณ)", render: r => {
              const emp = getEmp(r.empId);
              if (!emp) return "-";
              const pay = calcOTPay(emp, r.requestedHours, r.isHoliday, INIT_SHIFTS, settings);
              return <span style={{ fontWeight: 700, color: C.success }}>{fmtB(pay)}</span>;
            }
          },
          { key: "reason", label: "เหตุผล" },
          { key: "status", label: "สถานะ", render: r => statusBadge(r.status) },
          ...(isHR ? [{
            key: "actions", label: "", render: r => {
              if (r.status === "pending_manager") return (
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn size="sm" onClick={() => approve(r.id, "pending_hr")}>Manager อนุมัติ</Btn>
                  <Btn size="sm" variant="danger" onClick={() => approve(r.id, "rejected")}>✕</Btn>
                </div>
              );
              if (r.status === "pending_hr") return (
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn size="sm" variant="success" onClick={() => approve(r.id, "approved")}>HR อนุมัติ</Btn>
                  <Btn size="sm" variant="danger" onClick={() => approve(r.id, "rejected")}>✕</Btn>
                </div>
              );
              return <span style={{ fontSize: 12, color: C.textMuted }}>{r.approver || "—"}</span>;
            }
          }] : []),
        ]} data={viewData} />
      </Card>

      <Card style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 14, color: C.text }}>🧮 คำนวณอัตราโอที</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
          {EMPLOYEES.map(emp => {
            const shift = getShift(emp.shiftId);
            const dailyRate = emp.salary / 30;
            const hourlyRate = dailyRate / 8;
            const weekdayRate = settings?.otRate ? parseFloat(settings.otRate) : (shift?.otRate || 1.5);
            const otPay1 = Math.round(hourlyRate * weekdayRate);
            const otPayH = Math.round(hourlyRate * (shift?.otRateHoliday || 3));
            return (
              <div key={emp.id} style={{ background: C.bg, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{emp.name.split(" ")[0]}</div>
                {shift && <Badge label={shift.name} bg={shift.color + "18"} color={shift.color} />}
                <div style={{ marginTop: 8, fontSize: 12, color: C.textMuted, lineHeight: 1.8 }}>
                  <div>ค่าแรง/ชม: <strong style={{ color: C.text }}>{fmtB(hourlyRate)}</strong></div>
                  <div>โอที ×{weekdayRate}: <strong style={{ color: C.success }}>{fmtB(otPay1)}/ชม.</strong></div>
                  <div>วันหยุด ×{shift?.otRateHoliday || 3}: <strong style={{ color: C.orange }}>{fmtB(otPayH)}/ชม.</strong></div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {showModal && (
        <Modal title="ยื่นคำขอโอที" onClose={() => setShowModal(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {isHR && <Sel label="พนักงาน" value={form.empId} onChange={v => setForm(p => ({ ...p, empId: v }))}
              options={EMPLOYEES.map(e => ({ value: e.id, label: e.name }))} style={{ gridColumn: "1/-1" }} />}
            <Inp label="วันที่" value={form.date} onChange={v => {
              const autoHoliday = v ? isHolidayOrWeekend(v) : false;
              setForm(p => ({ ...p, date: v, isHoliday: autoHoliday }));
            }} type="date" />
            <Sel label="กะ" value={form.shiftId} onChange={v => setForm(p => ({ ...p, shiftId: parseInt(v) }))}
              options={INIT_SHIFTS.map(s => ({ value: s.id, label: s.name }))} />
            <Inp label="จำนวนชั่วโมง" value={form.requestedHours} onChange={v => setForm(p => ({ ...p, requestedHours: v }))} type="number" />
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 20 }}>
              <input type="checkbox" checked={form.isHoliday} onChange={e => setForm(p => ({ ...p, isHoliday: e.target.checked }))} />
              <label style={{ fontSize: 13 }}>วันหยุด (อัตรา ×3) {form.date && isHolidayOrWeekend(form.date) ? <span style={{ color: C.success, fontWeight: 600 }}>✓ ตรวจพบอัตโนมัติ</span> : ""}</label>
            </div>
            <Inp label="เหตุผล" value={form.reason} onChange={v => setForm(p => ({ ...p, reason: v }))} style={{ gridColumn: "1/-1" }} />
            <div style={{ gridColumn: "1/-1", background: C.successLight, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.success, fontWeight: 600 }}>
              💰 ค่าโอที ประมาณ: {fmtB(calcPreview(form))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>ยกเลิก</Btn>
            <Btn onClick={submit}>ยื่นคำขอ</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
