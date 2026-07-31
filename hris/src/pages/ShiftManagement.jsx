import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SectionHeader, Card, Tbl, Badge, statusBadge, Btn, Tabs, Avatar, Modal, Inp, Sel } from '../components/common/UI';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { useToast } from '../components/common/Toast';
import api from '../utils/api';
import { C } from '../utils/theme';
import { getEmpName, getDeptName, getShift } from '../utils/helpers';

export const ShiftManagement = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [tab, setTab] = useState("shifts");
  const [shifts, setShifts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", startTime: "08:00", endTime: "17:00", breakMins: 60, days: ["Mon", "Tue", "Wed", "Thu", "Fri"], otRate: 1.5, otRateHoliday: 3.0, color: C.brand });
  
  const [localEmps, setLocalEmps] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapForm, setSwapForm] = useState({ targetEmpId: "", date: "", reason: "" });
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    // Fetch Shifts and Employees on mount
    api.get('/shifts').then(res => setShifts(res.data?.data || res.data || [])).catch(() => console.error("Error fetching shifts"));
    api.get('/employees').then(res => setLocalEmps(res.data?.data || res.data || [])).catch(() => console.error("Error fetching employees"));
  }, []);

  useEffect(() => {
    if (tab === "swap") {
      api.get("/shifts/swaps")
        .then(res => {
          if (Array.isArray(res.data)) setSwaps(res.data);
          else if (Array.isArray(res.data?.data)) setSwaps(res.data.data);
        })
        .catch(err => console.error("Error fetching swaps:", err));
    }
  }, [tab]);

  const DAY_OPTS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const DAY_TH = { Mon: "จ", Tue: "อ", Wed: "พ", Thu: "พฤ", Fri: "ศ", Sat: "ส", Sun: "อา" };

  const openNew = () => { setEditing(null); setForm({ name: "", startTime: "08:00", endTime: "17:00", breakMins: 60, days: ["Mon", "Tue", "Wed", "Thu", "Fri"], otRate: 1.5, otRateHoliday: 3.0, color: C.brand }); setShowModal(true); };
  const openEdit = s => { setEditing(s.id); setForm({ ...s }); setShowModal(true); };

  const save = async () => {
    if (!form.name) return;
    try {
      if (editing) {
        // Assume API supports PUT /shifts/:id
        const res = await api.put(`/shifts/${editing}`, form);
        setShifts(p => p.map(s => s.id === editing ? res.data : s));
        showToast("แก้ไขกะสำเร็จ", "success");
      } else {
        const res = await api.post('/shifts', form);
        setShifts(p => [...p, res.data]);
        showToast("เพิ่มกะใหม่สำเร็จ", "success");
      }
      setShowModal(false);
    } catch (error) {
      showToast("บันทึกข้อมูลกะไม่สำเร็จ", "error");
    }
  };

  const toggleDay = d => setForm(p => ({
    ...p, days: p.days.includes(d) ? p.days.filter(x => x !== d) : [...p.days, d]
  }));

  const calcWorkHours = s => {
    const [sh, sm] = s.startTime.split(":").map(Number);
    const [eh, em] = s.endTime.split(":").map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 1440; // overnight
    return ((mins - s.breakMins) / 60).toFixed(1);
  };

  const assignShift = async (empId, newShiftId) => {
    const sid = parseInt(newShiftId);
    const prev = [...localEmps];
    setLocalEmps(p => p.map(e => e.id === empId ? { ...e, shiftId: sid } : e));
    try {
      await api.patch(`/employees/${empId}`, { shiftId: sid });
      showToast("มอบหมายกะสำเร็จ", "success");
    } catch (error) {
      setLocalEmps(prev); // Rollback
      showToast("เปลี่ยนกะไม่สำเร็จ", "error");
    }
  };

  const submitSwap = async () => {
    try {
      const res = await api.post("/shifts/swaps", swapForm);
      setSwaps(p => [...p, res.data]);
      setShowSwapModal(false);
      showToast("ส่งคำร้องขอสลับกะสำเร็จ", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Error submitting swap", "error");
    }
  };

  const updateSwapStatus = async (id, status) => {
    const previous = [...swaps];
    setSwaps(p => p.map(x => x.id === id ? { ...x, status } : x));
    
    try {
      await api.put(`/shifts/swaps/${id}`, { status });
      showToast(`อัปเดตสถานะเป็น ${status} สำเร็จ`, "success");
    } catch (err) {
      setSwaps(previous); // Rollback
      showToast(err.response?.data?.message || "Error updating status", "error");
    }
  };

  const handleDeleteShift = async (id) => {
    try {
      await api.delete(`/shifts/${id}`);
      setShifts(p => p.filter(s => s.id !== id));
      showToast('ลบกะสำเร็จ', 'success');
      setConfirmDelete(null);
    } catch (err) {
      showToast(err.response?.data?.message || 'ลบไม่สำเร็จ', 'error');
      setConfirmDelete(null);
    }
  };

  return (
    <div>
      <SectionHeader title="จัดการกะการทำงาน" sub={`กะทั้งหมด ${shifts.length} กะ`}
        action={<Btn onClick={openNew}>+ เพิ่มกะใหม่</Btn>} />

      <Tabs tabs={[
        { id: "shifts", label: "รายชื่อกะ & กำหนดพนักงาน" },
        { id: "calendar", label: "ตารางปฏิทินเวียนกะ" },
        { id: "swap", label: "คำร้องขอสลับกะ" },
      ]} active={tab} onChange={setTab} />

      {tab === "shifts" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16, marginBottom: 28 }}>
            {shifts.map(s => {
              const wh = calcWorkHours(s);
              const empInShift = localEmps.filter(e => e.shiftId === s.id);
              return (
                <Card key={s.id} style={{ borderTop: `4px solid ${s.color}`, padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{s.name}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.startTime} – {s.endTime}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn size="sm" variant="ghost" onClick={() => openEdit(s)}>แก้ไข</Btn>
                      <Btn size="sm" variant="danger" onClick={() => setConfirmDelete(s.id)}>ลบ</Btn>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {DAY_OPTS.map(d => (
                      <span key={d} style={{
                        width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700,
                        background: s.days.includes(d) ? s.color + "22" : C.bg,
                        color: s.days.includes(d) ? s.color : C.textLight,
                        border: `1px solid ${s.days.includes(d) ? s.color + "44" : C.border}`,
                      }}>{DAY_TH[d]}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                    <span>⏱ {wh} ชม./วัน (พัก {s.breakMins} นาที)</span>
                    <span>💼 OT ×{s.otRate} (หยุด ×{s.otRateHoliday})</span>
                    <span style={{ gridColumn: "1/-1" }}>👥 {empInShift.length} คน: {empInShift.map(e => e.name.split(" ")[0]).join(", ") || "—"}</span>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card style={{ padding: 0 }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, fontWeight: 700 }}>มอบหมายกะให้พนักงาน</div>
            <Tbl columns={[
              {
                key: "name", label: "พนักงาน", render: r => (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Avatar name={r.name} size={30} />
                    <div><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: 11, color: C.textMuted }}>{getDeptName(r.deptId)}</div></div>
                  </div>
                )
              },
              {
                key: "shift", label: "กะปัจจุบัน", render: r => {
                  const s = shifts.find(x => x.id === r.shiftId);
                  return s ? <Badge label={s.name} bg={s.color + "18"} color={s.color} /> : "-";
                }
              },
              {
                key: "hours", label: "ชม./วัน", render: r => {
                  const s = shifts.find(x => x.id === r.shiftId);
                  return s ? `${calcWorkHours(s)} ชม.` : "-";
                }
              },
              {
                key: "assign", label: "เปลี่ยนกะ", render: r => (
                  <select value={r.shiftId || ""} onChange={e => assignShift(r.id, e.target.value)}
                    style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 8px", fontSize: 12 }}>
                    <option value="">--เลือกกะ--</option>
                    {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )
              },
            ]} data={localEmps} />
          </Card>
        </div>
      )}

      {tab === "calendar" && (
        <Card style={{ padding: 0, overflowX: "auto" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, fontWeight: 700 }}>ตารางปฏิทินเวียนกะล่วงหน้า (สัปดาห์นี้)</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bg }}>
                 <th style={{ padding: 12, borderBottom: `1px solid ${C.border}`, textAlign: "left", minWidth: 150 }}>พนักงาน</th>
                 {DAY_OPTS.map(d => <th key={d} style={{ padding: 12, borderBottom: `1px solid ${C.border}`, minWidth: 100 }}>{DAY_TH[d]}</th>)}
              </tr>
            </thead>
            <tbody>
               {localEmps.map(emp => {
                  const shift = shifts.find(s => s.id === emp.shiftId) || shifts[0];
                  if (!shift) return null;
                  return (
                     <tr key={emp.id}>
                       <td style={{ padding: 12, borderBottom: `1px solid ${C.borderLight}` }}>
                         <div style={{ fontWeight: 600 }}>{emp.name}</div>
                         <div style={{ fontSize: 11, color: C.textMuted }}>{getDeptName(emp.deptId)}</div>
                       </td>
                       {DAY_OPTS.map(d => (
                         <td key={d} style={{ padding: 12, borderBottom: `1px solid ${C.borderLight}`, textAlign: "center" }}>
                           {shift.days.includes(d) ? <Badge label={shift.name} bg={shift.color + "18"} color={shift.color} /> : <span style={{ color: C.border }}>หยุด</span>}
                         </td>
                       ))}
                     </tr>
                  );
               })}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "swap" && (
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700 }}>คำร้องขอสลับกะ (Shift Swap)</div>
            <Btn size="sm" onClick={() => setShowSwapModal(true)}>+ ขอสลับกะ</Btn>
          </div>
          <Tbl columns={[
             { key: "req", label: "ผู้ขอสลับ", render: r => getEmpName(r.reqEmpId) },
             { key: "target", label: "สลับกับ", render: r => <span style={{ fontWeight: 600 }}>{getEmpName(r.targetEmpId)}</span> },
             { key: "date", label: "วันที่สลับ", render: r => r.date },
             { key: "reason", label: "เหตุผล", render: r => r.reason },
             { key: "status", label: "สถานะ", render: r => statusBadge(r.status) },
             { key: "actions", label: "", render: r => r.status === "pending" ? (
                 <div style={{ display: "flex", gap: 6 }}>
                   <Btn size="sm" variant="success" onClick={() => updateSwapStatus(r.id, "approved")}>✓ อนุมัติ</Btn>
                   <Btn size="sm" variant="danger" onClick={() => updateSwapStatus(r.id, "rejected")}>✕</Btn>
                 </div>
             ) : "-" }
          ]} data={swaps} />
        </Card>
      )}

      {showModal && (
        <Modal title={editing ? "แก้ไขกะ" : "เพิ่มกะใหม่"} onClose={() => setShowModal(false)} width={560}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Inp label="ชื่อกะ" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} required style={{ gridColumn: "1/-1" }} />
            <Inp label="เวลาเริ่ม" value={form.startTime} onChange={v => setForm(p => ({ ...p, startTime: v }))} type="time" />
            <Inp label="เวลาสิ้นสุด" value={form.endTime} onChange={v => setForm(p => ({ ...p, endTime: v }))} type="time" />
            <Inp label="พักกลางวัน (นาที)" value={form.breakMins} onChange={v => setForm(p => ({ ...p, breakMins: parseInt(v) || 0 }))} type="number" />
            <Inp label="อัตราโอที (weekday)" value={form.otRate} onChange={v => setForm(p => ({ ...p, otRate: parseFloat(v) || 1.5 }))} type="number" />
            <Inp label="อัตราโอที (วันหยุด)" value={form.otRateHoliday} onChange={v => setForm(p => ({ ...p, otRateHoliday: parseFloat(v) || 3 }))} type="number" />
            <div style={{ gridColumn: "1/-1" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 8 }}>วันทำงาน</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                  <button key={d} onClick={() => toggleDay(d)}
                    style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid ${form.days.includes(d) ? C.brand : C.border}`, background: form.days.includes(d) ? C.brand : "#fff", color: form.days.includes(d) ? "#fff" : C.textMuted, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                    {{ "Mon": "จ", "Tue": "อ", "Wed": "พ", "Thu": "พฤ", "Fri": "ศ", "Sat": "ส", "Sun": "อา" }[d]}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 8 }}>สีกะ</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[C.brand, C.purple, C.teal, C.orange, C.success, C.danger].map(col => (
                  <button key={col} onClick={() => setForm(p => ({ ...p, color: col }))}
                    style={{ width: 28, height: 28, borderRadius: "50%", background: col, border: form.color === col ? "3px solid #0F172A" : "3px solid transparent", cursor: "pointer" }} />
                ))}
              </div>
              </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>ยกเลิก</Btn>
            <Btn onClick={save}>บันทึก</Btn>
          </div>
        </Modal>
      )}

      {showSwapModal && (
        <Modal title="ยื่นคำร้องขอสลับกะ" onClose={() => setShowSwapModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sel label="พนักงานที่ต้องการสลับด้วย" value={swapForm.targetEmpId} onChange={v => setSwapForm(p => ({ ...p, targetEmpId: v }))}
              options={localEmps.filter(e => e.id !== user?.empId).map(e => ({ value: e.id, label: e.name }))} />
            <Inp label="วันที่ต้องการสลับกะ" value={swapForm.date} onChange={v => setSwapForm(p => ({ ...p, date: v }))} type="date" />
            <Inp label="เหตุผล" value={swapForm.reason} onChange={v => setSwapForm(p => ({ ...p, reason: v }))} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
              <Btn variant="ghost" onClick={() => setShowSwapModal(false)}>ยกเลิก</Btn>
              <Btn onClick={submitSwap}>ส่งคำร้อง</Btn>
            </div>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="ยืนยันการลบกะ"
          message="คุณแน่ใจหรือไม่ว่าต้องการลบกะการทำงานนี้? หากมีพนักงานที่ใช้กะนี้อยู่จะไม่สามารถลบได้"
          onConfirm={() => handleDeleteShift(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
};