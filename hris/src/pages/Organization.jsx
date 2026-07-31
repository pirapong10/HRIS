import { useState, useEffect } from 'react';
import { SectionHeader, Card, Tabs, Tbl, Avatar, Badge, Btn, Inp, Sel, Modal } from '../components/common/UI';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { usePermission } from '../hooks/usePermission';
import { useToast } from '../components/common/Toast';
import api from '../utils/api';
import { C } from '../utils/theme';
import { fmtB, getEmpName, getPosName, getDeptName } from '../utils/helpers';

// Level config: Country > Company > Region > Branch > Division > Department > Section > Team
const ORG_LEVEL_CONFIG = {
  Country:    { icon: "🌐", borderColor: "#dc2626", bgHeader: "#dc2626", badgeBg: "#fef2f2", badgeColor: "#991b1b", label: "ประเทศ" },
  Company:    { icon: "🏢", borderColor: "#6366f1", bgHeader: "#6366f1", badgeBg: "#eef2ff", badgeColor: "#4338ca", label: "บริษัท" },
  Region:     { icon: "🌍", borderColor: "#8b5cf6", bgHeader: "#8b5cf6", badgeBg: "#f3e8ff", badgeColor: "#6d28d9", label: "ภูมิภาค" },
  Branch:     { icon: "🏪", borderColor: "#06b6d4", bgHeader: "#06b6d4", badgeBg: "#cffafe", badgeColor: "#0e7490", label: "สาขา" },
  Division:   { icon: "🏛️", borderColor: "#0ea5e9", bgHeader: "#0ea5e9", badgeBg: "#e0f2fe", badgeColor: "#0369a1", label: "สายงาน" },
  Department: { icon: "🗂️", borderColor: "#10b981", bgHeader: "#10b981", badgeBg: "#d1fae5", badgeColor: "#065f46", label: "ฝ่าย/แผนก" },
  Section:    { icon: "📋", borderColor: "#f59e0b", bgHeader: "#f59e0b", badgeBg: "#fef3c7", badgeColor: "#92400e", label: "ส่วน" },
  Team:       { icon: "👥", borderColor: "#ec4899", bgHeader: "#ec4899", badgeBg: "#fce7f3", badgeColor: "#9d174d", label: "ทีม" },
};

const OrgTree = ({ node, allDepts, emps }) => {
  const [collapsed, setCollapsed] = useState(false);
  const children = allDepts.filter(d => d.parentId === node.id);
  const cfg = ORG_LEVEL_CONFIG[node.type] || ORG_LEVEL_CONFIG.Department;
  const head = emps.find(e => e.id === node.headId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 8px' }}>
      <div style={{
        background: cfg.bgHeader, color: '#fff', borderRadius: 10,
        padding: '10px 16px', minWidth: 160, maxWidth: 220,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)', position: 'relative',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 10, opacity: 0.85, marginBottom: 2 }}>{cfg.icon} {node.type}</div>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{node.name}</div>
        <div style={{ fontSize: 11, opacity: 0.8, marginTop: 1 }}>{node.code}</div>
        {head && <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>👤 {head.name}</div>}
        <div style={{ fontSize: 11, opacity: 0.75 }}>👥 {node.employeeCount || 0} คน</div>
        {children.length > 0 && (
          <button
            onClick={e => { e.stopPropagation(); setCollapsed(!collapsed); }}
            style={{
              position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)',
              background: cfg.bgHeader, border: '2px solid #fff', borderRadius: '50%',
              width: 20, height: 20, cursor: 'pointer', fontSize: 10, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 3
            }}>
            {collapsed ? '▼' : '▲'}
          </button>
        )}
      </div>
      {!collapsed && children.length > 0 && (
        <>
          <div style={{ width: 2, height: 20, background: '#CBD5E1' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
            {children.length > 1 && (
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: `calc(100% - 40px)`, height: 2, background: '#CBD5E1'
              }} />
            )}
            {children.map(child => (
              <OrgTree key={child.id} node={child} allDepts={allDepts} emps={emps} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const SearchableSel = ({ label, value, onChange, options, placeholder = "ค้นหา..." }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedOpt = options.find(o => String(o.value) === String(value));
  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, position: "relative" }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted }}>{label}</label>}
      <div 
        onClick={() => setOpen(!open)}
        style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 14, background: C.surface, color: C.text, cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
        <span>{selectedOpt ? selectedOpt.label : placeholder}</span>
        <span>▼</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, zIndex: 10, marginTop: 4, maxHeight: 200, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          <input 
            autoFocus 
            type="text" 
            placeholder="พิมพ์เพื่อค้นหา..." 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
            style={{ width: "100%", padding: "8px 12px", border: "none", borderBottom: `1px solid ${C.border}`, outline: "none", boxSizing: "border-box" }}
          />
          <div 
            onClick={() => { onChange(""); setOpen(false); setQuery(""); }}
            style={{ padding: "8px 12px", cursor: "pointer", background: "transparent", fontStyle: "italic", color: C.textMuted }}
          >
            -- ไม่ระบุ --
          </div>
          {filtered.map(o => (
            <div 
              key={o.value} 
              onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }}
              style={{ padding: "8px 12px", cursor: "pointer", background: String(value) === String(o.value) ? C.brandLight : "transparent" }}
            >
              {o.label}
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: "8px 12px", color: C.textMuted }}>ไม่พบข้อมูล</div>}
        </div>
      )}
    </div>
  );
};

export const Organization = () => {
  const [tab, setTab] = useState("dept");
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [newDept, setNewDept] = useState({ name: "", code: "", type: "Department", headId: "", costCenterId: "", parentId: "", status: "active", description: "", countryCode: "", currency: "", timezone: "", exchangeRate: 1.0 });
  const [showPosModal, setShowPosModal] = useState(false);
  const [editingPos, setEditingPos] = useState(null);
  const [newPos, setNewPos] = useState({ name: "", code: "", deptId: "", level: "Junior", grade: "", salaryMin: "", salaryMax: "", salary: 0, approvedHeadcount: 1, status: "active", description: "" });
  const [posSearch, setPosSearch] = useState("");
  const [deptSearch, setDeptSearch] = useState("");
  const [depts, setDepts] = useState([]);
  const [allDepts, setAllDepts] = useState([]);
  const [showInactiveDept, setShowInactiveDept] = useState(false);
  const [costCenters, setCostCenters] = useState([]);
  const [positions, setPositions] = useState([]);
  const [emps, setEmps] = useState([]);
  const { canEditOrg } = usePermission();
  const { showToast } = useToast();
  const [headcounts, setHeadcounts] = useState([]);
  const [showHCModal, setShowHCModal] = useState(false);
  const [hcForm, setHCForm] = useState({ deptId: '', posId: '', quantity: 1, reason: '', date: '', priority: 'normal' });
  const [showHCDetail, setShowHCDetail] = useState(null); // stores HC record
  const [hcApproveNote, setHCApproveNote] = useState('');
  const [hcConfirmDelete, setHCConfirmDelete] = useState(null);

  const handleExportPNG = async () => {
    const html2canvas = (await import('html2canvas')).default;
    const container = document.getElementById('org-chart-container');
    if (!container) return;
    try {
      const canvas = await html2canvas(container, { backgroundColor: '#F8FAFC', scale: 2, useCORS: true, logging: false });
      const link = document.createElement('a');
      link.download = `org-chart-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('ส่งออก Org Chart PNG สำเร็จ', 'success');
    } catch (err) {
      showToast('ส่งออกไม่สำเร็จ: ' + err.message, 'error');
    }
  };

  const handleExportPDF = async () => {
    const html2canvas = (await import('html2canvas')).default;
    const container = document.getElementById('org-chart-container');
    if (!container) return;
    try {
      const canvas = await html2canvas(container, { backgroundColor: '#F8FAFC', scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`org-chart-${new Date().toISOString().split('T')[0]}.pdf`);
      showToast('ส่งออก Org Chart PDF สำเร็จ', 'success');
    } catch (err) {
      showToast('PDF ไม่พร้อม กรุณาใช้ PNG แทน', 'warning');
      handleExportPNG();
    }
  };

  const localGetDeptName = (id) => allDepts.find(d => d.id === id)?.name || getDeptName(id);
  const localGetPosName = (id) => positions.find(p => p.id === id)?.name || getPosName(id);
  const localGetEmpName = (id) => emps.find(e => e.id === id)?.name || getEmpName(id);

  const refreshDepts = async () => {
    try {
      const res = await api.get("/departments?limit=1000&flat=true");
      const arr = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setAllDepts(arr);
      setDepts(arr.filter(x => x.status !== 'inactive'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    Promise.all([
      api.get("/departments?limit=1000&flat=true"),
      api.get("/positions?limit=1000"),
      api.get("/costcenters?limit=1000"),
      api.get("/employees?limit=1000"),
      api.get("/headcount")
    ]).then(([d, p, c, e, hc]) => {
      const deptArr = Array.isArray(d.data) ? d.data : (d.data?.data || []);
      setAllDepts(deptArr);
      setDepts(deptArr.filter(x => x.status !== 'inactive'));
      
      const empArr = Array.isArray(e.data) ? e.data : (e.data?.data || []);
      setEmps(empArr);
      
      const posArr = Array.isArray(p.data) ? p.data : (p.data?.data || []);
      setPositions(posArr.filter(x => x.status !== 'inactive'));
      
      const costArr = Array.isArray(c.data) ? c.data : (c.data?.data || []);
      setCostCenters(costArr);

      const hcArr = Array.isArray(hc.data) ? hc.data : (hc.data?.data || []);
      setHeadcounts(hcArr);
    }).catch(err => console.error(err));
  }, []);

  const fetchHeadcounts = () =>
    api.get('/headcount').then(r => setHeadcounts(Array.isArray(r.data) ? r.data : (r.data?.data || []))).catch(console.error);


  const saveDept = async () => {
    if (!newDept.name || !newDept.code) {
      alert("กรุณากรอกชื่อแผนกและรหัสแผนกให้ครบถ้วน");
      return;
    }
    const payload = {
       name: newDept.name,
       code: newDept.code,
       type: newDept.type || "Department",
       headId: newDept.headId ? parseInt(newDept.headId) : null,
       costCenterId: newDept.costCenterId ? parseInt(newDept.costCenterId) : null,
       parentId: newDept.parentId ? parseInt(newDept.parentId) : null,
       status: newDept.status,
       description: newDept.description,
       countryCode: newDept.countryCode || null,
       currency: newDept.currency || null,
       timezone: newDept.timezone || null,
       exchangeRate: newDept.exchangeRate ? parseFloat(newDept.exchangeRate) : 1.0
    };

    try {
      const url = editingDept ? `/departments/${editingDept}` : "/departments";
      const method = editingDept ? "put" : "post";
      
      const res = await api[method](url, payload);
      
      await refreshDepts();
      setNewDept({ name: "", code: "", type: "Department", headId: "", costCenterId: "", parentId: "", status: "active", description: "", countryCode: "", currency: "", timezone: "", exchangeRate: 1.0 });
      setShowModal(false);
      showToast(editingDept ? "แก้ไขแผนกสำเร็จ" : "เพิ่มแผนกสำเร็จ", "success");
    } catch(err) {
      showToast(err.response?.data?.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "error");
    }
  };

  const openNewDept = () => {
    setEditingDept(null);
    setNewDept({ name: "", code: "", type: "Department", headId: "", costCenterId: "", parentId: "", status: "active", description: "", countryCode: "", currency: "", timezone: "", exchangeRate: 1.0 });
    setShowModal(true);
  };

  const openEditDept = (dept) => {
    setEditingDept(dept.id);
    setNewDept({ name: dept.name, code: dept.code, type: dept.type || "Department", headId: dept.headId || "", costCenterId: dept.costCenterId || "", parentId: dept.parentId || "", status: dept.status || "active", description: dept.description || "", countryCode: dept.countryCode || "", currency: dept.currency || "", timezone: dept.timezone || "", exchangeRate: dept.exchangeRate || 1.0 });
    setShowModal(true);
  };

  const deleteDept = async () => {
    if (window.confirm("คุณต้องการลบแผนกนี้ออกจากระบบ (Hard Delete) ใช่หรือไม่?\n\n*หมายเหตุ: จะลบได้ก็ต่อเมื่อไม่มีข้อมูลใดๆ ผูกพันกับแผนกนี้แล้วเท่านั้น")) {
      try {
        await api.delete(`/departments/${editingDept}`);
        await refreshDepts();
        setShowModal(false);
        showToast("ลบแผนกเรียบร้อยแล้ว", "success");
      } catch(err) {
        showToast(err.response?.data?.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "error");
      }
    }
  };

  const savePos = async () => {
    if (!newPos.name || !newPos.code) {
      alert("กรุณากรอกชื่อตำแหน่งและรหัสตำแหน่งให้ครบถ้วน");
      return;
    }
    const payload = {
       name: newPos.name,
       code: newPos.code,
       deptId: newPos.deptId ? parseInt(newPos.deptId) : null,
       level: newPos.level,
       grade: newPos.grade,
       salaryMin: newPos.salaryMin ? parseFloat(newPos.salaryMin) : null,
       salaryMax: newPos.salaryMax ? parseFloat(newPos.salaryMax) : null,
       approvedHeadcount: newPos.approvedHeadcount ? parseInt(newPos.approvedHeadcount) : 1,
       salary: newPos.salary ? parseFloat(newPos.salary) : 0,
       status: newPos.status,
       description: newPos.description
    };

    try {
      const url = editingPos ? `/positions/${editingPos}` : "/positions";
      const method = editingPos ? "put" : "post";
      
      const res = await api[method](url, payload);
      
      const freshRes = await api.get("/positions?limit=1000");
      const posArr = Array.isArray(freshRes.data) ? freshRes.data : (freshRes.data?.data || []);
      setPositions(posArr.filter(x => x.status !== 'inactive'));
      
      setNewPos({ name: "", code: "", deptId: "", level: "Junior", grade: "", salaryMin: "", salaryMax: "", salary: 0, approvedHeadcount: 1, status: "active", description: "" }); 
      setShowPosModal(false);
      showToast(editingPos ? "แก้ไขตำแหน่งสำเร็จ" : "เพิ่มตำแหน่งสำเร็จ", "success");
    } catch(err) {
      showToast(err.response?.data?.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "error");
    }
  };

  const openNewPos = () => {
    setEditingPos(null);
    setNewPos({ name: "", code: "", deptId: "", level: "Junior", grade: "", salaryMin: "", salaryMax: "", salary: 0, approvedHeadcount: 1, status: "active", description: "" });
    setShowPosModal(true);
  };

  const openEditPos = (pos) => {
    setEditingPos(pos.id);
    setNewPos({ name: pos.name, code: pos.code || "", deptId: pos.deptId || "", level: pos.level || "Junior", grade: pos.grade || "", salaryMin: pos.salaryMin || "", salaryMax: pos.salaryMax || "", salary: pos.salary || 0, approvedHeadcount: pos.approvedHeadcount || 1, status: pos.status || "active", description: pos.description || "" });
    setShowPosModal(true);
  };

  const deletePos = async (id) => {
    if (window.confirm("คุณต้องการลบตำแหน่งนี้ใช่หรือไม่?")) {
      try {
        await api.delete(`/positions/${id}`);
        setPositions(p => p.filter(x => x.id !== id));
        showToast("ลบตำแหน่งเรียบร้อยแล้ว", "success");
      } catch(err) {
        showToast(err.response?.data?.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "error");
      }
    }
  };

  return (
    <div>
      <SectionHeader title="โครงสร้างองค์กร" sub="จัดการแผนก ตำแหน่ง และโครงสร้างบริษัท"
        action={canEditOrg && <Btn onClick={tab === "dept" ? openNewDept : tab === "pos" ? openNewPos : openNewDept}>+ เพิ่ม{tab === "pos" ? "ตำแหน่ง" : "แผนก"}</Btn>} />
      <Tabs tabs={[
        { id: "dept", label: "แผนก" }, 
        { id: "pos", label: "ตำแหน่ง" }, 
        { id: "chart", label: "Org Chart" },
        { id: "cost", label: "Cost Center" },
        { id: "headcount", label: "Headcount Request" }
      ]} active={tab} onChange={setTab} />

      {tab === "dept" && (
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>รายการแผนก</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <input 
                type="text" 
                placeholder="ค้นหารหัส หรือ ชื่อแผนก..." 
                value={deptSearch} 
                onChange={e => setDeptSearch(e.target.value)} 
                style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", outline: "none", width: 220, fontSize: 13 }} 
              />
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: C.textMuted }}>
                <input
                  type="checkbox"
                  checked={showInactiveDept}
                  onChange={e => setShowInactiveDept(e.target.checked)}
                  style={{ width: 14, height: 14, cursor: "pointer", accentColor: C.danger }}
                />
                <span>แสดงแผนกที่ปิดใช้งาน ({allDepts.filter(d => d.status === 'inactive').length})</span>
              </label>
            </div>
          </div>
          <Tbl columns={[
            { key: "code", label: "รหัส", render: r => <Badge label={r.code} bg={r.status === 'inactive' ? C.dangerLight : C.brandLight} color={r.status === 'inactive' ? C.danger : C.brand} /> },
            { key: "name", label: "ชื่อแผนก", render: r => <div style={{ opacity: r.status === 'inactive' ? 0.5 : 1 }}><div style={{fontWeight: 600}}>{r.name}</div><div style={{fontSize: 11, color: C.textMuted}}>{r.type || "Department"}</div></div> },
            { key: "parent", label: "สังกัด (Parent)", render: r => r.parentId ? <span style={{ fontSize: 13, color: C.textMuted }}>{localGetDeptName(r.parentId)}</span> : <span style={{ fontSize: 12, color: C.brand, fontWeight: 600 }}>องค์กรหลัก (Root)</span> },
            { key: "status", label: "สถานะ", render: r => r.status === 'inactive'
              ? <Badge label="ปิดใช้งาน" bg={C.dangerLight} color={C.danger} />
              : <Badge label="ใช้งาน" bg={C.successLight} color={C.success} />
            },
            { key: "employeeCount", label: "พนักงาน", render: r => `${r.employeeCount} คน` },
            { key: "head", label: "หัวหน้า", render: r => r.headId ? localGetEmpName(r.headId) : <span style={{ color: C.textLight }}>ยังไม่กำหนด</span> },
            { key: "actions", label: "", render: r => canEditOrg && (
              <div style={{ display: "flex", gap: 6 }}>
                <Btn variant="secondary" size="sm" onClick={() => openEditDept(r)}>แก้ไข</Btn>
              </div>
            )},
          ]} data={(showInactiveDept ? allDepts : depts).filter(d => d.name.toLowerCase().includes(deptSearch.toLowerCase()) || (d.code && d.code.toLowerCase().includes(deptSearch.toLowerCase())))} />
        </Card>
      )}
      {tab === "pos" && (
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700 }}>รายชื่อตำแหน่ง</div>
            <input 
              type="text" 
              placeholder="ค้นหารหัส หรือ ชื่อตำแหน่ง..." 
              value={posSearch} 
              onChange={e => setPosSearch(e.target.value)} 
              style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", outline: "none", width: 250 }} 
            />
          </div>
          <Tbl columns={[
            { key: "code", label: "รหัส", render: r => <Badge label={r.code || '-'} bg={C.brandLight} color={C.brand} /> },
            { key: "name", label: "ตำแหน่ง" },
            { key: "dept", label: "แผนก", render: r => localGetDeptName(r.deptId) },
            { key: "level", label: "ระดับ / Grade", render: r => <div><div>{r.level || '-'}</div><div style={{fontSize: 12, color: C.textMuted}}>{r.grade || 'No Grade'}</div></div> },
            { key: "salary", label: "กระบอกเงินเดือน", render: r => <div><div>{fmtB(r.salary)}</div><div style={{fontSize: 12, color: C.textMuted}}>Min: {r.salaryMin ? fmtB(r.salaryMin) : '-'} / Max: {r.salaryMax ? fmtB(r.salaryMax) : '-'}</div></div> },
            { key: "employeeCount", label: "Headcount", render: r => {
              const current = r.employeeCount || 0;
              const quota = r.approvedHeadcount || 1;
              const vacancy = Math.max(0, quota - current);
              return <div><div style={{fontWeight: 600}}>{current} / {quota}</div><div style={{fontSize: 12, color: vacancy > 0 ? C.success : C.textMuted}}>ว่าง {vacancy} อัตรา</div></div>;
            } },
            { key: "actions", label: "", render: r => canEditOrg && (
              <div style={{ display: "flex", gap: 6 }}>
                <Btn variant="secondary" size="sm" onClick={() => openEditPos(r)}>แก้ไข</Btn>
                <Btn variant="danger" size="sm" onClick={() => deletePos(r.id)}>ลบ</Btn>
              </div>
            )},
          ]} data={positions.filter(p => p.name.toLowerCase().includes(posSearch.toLowerCase()) || (p.code && p.code.toLowerCase().includes(posSearch.toLowerCase())))} />
        </Card>
      )}
      {tab === "chart" && (
        <Card style={{ overflowX: "auto", padding: "20px" }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, gap: 8 }}>
            <Btn variant="secondary" onClick={handleExportPNG}>⬇ Export PNG</Btn>
            <Btn variant="secondary" onClick={handleExportPDF}>⬇ Export PDF</Btn>
          </div>
          <div id="org-chart-container" style={{ display: "flex", justifyContent: "center", minWidth: "max-content", padding: "32px 20px 48px", background: C.bg, borderRadius: 10 }}>
            {depts.filter(d => !d.parentId).map(root => (
              <OrgTree key={root.id} node={root} allDepts={depts} emps={emps} />
            ))}
          </div>
        </Card>
      )}
      {tab === "cost" && (
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700 }}>ศูนย์ต้นทุน / งบประมาณ</div>
            {canEditOrg && <Btn size="sm">+ สร้าง Cost Center</Btn>}
          </div>
          <Tbl columns={[
            { key: "code", label: "รหัส CC", render: r => <Badge label={r.code} bg={C.brandLight} color={C.brand} /> },
            { key: "name", label: "ชื่อ Cost Center" },
            { key: "budget", label: "งบประมาณ", render: r => fmtB(r.budget) },
            { key: "fiscal", label: "ปีงบ", render: r => r.fiscalYear },
          ]} data={costCenters} />
        </Card>
      )}
      {tab === "headcount" && (
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700 }}>คำขออนุมัติอัตรากำลังคน ({headcounts.length} รายการ)</div>
            <Btn size="sm" onClick={() => { setHCForm({ deptId: '', posId: '', quantity: 1, reason: '', date: '', priority: 'normal' }); setShowHCModal(true); }}>+ ร้องขออัตรากำลัง</Btn>
          </div>
          <Tbl columns={[
            { key: "date", label: "วันที่ขอ", render: r => <span style={{ fontSize: 12, color: C.textMuted }}>{r.date}</span> },
            { key: "dept", label: "แผนก", render: r => <span style={{ fontSize: 12 }}>{r.department?.name || localGetDeptName(r.deptId)}</span> },
            { key: "pos", label: "ตำแหน่งที่ต้องการ", render: r => <span style={{ fontWeight: 600 }}>{r.position?.name || localGetPosName(r.posId)}</span> },
            { key: "qty", label: "จำนวน", render: r => `${r.quantity} อัตรา` },
            { key: "priority", label: "ความเร่งด่วน", render: r => {
              const cfg = { urgent: { label: '🔴 เร่งด่วนมาก', color: C.danger, bg: C.dangerLight }, high: { label: '🟠 สูง', color: '#D97706', bg: '#FEF3C7' }, normal: { label: '🔵 ปกติ', color: C.brand, bg: C.brandLight }, low: { label: '⚪ ต่ำ', color: C.textMuted, bg: C.bg } }[r.priority] || { label: r.priority, color: C.textMuted, bg: C.bg };
              return <Badge label={cfg.label} bg={cfg.bg} color={cfg.color} />;
            }},
            { key: "status", label: "สถานะ", render: r => {
              const sts = {
                pending_manager: { label: "รออนุมัติ", bg: '#FEF3C7', color: '#D97706' },
                pending_hr:      { label: "รอ HR", bg: C.brandLight, color: C.brand },
                approved:        { label: "อนุมัติแล้ว", bg: C.successLight, color: C.success },
                rejected:        { label: "ปฏิเสธ", bg: C.dangerLight, color: C.danger }
              }[r.status];
              return sts ? <Badge label={sts.label} bg={sts.bg} color={sts.color} /> : <Badge label={r.status} bg={C.bg} color={C.textMuted} />;
            }},
            { key: "requester", label: "ผู้ขอ", render: r => <span style={{ fontSize: 12, color: C.textMuted }}>{r.requestedBy?.employee?.name || r.requestedBy?.email || '-'}</span> },
            { key: "actions", label: "", render: r => (
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn variant="ghost" size="sm" onClick={() => { setShowHCDetail(r); setHCApproveNote(r.approverNote || ''); }}>ตรวจสอบ</Btn>
                {r.status === 'pending_manager' && (
                  <Btn variant="danger" size="sm" onClick={() => setHCConfirmDelete(r)}>ลบ</Btn>
                )}
              </div>
            )}
          ]} data={headcounts} />
        </Card>
      )}

      {showModal && (
        <Modal title={editingDept ? "แก้ไขแผนก/หน่วยงาน" : "เพิ่มแผนก/หน่วยงานใหม่"} onClose={() => setShowModal(false)} width={640}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Section 1: ข้อมูลพื้นฐาน */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.textMuted, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>ข้อมูลพื้นฐาน</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Inp label="ชื่อแผนก *" value={newDept.name} onChange={v => setNewDept(p => ({...p, name: v}))} placeholder="เช่น ฝ่ายทรัพยากรบุคคล" style={{ gridColumn: '1/-1' }} required />
                <Inp label="รหัสแผนก *" value={newDept.code} onChange={v => setNewDept(p => ({...p, code: v.toUpperCase()}))} placeholder="เช่น HR01" required />
                <Sel label="ประเภทหน่วยงาน" value={newDept.type} onChange={v => setNewDept(p => ({...p, type: v}))}
                  options={Object.entries(ORG_LEVEL_CONFIG).map(([k, v]) => ({ value: k, label: `${v.icon} ${v.label} (${k})` }))} />
              </div>
              <div style={{ marginTop: 14 }}>
                <Inp label="คำอธิบาย" value={newDept.description || ''} onChange={v => setNewDept(p => ({...p, description: v}))} placeholder="อธิบายบทบาทของหน่วยงานนี้" />
              </div>
            </div>

            {/* Section 2: โครงสร้างองค์กร */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.textMuted, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>โครงสร้างองค์กร</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <SearchableSel label="แผนกแม่ (Parent)" value={newDept.parentId || ''}
                  onChange={v => setNewDept(p => ({...p, parentId: v}))}
                  options={[{ value: '', label: '— ไม่มี (Root) —' }, ...depts.filter(d => d.id !== editingDept).map(d => ({ value: d.id, label: `${ORG_LEVEL_CONFIG[d.type]?.icon || ''} ${d.name} (${d.code})` }))]}
                  placeholder="ค้นหาแผนกแม่..." />
                <SearchableSel label="หัวหน้าแผนก" value={newDept.headId || ''}
                  onChange={v => setNewDept(p => ({...p, headId: v}))}
                  options={[{ value: '', label: '— ยังไม่กำหนด —' }, ...emps.map(e => ({ value: e.id, label: `${e.name} (${e.empCode})` }))]}
                  placeholder="ค้นหาพนักงาน..." />
                <SearchableSel label="Cost Center" value={newDept.costCenterId || ''}
                  onChange={v => setNewDept(p => ({...p, costCenterId: v}))}
                  options={[{ value: '', label: '— ไม่ระบุ —' }, ...costCenters.map(c => ({ value: c.id, label: `${c.name} (${c.code})` }))]}
                  placeholder="ค้นหา Cost Center..." />
                <Sel label="สถานะ" value={newDept.status} onChange={v => setNewDept(p => ({...p, status: v}))}
                  options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
              </div>
            </div>

            {/* Section 3: ข้อมูลระหว่างประเทศ (เฉพาะ Country/Company/Branch) */}
            {['Country', 'Company', 'Branch'].includes(newDept.type) && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.textMuted, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>ข้อมูลระหว่างประเทศ</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Inp label="Country Code (ISO 3166)" value={newDept.countryCode || ''}
                    onChange={v => setNewDept(p => ({...p, countryCode: v.toUpperCase().slice(0,2)}))} placeholder="TH, SG, US" />
                  <Inp label="สกุลเงิน (ISO 4217)" value={newDept.currency || ''}
                    onChange={v => setNewDept(p => ({...p, currency: v.toUpperCase().slice(0,3)}))} placeholder="THB, SGD" />
                  <Inp label="อัตราแลกเปลี่ยน (อิง THB)" value={newDept.exchangeRate}
                    onChange={v => setNewDept(p => ({...p, exchangeRate: v}))} type="number" placeholder="1.0" />
                  <Sel label="Timezone" value={newDept.timezone || 'Asia/Bangkok'}
                    onChange={v => setNewDept(p => ({...p, timezone: v}))}
                    options={[
                      { value: 'Asia/Bangkok', label: 'Asia/Bangkok (ICT +7)' },
                      { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT +8)' },
                      { value: 'Asia/Yangon', label: 'Asia/Yangon (MMT +6:30)' },
                      { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho_Chi_Minh (ICT +7)' },
                      { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST +9)' },
                      { value: 'UTC', label: 'UTC +0' },
                    ]} />
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 4 }}>
              <div>{editingDept && <Btn variant="danger" onClick={deleteDept}>ลบแผนก (ลบถาวร)</Btn>}</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn variant="ghost" onClick={() => setShowModal(false)}>ยกเลิก</Btn>
                <Btn onClick={saveDept}>{editingDept ? 'บันทึกการแก้ไข' : 'สร้างหน่วยงาน'}</Btn>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {showPosModal && (
        <Modal title={editingPos ? "แก้ไขตำแหน่ง" : "เพิ่มตำแหน่งใหม่"} onClose={() => setShowPosModal(false)} width={580}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Section 1: ข้อมูลพื้นฐาน */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.textMuted, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>ข้อมูลพื้นฐาน</div>
              <Inp label="ชื่อตำแหน่ง *" value={newPos.name} onChange={v => setNewPos(p => ({...p, name: v}))} placeholder="เช่น HR Manager" required />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                <Inp label="รหัสตำแหน่ง *" value={newPos.code} onChange={v => setNewPos(p => ({...p, code: v}))} required />
                <Inp label="รหัสระดับขั้น (Grade / Band)" value={newPos.grade} onChange={v => setNewPos(p => ({...p, grade: v}))} />
              </div>
              <div style={{ marginTop: 14 }}>
                <Inp label="คำอธิบาย / หน้าที่รับผิดชอบ" value={newPos.description} onChange={v => setNewPos(p => ({...p, description: v}))} />
              </div>
            </div>

            {/* Section 2: การจัดวาง */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.textMuted, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>การจัดวาง</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <SearchableSel label="แผนกสังกัด" value={newPos.deptId || ''} onChange={v => setNewPos(p => ({...p, deptId: v}))}
                  options={depts.map(d => ({ value: d.id, label: d.name }))} placeholder="ค้นหาแผนก..." />
                <Sel label="ระดับ (Level)" value={newPos.level} onChange={v => setNewPos(p => ({...p, level: v}))}
                  options={[{ value: 'Junior', label: 'Junior' }, { value: 'Senior', label: 'Senior' }, { value: 'Manager', label: 'Manager' }, { value: 'Director', label: 'Director' }, { value: 'Executive', label: 'Executive' }]} />
                <Inp label="โควต้าพนักงาน (Approved Headcount)" value={newPos.approvedHeadcount} onChange={v => setNewPos(p => ({...p, approvedHeadcount: v}))} type="number" required />
                <Sel label="สถานะ" value={newPos.status} onChange={v => setNewPos(p => ({...p, status: v}))}
                  options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
              </div>
            </div>

            {/* Section 3: เงินเดือน */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.textMuted, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>เงินเดือน</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <Inp label="เงินเดือนต่ำสุด (Min)" value={newPos.salaryMin} onChange={v => setNewPos(p => ({...p, salaryMin: v}))} type="number" />
                <Inp label="เงินเดือนอ้างอิง (Mid)" value={newPos.salary} onChange={v => setNewPos(p => ({...p, salary: v}))} type="number" required />
                <Inp label="เงินเดือนสูงสุด (Max)" value={newPos.salaryMax} onChange={v => setNewPos(p => ({...p, salaryMax: v}))} type="number" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <Btn variant="ghost" onClick={() => setShowPosModal(false)}>ยกเลิก</Btn>
              <Btn onClick={savePos}>{editingPos ? 'บันทึกการแก้ไข' : 'เพิ่มตำแหน่ง'}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Create Headcount Request Modal ── */}
      {showHCModal && (
        <Modal title="ร้องขออัตรากำลังคน" onClose={() => setShowHCModal(false)} width={560}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Sel label="แผนก *" value={hcForm.deptId} onChange={v => setHCForm(f => ({ ...f, deptId: v, posId: '' }))}
                options={depts.map(d => ({ value: d.id, label: d.name }))} />
              <Sel label="ตำแหน่งที่ต้องการ *" value={hcForm.posId} onChange={v => setHCForm(f => ({ ...f, posId: v }))}
                options={positions.filter(p => !hcForm.deptId || p.deptId === parseInt(hcForm.deptId)).map(p => ({ value: p.id, label: p.name }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Inp label="จำนวน (อัตรา) *" value={hcForm.quantity} onChange={v => setHCForm(f => ({ ...f, quantity: v }))} type="number" />
              <Sel label="ระดับความเร่งด่วน" value={hcForm.priority} onChange={v => setHCForm(f => ({ ...f, priority: v }))}
                options={[{ value: 'low', label: '⚪ ต่ำ' }, { value: 'normal', label: '🔵 ปกติ' }, { value: 'high', label: '🟠 สูง' }, { value: 'urgent', label: '🔴 เร่งด่วนมาก' }]} />
            </div>
            <Inp label="วันที่ต้องการ (Needed By) *" value={hcForm.date} onChange={v => setHCForm(f => ({ ...f, date: v }))} type="date" />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>เหตุผล / รายละเอียด *</div>
              <textarea
                value={hcForm.reason}
                onChange={e => setHCForm(f => ({ ...f, reason: e.target.value }))}
                rows={3}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                placeholder="ระบุเหตุผลที่ต้องการอัตรากำลังเพิ่ม..."
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <Btn variant="ghost" onClick={() => setShowHCModal(false)}>ยกเลิก</Btn>
              <Btn onClick={async () => {
                if (!hcForm.deptId || !hcForm.posId || !hcForm.quantity || !hcForm.reason || !hcForm.date) {
                  return showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
                }
                try {
                  await api.post('/headcount', { ...hcForm, deptId: parseInt(hcForm.deptId), posId: parseInt(hcForm.posId), quantity: parseInt(hcForm.quantity) });
                  setShowHCModal(false);
                  fetchHeadcounts();
                  showToast('ส่งคำขออัตรากำลังสำเร็จ', 'success');
                } catch (err) {
                  showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
                }
              }}>ส่งคำขอ</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Detail / Approve Modal ── */}
      {showHCDetail && (
        <Modal title="รายละเอียดคำขออัตรากำลัง" onClose={() => setShowHCDetail(null)} width={540}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: C.surface, padding: 16, borderRadius: 8, border: `1px solid ${C.border}` }}>
              {[
                ['แผนก', showHCDetail.department?.name || localGetDeptName(showHCDetail.deptId)],
                ['ตำแหน่ง', showHCDetail.position?.name || localGetPosName(showHCDetail.posId)],
                ['จำนวน', `${showHCDetail.quantity} อัตรา`],
                ['วันที่ต้องการ', showHCDetail.date],
                ['ผู้ขอ', showHCDetail.requestedBy?.employee?.name || showHCDetail.requestedBy?.email || '-'],
                ['วันที่สร้าง', showHCDetail.createdAt ? new Date(showHCDetail.createdAt).toLocaleDateString('th-TH') : '-'],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{val}</div>
                </div>
              ))}
              <div style={{ gridColumn: '1/-1' }}>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>เหตุผล</div>
                <div style={{ fontSize: 13 }}>{showHCDetail.reason}</div>
              </div>
              {showHCDetail.approverNote && (
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>หมายเหตุผู้อนุมัติ</div>
                  <div style={{ fontSize: 13, color: C.warning }}>{showHCDetail.approverNote}</div>
                </div>
              )}
            </div>

            {['pending_manager', 'pending_hr'].includes(showHCDetail.status) && (
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 8 }}>หมายเหตุการอนุมัติ (ถ้ามี)</div>
                <textarea
                  value={hcApproveNote}
                  onChange={e => setHCApproveNote(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10 }}
                  placeholder="ระบุเหตุผลการอนุมัติ/ปฏิเสธ..."
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Btn variant="ghost" onClick={() => setShowHCDetail(null)}>ปิด</Btn>
                  <Btn variant="danger" onClick={async () => {
                    try {
                      await api.put(`/headcount/${showHCDetail.id}/approve`, { status: 'rejected', approverNote: hcApproveNote });
                      setShowHCDetail(null); fetchHeadcounts(); showToast('ปฏิเสธคำขอแล้ว', 'success');
                    } catch (err) { showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาด', 'error'); }
                  }}>ปฏิเสธ</Btn>
                  <Btn onClick={async () => {
                    try {
                      await api.put(`/headcount/${showHCDetail.id}/approve`, { status: 'approved', approverNote: hcApproveNote });
                      setShowHCDetail(null); fetchHeadcounts(); showToast('อนุมัติคำขอสำเร็จ', 'success');
                    } catch (err) { showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาด', 'error'); }
                  }}>✅ อนุมัติ</Btn>
                </div>
              </div>
            )}
            {!['pending_manager', 'pending_hr'].includes(showHCDetail.status) && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Btn variant="ghost" onClick={() => setShowHCDetail(null)}>ปิด</Btn>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Confirm Delete HC ── */}
      {hcConfirmDelete && (
        <ConfirmModal
          title="ยืนยันการลบคำขอ"
          message={`ลบคำขออัตรา "${hcConfirmDelete.position?.name || ''}" จำนวน ${hcConfirmDelete.quantity} อัตรา?`}
          onConfirm={async () => {
            try {
              await api.delete(`/headcount/${hcConfirmDelete.id}`);
              setHCConfirmDelete(null); fetchHeadcounts(); showToast('ลบคำขอสำเร็จ', 'success');
            } catch (err) { showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาด', 'error'); }
          }}
          onClose={() => setHCConfirmDelete(null)}
        />
      )}
    </div>
  );
};
