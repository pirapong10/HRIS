import React, { useState, useEffect, useRef, Component } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEmployees } from '../hooks/useEmployees';
import { usePermission } from '../hooks/usePermission';
import { SectionHeader, Card, Tabs, Tbl, Avatar, Badge, statusBadge, Btn, Inp, Sel, Modal } from '../components/common/UI';
import { C } from '../utils/theme';
import api from '../utils/api';
import { fmtB, getDeptName, getPosName } from '../utils/helpers';
import { EmployeeProfile } from '../components/employee/EmployeeProfile';
import { EmployeeDocs } from '../components/employee/EmployeeDocs';
import { EmployeeHistory } from '../components/employee/EmployeeHistory';
import { EmployeeOnboarding } from '../components/employee/EmployeeOnboarding';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { useToast } from '../components/common/Toast';

class EmployeeErrorBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', color: '#E02424' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>เกิดข้อผิดพลาดในหน้าพนักงาน</div>
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>{this.state.error?.message}</div>
          <button onClick={() => this.setState({ hasError: false, error: null })} style={{ padding: '8px 20px', background: '#1A56DB', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>ลองใหม่</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const EmployeeInner = () => {
  const { user } = useAuth();
  const [selected, setSelected] = useState(null);
  const [detailTab, setDetailTab] = useState("profile");
  const [showAdd, setShowAdd] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const { showToast } = useToast();
  const [modalTab, setModalTab] = useState("basic");
  const [confirmState, setConfirmState] = useState(null);
  const [depts, setDepts] = useState([]);
  const [positions, setPositions] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [employeeTypes, setEmployeeTypes] = useState([]);
  const { 
    emps, setEmps, loading, viewEmployeeDetails, page, setPage, limit, setLimit, total, search, setSearch,
    filterDept, setFilterDept, filterType, setFilterType, filterStatus, setFilterStatus
  } = useEmployees();

  const handleViewDetails = async (emp) => {
    const details = await viewEmployeeDetails(emp.id);
    if (details) {
      setSelected({ ...emp, ...details });
    } else {
      setSelected(emp);
    }
    setDetailTab("profile");
  };

  useEffect(() => {
    Promise.all([
      api.get("/departments?flat=true"),
      api.get("/positions"),
      api.get("/shifts"),
      api.get("/employee-types")
    ])
      .then(([dRes, pRes, sRes, tRes]) => {
        const d = dRes.data?.data || dRes.data;
        const p = pRes.data?.data || pRes.data;
        const s = sRes.data?.data || sRes.data;
        if (Array.isArray(d)) setDepts(d.filter(x => x.status !== 'inactive'));
        if (Array.isArray(p)) setPositions(p.filter(x => x.status !== 'inactive'));
        if (Array.isArray(s)) setShifts(s);
        if (Array.isArray(tRes.data)) setEmployeeTypes(tRes.data);
      })
      .catch(err => console.error("Error fetching dependencies:", err));
  }, []);

  const localGetDeptName = id => depts.find(d => d.id === id)?.name || getDeptName(id);
  const localGetPosName = id => positions.find(p => p.id === id)?.name || getPosName(id);
  const fileInputRef = useRef(null);
  const defaultEmp = {
    name: "", deptId: 1, posId: 1, type: "fulltime", employeeTypeId: "",
    hireDate: "", salary: "", phone: "", email: "",
    shiftId: 1, emName: "", emPhone: "", emRel: "",
    dob: "", gender: "", nationalId: "", address: "",
    bank: "", bankAcc: "", ssoNumber: "", taxId: "",
    taxMethod: "progressive", workCountry: "TH", taxCountry: "TH",
    status: "active"
  };
  const [newEmp, setNewEmp] = useState(defaultEmp);
  const { canEditEmp } = usePermission();
  const isHR = canEditEmp;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !selected) return;
    const newDoc = {
      id: Date.now(),
      empId: selected.id,
      name: file.name,
      type: file.name.split(".").pop().toUpperCase() || "FILE",
      size: (file.size / 1024).toFixed(1) + " KB",
      date: new Date().toISOString().split("T")[0]
    };
    setSelected(p => ({ ...p, docs: [...(p.docs || []), newDoc] }));
    showToast("อัปโหลดเอกสารสำเร็จ", "success");
    e.target.value = ""; // Reset input
  };

  const deleteDoc = (docId) => {
    setSelected(p => ({ ...p, docs: p.docs.filter(d => d.id !== docId) }));
  };

  const toggleTask = (taskId, isCompleted) => {
    setSelected(p => ({
      ...p,
      onboarding: p.onboarding.map(t => t.id === taskId ? { ...t, isCompleted } : t)
    }));
  };

  const viewData = emps;
  const filtered = viewData; // Search is handled by backend

  const activeFilters = [
    filterDept && { key: 'dept', label: `แผนก: ${depts.find(d => d.id == filterDept)?.name || filterDept}`, clear: () => { setFilterDept(''); setPage(1); } },
    filterType && { key: 'type', label: `ประเภท: ${filterType === 'fulltime' ? 'ประจำ' : filterType === 'parttime' ? 'พาร์ทไทม์' : filterType === 'contract' ? 'สัญญาจ้าง' : filterType}`, clear: () => { setFilterType(''); setPage(1); } },
    filterStatus !== 'active' && filterStatus && { key: 'status', label: `สถานะ: ${filterStatus === 'inactive' ? 'พ้นสภาพ' : filterStatus}`, clear: () => { setFilterStatus('active'); setPage(1); } },
    search && { key: 'search', label: `ค้นหา: "${search}"`, clear: () => { setSearch(''); setPage(1); } },
  ].filter(Boolean);

  const resultLabel = loading
    ? 'กำลังโหลด...'
    : activeFilters.length > 0
      ? `พบ ${total} คน (จากตัวกรอง)`
      : `พนักงานทั้งหมด ${total} คน`;

  const saveEmp = async () => {
    const payload = {
      ...newEmp,
      deptId: newEmp.deptId ? parseInt(newEmp.deptId) : null,
      posId: newEmp.posId ? parseInt(newEmp.posId) : null,
      shiftId: newEmp.shiftId ? parseInt(newEmp.shiftId) : null,
      employeeTypeId: newEmp.employeeTypeId ? parseInt(newEmp.employeeTypeId) : null,
      salary: newEmp.salary ? parseFloat(newEmp.salary) : 0,
    };
    try {
      if (editingEmp) {
        const res = await api.put(`/employees/${editingEmp}`, payload);
        const updated = res.data;
        setEmps(p => p.map(e => e.id === editingEmp ? updated : e));
        showToast("แก้ไขข้อมูลพนักงานสำเร็จ", "success");
      } else {
        payload.status = "active";
        const res = await api.post("/employees", payload);
        const created = res.data;
        setEmps(p => [...p, created]);
        showToast("เพิ่มพนักงานใหม่สำเร็จ", "success");
      }
      setShowAdd(false);
    } catch (err) {
      showToast(`บันทึกไม่สำเร็จ: ${err.response?.data?.message || err.message}`, "error");
    }
  };

  const openNew = () => {
    setEditingEmp(null);
    setNewEmp(defaultEmp);
    setModalTab("basic");
    setShowAdd(true);
  };

  const openEdit = (emp) => {
    setEditingEmp(emp.id);
    setNewEmp({ ...defaultEmp, ...emp });
    setModalTab("basic");
    setShowAdd(true);
  };

  const deleteEmp = (id, name) => {
    setConfirmState({ empId: id, empName: name });
  };

  const handleConfirmDelete = async () => {
    if (!confirmState) return;
    try {
      await api.delete(`/employees/${confirmState.empId}`);
      setEmps(p => p.map(e => e.id === confirmState.empId ? { ...e, status: "inactive" } : e));
      showToast("ปิดการใช้งานพนักงานสำเร็จ", "success");
    } catch (err) {
      showToast(`เกิดข้อผิดพลาด: ${err.response?.data?.message || err.message}`, "error");
    }
  };

  if (selected) return (
    <div>
      <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.brand, fontSize: 13, marginBottom: 16, padding: 0 }}>← กลับรายการ</button>
      <Card>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
          <Avatar name={selected.name} size={64} />
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>{selected.name}</h3>
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>{localGetPosName(selected.posId)} · {localGetDeptName(selected.deptId)}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {statusBadge(selected.status)} 
              {selected.employeeType ? <Badge label={selected.employeeType.name} bg={selected.employeeType.color + '18'} color={selected.employeeType.color} /> : statusBadge(selected.type)}
              {(() => { const s = shifts.find(x => x.id === selected.shiftId); return s ? <Badge label={s.name} bg={(s.color || '#3B82F6') + '18'} color={s.color || '#3B82F6'} /> : null; })()}
            </div>
          </div>
        </div>

        <Tabs tabs={[
          { id: "profile", label: "ข้อมูลทั่วไป" },
          { id: "docs", label: "เอกสาร (Docs)" },
          { id: "history", label: "ประวัติการทำงาน" },
          { id: "onboarding", label: "Onboarding" },
        ]} active={detailTab} onChange={setDetailTab} />

        {detailTab === "profile" && <EmployeeProfile selected={selected} isHR={isHR} />}
        {detailTab === "docs" && <EmployeeDocs selected={selected} deleteDoc={deleteDoc} handleFileUpload={handleFileUpload} />}
        {detailTab === "history" && <EmployeeHistory selected={selected} depts={depts} positions={positions} />}
        {detailTab === "onboarding" && <EmployeeOnboarding selected={selected} toggleTask={toggleTask} />}
      </Card>
    </div>
  );

  return (
    <div>
      <SectionHeader title="ข้อมูลพนักงาน"
        sub={resultLabel}
        action={isHR && <Btn onClick={openNew}>+ เพิ่มพนักงาน</Btn>} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 16, pointerEvents: 'none', color: C.textMuted
          }}>🔍</span>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="ค้นหาชื่อ รหัส หรืออีเมล..."
            style={{
              width: '100%', boxSizing: 'border-box',
              paddingLeft: 36, paddingRight: search ? 36 : 14,
              paddingTop: 8, paddingBottom: 8,
              border: `1px solid ${C.border}`, borderRadius: 8,
              fontSize: 14, outline: 'none',
              background: C.surface, color: C.text, height: 38
            }}
            onFocus={e => { e.target.style.borderColor = C.brand; e.target.style.boxShadow = `0 0 0 3px ${C.brand}18`; }}
            onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
            onKeyDown={e => { if (e.key === 'Escape') { setSearch(''); setPage(1); } }}
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1); }}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: C.textMuted, fontSize: 16, lineHeight: 1, padding: 2
              }}
            >✕</button>
          )}
        </div>
        <Sel value={filterDept} onChange={v => { setFilterDept(v); setPage(1); }}
          options={[{ value: '', label: 'ทุกแผนก' }, ...depts.map(d => ({ value: d.id, label: d.name }))]}
          style={{ width: 160 }}
        />
        <Sel value={filterType} onChange={v => { setFilterType(v); setPage(1); }}
          options={[
            { value: '', label: 'ทุกประเภท' },
            { value: 'fulltime', label: 'พนักงานประจำ' },
            { value: 'parttime', label: 'พาร์ทไทม์' },
            { value: 'contract', label: 'สัญญาจ้าง' },
          ]}
          style={{ width: 140 }}
        />
        <Sel value={filterStatus} onChange={v => { setFilterStatus(v); setPage(1); }}
          options={[
            { value: '', label: 'ทุกสถานะ' },
            { value: 'active', label: 'ทำงานอยู่' },
            { value: 'inactive', label: 'พ้นสภาพ' },
          ]}
          style={{ width: 130 }}
        />
        <select 
          value={limit} 
          onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
          style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", background: C.surface, color: C.text, height: 38 }}
        >
          <option value={10}>แสดง 10 รายการ</option>
          <option value={20}>แสดง 20 รายการ</option>
          <option value={50}>แสดง 50 รายการ</option>
          <option value={100}>แสดง 100 รายการ</option>
        </select>
      </div>

      {activeFilters.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: C.textMuted }}>กรองอยู่:</span>
          {activeFilters.map(f => (
            <span key={f.key} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: C.brand + '15', color: C.brand,
              border: `1px solid ${C.brand + '40'}`,
              borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 500
            }}>
              {f.label}
              <button onClick={f.clear} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: C.brand, fontSize: 14, padding: 0, lineHeight: 1
              }}>✕</button>
            </span>
          ))}
          {activeFilters.length > 1 && (
            <button
              onClick={() => { setFilterDept(''); setFilterType(''); setFilterStatus('active'); setSearch(''); setPage(1); }}
              style={{ fontSize: 12, color: C.textMuted, background: 'none', border: 'none',
                cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            >ล้างทั้งหมด</button>
          )}
        </div>
      )}

      <style>{`@keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:1} }`}</style>
      <Card style={{ padding: 0, position: 'relative', opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s' }}>
        {loading && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: C.brand, borderRadius: '12px 12px 0 0',
            animation: 'shimmer 1s infinite', zIndex: 1
          }} />
        )}
        <Tbl columns={[
          { key: "empCode", label: "รหัส", render: r => <span style={{ fontFamily: "monospace", fontWeight: 600, color: C.brand }}>{r.empCode}</span> },
          {
            key: "name", label: "ชื่อ", render: r => (
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Avatar name={r.name} size={30} />
                <div><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: 12, color: C.textMuted }}>{r.email}</div></div>
              </div>
            )
          },
          { key: "dept", label: "แผนก", render: r => localGetDeptName(r.deptId) },
          { key: "pos", label: "ตำแหน่ง", render: r => localGetPosName(r.posId) },
          { key: "type", label: "ประเภท", render: r => r.employeeType ? <Badge label={r.employeeType.name} bg={r.employeeType.color + '18'} color={r.employeeType.color} /> : statusBadge(r.type) },
          { key: "status", label: "สถานะ", render: r => statusBadge(r.status) },
          { key: "actions", label: "", render: r => (
            <div style={{ display: "flex", gap: 6 }}>
              <Btn variant="ghost" size="sm" onClick={() => handleViewDetails(r)}>ดูข้อมูล</Btn>
              {isHR && <Btn variant="secondary" size="sm" onClick={() => openEdit(r)}>แก้ไข</Btn>}
              {isHR && r.status !== "inactive" && <Btn variant="danger" size="sm" onClick={() => deleteEmp(r.id, r.name)}>ลบ</Btn>}
            </div>
          )},
        ]} data={filtered} />
        {/* Pagination Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 13, color: C.textMuted }}>แสดง {(page - 1) * limit + 1} ถึง {Math.min(page * limit, total)} จาก {total} รายการ</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>ก่อนหน้า</Btn>
            <Btn variant="ghost" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * limit >= total}>ถัดไป</Btn>
          </div>
        </div>
      </Card>
      
      {showAdd && (
        <Modal title={editingEmp ? "แก้ไขข้อมูลพนักงาน" : "เพิ่มพนักงานใหม่"} onClose={() => setShowAdd(false)} width={600}>
          {/* Modal Tabs */}
          <div style={{ display: 'flex', gap: 6, borderBottom: `1px solid ${C.border}`, paddingBottom: 10, marginBottom: 16 }}>
            {[
              { id: "basic", label: "ข้อมูลพื้นฐาน" },
              { id: "contact", label: "ข้อมูลติดต่อ" },
              isHR && { id: "finance", label: "การเงิน" },
              { id: "country", label: "ข้อมูลประเทศ" }
            ].filter(Boolean).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setModalTab(tab.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                  background: modalTab === tab.id ? C.brandLight : "transparent",
                  color: modalTab === tab.id ? C.brand : C.textMuted
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          {modalTab === "basic" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Inp label="ชื่อ-นามสกุล" value={newEmp.name} onChange={v => setNewEmp(p => ({ ...p, name: v }))} required style={{ gridColumn: "1/-1" }} />
              <Sel label="แผนก" value={newEmp.deptId} onChange={v => setNewEmp(p => ({ ...p, deptId: v }))} options={depts.map(d => ({ value: d.id, label: d.name }))} />
              <Sel label="ตำแหน่ง" value={newEmp.posId} onChange={v => setNewEmp(p => ({ ...p, posId: v }))} options={positions.map(p => ({ value: p.id, label: p.name }))} />
              <Sel label="กะการทำงาน" value={newEmp.shiftId} onChange={v => setNewEmp(p => ({ ...p, shiftId: v }))} options={shifts.map(s => ({ value: s.id, label: s.name }))} />
              <Sel label="ประเภทพนักงาน" value={newEmp.employeeTypeId || ""} onChange={v => setNewEmp(p => ({ ...p, employeeTypeId: v }))} options={[{ value: "", label: "เลือกประเภทพนักงาน" }, ...employeeTypes.map(t => ({ value: t.id, label: t.name }))]} />
              <Inp label="วันที่เริ่มงาน" value={newEmp.hireDate} onChange={v => setNewEmp(p => ({ ...p, hireDate: v }))} type="date" />
              <Inp label="วันเกิด" value={newEmp.dob || ""} onChange={v => setNewEmp(p => ({ ...p, dob: v }))} type="date" />
              <Sel label="เพศ" value={newEmp.gender || ""} onChange={v => setNewEmp(p => ({ ...p, gender: v }))} options={[{ value: "", label: "ไม่ระบุ" }, { value: "male", label: "ชาย" }, { value: "female", label: "หญิง" }]} />
              <Sel label="สถานะพนักงาน" value={newEmp.status || "active"} onChange={v => setNewEmp(p => ({ ...p, status: v }))} options={[{ value: "active", label: "ทำงานอยู่ (Active)" }, { value: "inactive", label: "พ้นสภาพ (Inactive)" }]} />
            </div>
          )}

          {modalTab === "contact" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Inp label="โทรศัพท์" value={newEmp.phone} onChange={v => setNewEmp(p => ({ ...p, phone: v }))} />
              <Inp label="อีเมล" value={newEmp.email} onChange={v => setNewEmp(p => ({ ...p, email: v }))} type="email" />
              <Inp label="เลขบัตรประชาชน / Passport" value={newEmp.nationalId || ""} onChange={v => setNewEmp(p => ({ ...p, nationalId: v }))} style={{ gridColumn: "1/-1" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 5, gridColumn: "1/-1" }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted }}>ที่อยู่</label>
                <textarea value={newEmp.address || ""} onChange={e => setNewEmp(p => ({ ...p, address: e.target.value }))}
                  style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", background: C.surface, color: C.text, minHeight: 60, fontFamily: "inherit" }} />
              </div>
              <div style={{ gridColumn: "1/-1", fontWeight: 700, fontSize: 13, marginTop: 10, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>ผู้ติดต่อฉุกเฉิน</div>
              <Inp label="ชื่อผู้ติดต่อฉุกเฉิน" value={newEmp.emName} onChange={v => setNewEmp(p => ({ ...p, emName: v }))} style={{ gridColumn: "1/-1" }} />
              <Inp label="ความสัมพันธ์" value={newEmp.emRel} onChange={v => setNewEmp(p => ({ ...p, emRel: v }))} />
              <Inp label="เบอร์โทรศัพท์" value={newEmp.emPhone} onChange={v => setNewEmp(p => ({ ...p, emPhone: v }))} />
            </div>
          )}

          {modalTab === "finance" && isHR && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Inp label="เงินเดือน (บาท)" value={newEmp.salary} onChange={v => setNewEmp(p => ({ ...p, salary: v }))} type="number" />
              <Sel label="ธนาคาร" value={newEmp.bank || ""} onChange={v => setNewEmp(p => ({ ...p, bank: v }))} options={[
                { value: "", label: "เลือกธนาคาร" },
                { value: "กสิกรไทย", label: "ธนาคารกสิกรไทย" },
                { value: "กรุงเทพ", label: "ธนาคารกรุงเทพ" },
                { value: "ไทยพาณิชย์", label: "ธนาคารไทยพาณิชย์" },
                { value: "กรุงไทย", label: "ธนาคารกรุงไทย" },
                { value: "ทหารไทยธนชาต", label: "ธนาคารทหารไทยธนชาต" },
                { value: "อื่นๆ", label: "อื่นๆ" }
              ]} />
              <Inp label="เลขบัญชีธนาคาร" value={newEmp.bankAcc || ""} onChange={v => setNewEmp(p => ({ ...p, bankAcc: v }))} />
              <Sel label="วิธีคำนวณภาษี" value={newEmp.taxMethod || "progressive"} onChange={v => setNewEmp(p => ({ ...p, taxMethod: v }))} options={[
                { value: "progressive", label: "แบบขั้นบันได (Progressive)" },
                { value: "flat", label: "อัตราคงที่ (Flat Rate)" }
              ]} />
              <Inp label="เลขผู้ประกันตน SSO" value={newEmp.ssoNumber || ""} onChange={v => setNewEmp(p => ({ ...p, ssoNumber: v }))} />
              <Inp label="เลขประจำตัวผู้เสียภาษี" value={newEmp.taxId || ""} onChange={v => setNewEmp(p => ({ ...p, taxId: v }))} />
            </div>
          )}

          {modalTab === "country" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Sel label="ประเทศที่ปฏิบัติงาน" value={newEmp.workCountry || "TH"} onChange={v => setNewEmp(p => ({ ...p, workCountry: v }))} options={[
                { value: "TH", label: "Thailand (TH)" },
                { value: "JP", label: "Japan (JP)" },
                { value: "US", label: "United States (US)" },
                { value: "SG", label: "Singapore (SG)" }
              ]} />
              <Sel label="ประเทศที่เสียภาษี" value={newEmp.taxCountry || "TH"} onChange={v => setNewEmp(p => ({ ...p, taxCountry: v }))} options={[
                { value: "TH", label: "Thailand (TH)" },
                { value: "JP", label: "Japan (JP)" },
                { value: "US", label: "United States (US)" },
                { value: "SG", label: "Singapore (SG)" }
              ]} />
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>ยกเลิก</Btn>
            <Btn onClick={saveEmp}>บันทึกพนักงาน</Btn>
          </div>
        </Modal>
      )}

      {confirmState && (
        <ConfirmModal
          title="ยืนยันการปิดการใช้งานพนักงาน"
          message={`คุณต้องการปิดการใช้งานและปรับสถานะพนักงาน ${confirmState.empName} เป็นพ้นสภาพ (Inactive) ใช่หรือไม่?`}
          confirmLabel="ปิดการใช้งาน"
          confirmVariant="danger"
          onConfirm={handleConfirmDelete}
          onClose={() => setConfirmState(null)}
        />
      )}
    </div>
  );
};

export const Employee = () => (
  <EmployeeErrorBoundary>
    <EmployeeInner />
  </EmployeeErrorBoundary>
);
