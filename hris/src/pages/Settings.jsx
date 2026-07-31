import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { SectionHeader, Card, Inp, Sel, Btn, Tbl, Avatar, Badge, Modal } from '../components/common/UI';
import { C } from '../utils/theme';
import api from '../utils/api';
import { useToast } from '../components/common/Toast';

export const Settings = () => {
  const { user } = useAuth();
  const { settings: globalSettings, setSettings } = useSettings();
  const { showToast } = useToast();
  
  const [tab, setTab] = useState("general");
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [s, setS] = useState(globalSettings || {});
  const [saved, setSaved] = useState(false);
  const [mfaQr, setMfaQr] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaMsg, setMfaMsg] = useState("");

  const [components, setComponents] = useState([]);
  const [loadingComps, setLoadingComps] = useState(false);
  const [showCompModal, setShowCompModal] = useState(false);
  const [editingComp, setEditingComp] = useState(null);
  const [confirmDeleteComp, setConfirmDeleteComp] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const defaultComp = {
    code: '', name: '', type: 'earning', calcMethod: 'formula',
    formula: '', functionName: '', isTaxable: true, isSSOBase: false,
    sortOrder: 99, isActive: true
  };
  const [compForm, setCompForm] = useState(defaultComp);
  const [testVars, setTestVars] = useState({ Salary: 30000, OTHours: 0, BASIC: 30000 });

  const [employeeTypes, setEmployeeTypes] = useState([]);
  const [loadingEmpTypes, setLoadingEmpTypes] = useState(false);
  const [showEmpTypeModal, setShowEmpTypeModal] = useState(false);
  const [editingEmpType, setEditingEmpType] = useState(null);
  const [confirmDeleteEmpType, setConfirmDeleteEmpType] = useState(null);

  const defaultEmpType = {
    code: '', name: '', color: '#3B82F6', isActive: true, sortOrder: 0,
    ssoEnabled: true, ssoRate: 0.05, ssoCap: 750, ssoEmployerRate: 0.05,
    taxMethod: 'progressive', taxFlatRate: 0,
    otEligible: true, leaveEligible: true, annualLeave: 6, includeInPayroll: true
  };
  const [empTypeForm, setEmpTypeForm] = useState(defaultEmpType);

  const [holidays, setHolidays] = useState([]);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [confirmDeleteHoliday, setConfirmDeleteHoliday] = useState(null);
  const [holidayForm, setHolidayForm] = useState({ date: '', name: '' });

  const [leavePolicies, setLeavePolicies] = useState([]);
  const [probationPolicy, setProbationPolicy] = useState(null);
  const [loadingLeave, setLoadingLeave] = useState(false);
  const [showProbationModal, setShowProbationModal] = useState(false);
  const [probationForm, setProbationForm] = useState({ probationDays: 119, allowLeaveDuring: false, prorateAfterPassed: true });
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [policyForm, setPolicyForm] = useState({ requiresCert: false, certThreshold: 0, allowNegative: false, maxNegative: 0, proRata: true, isCarryForward: false, maxCarryDays: 0, rules: [] });
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    if (globalSettings) setS(globalSettings);
  }, [globalSettings]);

  const isSA = user?.role === "superadmin" || user?.roles?.includes("SUPER_ADMIN");
  const isHR = user?.role !== "user";

  useEffect(() => {
    if (isSA) {
      api.get('/rbac/users').then(r => setUsers(r.data)).catch(() => {});
      api.get('/rbac/audit-logs').then(r => setAuditLogs(Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [])).catch(() => {});
    }
  }, [isSA]);

  useEffect(() => {
    if (tab === 'payroll') {
      setLoadingComps(true);
      api.get('/payroll-components')
        .then(r => setComponents(r.data))
        .catch(() => showToast('โหลดข้อมูล component ไม่สำเร็จ', 'error'))
        .finally(() => setLoadingComps(false));
    }
    if (tab === 'employeeTypes') {
      setLoadingEmpTypes(true);
      api.get('/employee-types')
        .then(r => setEmployeeTypes(r.data))
        .catch(() => showToast('โหลดข้อมูลประเภทพนักงานไม่สำเร็จ', 'error'))
        .finally(() => setLoadingEmpTypes(false));
    }
    if (tab === 'publicHolidays') {
      setLoadingHolidays(true);
      api.get('/public-holidays')
        .then(r => setHolidays(r.data))
        .catch(() => showToast('โหลดข้อมูลวันหยุดไม่สำเร็จ', 'error'))
        .finally(() => setLoadingHolidays(false));
    }
    if (tab === 'leave') {
      setLoadingLeave(true);
      Promise.all([
        api.get('/leave-policies').then(r => setLeavePolicies(r.data)),
        api.get('/leave-policies/probation').then(r => setProbationPolicy(r.data))
      ]).catch(() => showToast('โหลดข้อมูลนโยบายการลาไม่สำเร็จ', 'error'))
        .finally(() => setLoadingLeave(false));
    }
  }, [tab]);

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
    setConfirmDeleteComp(null);
  };

  const handleSaveEmpType = async () => {
    if (!empTypeForm.code || !empTypeForm.name) {
      showToast('กรุณากรอกรหัสและชื่อประเภทพนักงาน', 'error');
      return;
    }
    try {
      const payload = {
        ...empTypeForm,
        ssoRate: Number(empTypeForm.ssoRate) || 0,
        ssoCap: Number(empTypeForm.ssoCap) || 0,
        ssoEmployerRate: Number(empTypeForm.ssoEmployerRate) || 0,
        taxFlatRate: Number(empTypeForm.taxFlatRate) || 0,
        sortOrder: Number(empTypeForm.sortOrder) || 0,
        annualLeave: Number(empTypeForm.annualLeave) || 0,
      };

      if (editingEmpType) {
        const res = await api.put(`/employee-types/${editingEmpType}`, payload);
        setEmployeeTypes(p => p.map(t => t.id === editingEmpType ? { ...t, ...res.data } : t));
        showToast('แก้ไขประเภทพนักงานสำเร็จ', 'success');
      } else {
        const res = await api.post('/employee-types', payload);
        setEmployeeTypes(p => [...p, { ...res.data, _count: { employees: 0 } }]);
        showToast('สร้างประเภทพนักงานสำเร็จ', 'success');
      }
      setShowEmpTypeModal(false);
    } catch (err) {
      showToast(`ไม่สามารถบันทึกได้: ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  const handleDeleteEmpType = async () => {
    try {
      await api.delete(`/employee-types/${confirmDeleteEmpType.id}`);
      setEmployeeTypes(p => p.filter(t => t.id !== confirmDeleteEmpType.id));
      showToast(`ลบ "${confirmDeleteEmpType.name}" สำเร็จ`, 'success');
    } catch (err) {
      showToast(`ลบไม่สำเร็จ: ${err.response?.data?.message || err.message}`, 'error');
    }
    setConfirmDeleteEmpType(null);
  };
  
  const handleSaveHoliday = async () => {
    if (!holidayForm.date || !holidayForm.name) {
      showToast('กรุณากรอกวันที่และชื่อวันหยุด', 'error');
      return;
    }
    try {
      const payload = { date: holidayForm.date, name: holidayForm.name };
      if (editingHoliday) {
        const res = await api.put(`/public-holidays/${editingHoliday}`, payload);
        setHolidays(p => p.map(h => h.id === editingHoliday ? res.data : h));
        showToast('แก้ไขวันหยุดสำเร็จ', 'success');
      } else {
        const res = await api.post('/public-holidays', payload);
        setHolidays(p => [...p, res.data].sort((a, b) => new Date(a.date) - new Date(b.date)));
        showToast('สร้างวันหยุดสำเร็จ', 'success');
      }
      setShowHolidayModal(false);
    } catch (err) {
      showToast(`ไม่สามารถบันทึกได้: ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  const handleDeleteHoliday = async () => {
    try {
      await api.delete(`/public-holidays/${confirmDeleteHoliday.id}`);
      setHolidays(p => p.filter(h => h.id !== confirmDeleteHoliday.id));
      showToast(`ลบ "${confirmDeleteHoliday.name}" สำเร็จ`, 'success');
    } catch (err) {
      showToast(`ลบไม่สำเร็จ: ${err.response?.data?.message || err.message}`, 'error');
    }
    setConfirmDeleteHoliday(null);
  };

  const tabs = [
    { id: "general", label: "ทั่วไป", show: isHR },
    { id: "attendance", label: "เวลาทำงาน", show: isHR },
    { id: "leave", label: "การลา", show: isHR },
    { id: "publicHolidays", label: "วันหยุด", show: isHR },
    { id: "payroll", label: "เงินเดือน", show: isHR },
    { id: "employeeTypes", label: "ประเภทพนักงาน", show: isHR },
    { id: "users", label: "ผู้ใช้งาน", show: isSA },
    { id: "audit", label: "Audit Log", show: isSA },
    { id: "personal", label: "ส่วนตัว", show: true },
  ].filter(t => t.show);
  
  const sf = (k, v) => { setS(p => ({ ...p, [k]: v })); setSaved(false); };

  const handleSave = async () => {
    await setSettings(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const setupMfa = async () => {
    try {
      const res = await api.post("/mfa/generate");
      setMfaQr(res.data.qrCodeUrl);
      setMfaSecret(res.data.secret);
      setMfaMsg("");
    } catch (err) {
      showToast(err.response?.data?.message || "Error generating MFA", "error");
    }
  };

  const verifyMfa = async () => {
    try {
      await api.post("/mfa/verify", { token: mfaCode });
      setMfaQr(""); setMfaCode(""); setMfaSecret("");
      setMfaMsg("✅ MFA เปิดใช้งานแล้ว (MFA Enabled)");
    } catch (err) {
      setMfaMsg("❌ รหัสไม่ถูกต้อง");
    }
  };

  const disableMfa = async () => {
    try {
      await api.post("/mfa/disable");
      setMfaMsg("✅ MFA ถูกปิดใช้งานแล้ว");
    } catch (err) {
      showToast(err.response?.data?.message || "Error disabling MFA", "error");
    }
  };

  const handleRuleChange = (index, field, value) => {
    setPolicyForm(p => {
      const newRules = [...(p.rules || [])];
      
      // 1. เช็คว่ามี Object ใน Index นี้หรือยัง ถ้ายังไม่มี ให้สร้าง Object เปล่าขึ้นมาก่อน
      if (!newRules[index]) {
        newRules[index] = { _tempId: crypto.randomUUID(), minYearsOfService: 0, maxYearsOfService: null, entitledDays: 0 }; 
      } else {
        // ต้อง Copy Object ภายในด้วย เพื่อไม่ให้เกิด Mutation กับค่าเดิม
        newRules[index] = { ...newRules[index] }; 
      }
      
      // 2. ค่อยจับยัดค่าลงไป
      newRules[index][field] = value; 
      
      return { ...p, rules: newRules };
    });
  };

  return (
    <div>
      <SectionHeader title="การตั้งค่า" sub="ปรับค่าแต่ละ Module" />
      {saved && <div style={{ background: C.successLight, color: C.success, borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14, fontWeight: 600 }}>✅ บันทึกการตั้งค่าสำเร็จ</div>}
      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ minWidth: 180 }}>
          <Card style={{ padding: "8px 0" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: tab === t.id ? 600 : 400, background: tab === t.id ? C.brandLight : "transparent", color: tab === t.id ? C.brand : C.text, borderRadius: 6, margin: "1px 4px" }}>
                {t.label}
              </button>
            ))}
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          {tab === "general" && (
            <Card>
              <div style={{ fontWeight: 700, marginBottom: 18 }}>ข้อมูลบริษัท</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Inp label="ชื่อบริษัท" value={s.companyName || ""} onChange={v => sf("companyName", v)} style={{ gridColumn: "1/-1" }} />
                <Sel label="เดือนเริ่มต้นปีงบประมาณ" value={s.fiscalStart || "1"} onChange={v => sf("fiscalStart", v)}
                  options={[...Array(12)].map((_, i) => ({ value: String(i + 1), label: `เดือน ${i + 1}` }))} />
              </div>
              <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}><Btn onClick={handleSave}>บันทึก</Btn></div>
            </Card>
          )}
          {tab === "attendance" && (
            <Card>
              <div style={{ fontWeight: 700, marginBottom: 18 }}>ตั้งค่าเวลาทำงานและพิกัด Geofencing</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Inp label="ละติจูดออฟฟิศ (Latitude)" value={s.companyLat || ""} onChange={v => sf("companyLat", v)} type="number" step="0.000001" />
                <Inp label="ลองจิจูดออฟฟิศ (Longitude)" value={s.companyLng || ""} onChange={v => sf("companyLng", v)} type="number" step="0.000001" />
                <Inp label="รัศมีที่อนุญาตให้เช็คอิน (เมตร)" value={s.allowedRadiusM || ""} onChange={v => sf("allowedRadiusM", v)} type="number" />
                <Inp label="นาทีที่ถือว่าสาย" value={s.lateThreshold || ""} onChange={v => sf("lateThreshold", v)} type="number" />
                <Inp label="ชม.ทำงาน/วัน" value={s.workHours || ""} onChange={v => sf("workHours", v)} type="number" />
                <Inp label="วันทำงาน/สัปดาห์" value={s.workDays || ""} onChange={v => sf("workDays", v)} type="number" />
              </div>
              <div style={{ marginTop: 14, padding: "10px 14px", background: C.brandLight, borderRadius: 8, fontSize: 13, color: C.brand }}>
                💡 สาย &gt;{s.lateThreshold || 15} นาที บันทึกว่า "มาสาย"
              </div>
              <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}><Btn onClick={handleSave}>บันทึก</Btn></div>
            </Card>
          )}
          {tab === "leave" && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Probation Policy */}
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>นโยบายช่วงทดลองงาน (Probation Policy)</div>
                    <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>กำหนดระยะเวลาทดลองงานและสิทธิ์การลา</div>
                  </div>
                  <Btn size="sm" onClick={() => {
                    setProbationForm(probationPolicy || { probationDays: 119, allowLeaveDuring: false, prorateAfterPassed: true });
                    setShowProbationModal(true);
                  }}>แก้ไข</Btn>
                </div>
                {loadingLeave ? (
                  <div style={{ padding: 12, color: C.textMuted }}>กำลังโหลด...</div>
                ) : probationPolicy ? (
                  <div style={{ display: 'flex', gap: 24, fontSize: 14 }}>
                    <div><span style={{ color: C.textMuted }}>ระยะเวลาทดลองงาน:</span> <span style={{ fontWeight: 600 }}>{probationPolicy.probationDays} วัน</span></div>
                    <div><span style={{ color: C.textMuted }}>ลาช่วงโปรได้:</span> <span style={{ fontWeight: 600 }}>{probationPolicy.allowLeaveDuring ? 'ได้' : 'ไม่ได้'}</span></div>
                    <div><span style={{ color: C.textMuted }}>คำนวณ Pro-rata หลังผ่านโปร:</span> <span style={{ fontWeight: 600 }}>{probationPolicy.prorateAfterPassed ? 'ใช่' : 'ไม่ใช่'}</span></div>
                  </div>
                ) : null}
              </Card>

              {/* Leave Policies */}
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>นโยบายการลาและโควต้า (Leave Policies & Rules)</div>
                    <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>กำหนดสิทธิ์การลาตามอายุงานและเงื่อนไขต่างๆ</div>
                  </div>
                  <Btn variant="danger" size="sm" disabled={recalculating} onClick={async () => {
                    if (!window.confirm("การคำนวณใหม่จะตรวจสอบและสร้างโควต้าสำหรับพนักงานทุกคนในปีนี้ คุณแน่ใจหรือไม่?")) return;
                    setRecalculating(true);
                    try {
                      await api.post('/leave-policies/recalculate', { year: new Date().getFullYear() });
                      showToast('คำนวณโควต้าวันลาใหม่สำเร็จ', 'success');
                    } catch (e) {
                      showToast('เกิดข้อผิดพลาดในการคำนวณโควต้า', 'error');
                    } finally {
                      setRecalculating(false);
                    }
                  }}>{recalculating ? 'กำลังคำนวณ...' : 'Recalculate All Balances'}</Btn>
                </div>

                {loadingLeave ? (
                  <div style={{ padding: 12, textAlign: 'center', color: C.textMuted }}>กำลังโหลด...</div>
                ) : (
                  <Tbl
                    columns={[
                      { key: 'type', label: 'ประเภทการลา', render: r => (
                        <div>
                          <div style={{ fontWeight: 600 }}>{r.description || r.leaveType}</div>
                          <div style={{ fontSize: 12, color: C.textMuted, fontFamily: 'monospace' }}>{r.leaveType}</div>
                        </div>
                      )},
                      { key: 'cert', label: 'ใบรับรองแพทย์', render: r => r.requiresCert ? <Badge label={`ต้องการ (≥ ${r.certThreshold} วัน)`} bg={C.warningLight} color={C.warning} /> : <Badge label="ไม่ต้องใช้" bg={C.bg} color={C.textMuted} /> },
                      { key: 'proRata', label: 'Pro-Rata', render: r => r.proRata ? <Badge label="คำนวณเฉลี่ย" bg={C.brandLight} color={C.brand} /> : <Badge label="ได้เต็มจำนวน" bg={C.bg} color={C.textMuted} /> },
                      { key: 'carry', label: 'ยกยอด', render: r => r.isCarryForward ? <Badge label={`ยกยอดได้ (≤ ${r.maxCarryDays})`} bg={C.successLight} color={C.success} /> : <Badge label="ไม่ยกยอด" bg={C.bg} color={C.textMuted} /> },
                      { key: 'actions', label: '', render: r => (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <Btn variant="secondary" size="sm" onClick={() => {
                            setEditingPolicy(r);
                            setPolicyForm({ ...r, rules: r.entitlementRules || [] });
                            setShowPolicyModal(true);
                          }}>View / Edit Rules</Btn>
                        </div>
                      )}
                    ]}
                    data={leavePolicies}
                  />
                )}
              </Card>
            </div>
          )}
          {tab === "payroll" && (
            <Card>
              <div style={{ fontWeight: 700, marginBottom: 18 }}>ตั้งค่าเงินเดือนและภาษี</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Sel label="วิธีคำนวณภาษี" value={s.taxMethod || "progressive"} onChange={v => sf("taxMethod", v)}
                  options={[{ value: "progressive", label: "อัตราก้าวหน้า (ตามกฎหมาย)" }, { value: "flat", label: "อัตราคงที่" }]} style={{ gridColumn: "1/-1" }} />
                <Inp label="อัตราประกันสังคม (%)" value={s.ssoRate || ""} onChange={v => sf("ssoRate", v)} type="number" />
                <Inp label="อัตราโอที เริ่มต้น (เท่า)" value={s.otRate || ""} onChange={v => sf("otRate", v)} type="number" />
                <Inp label="ฐาน SSO สูงสุด (บาท)" value={s.ssoBaseCap || "15000"} onChange={v => sf("ssoBaseCap", v)} type="number" />
              </div>
              <div style={{ marginTop: 14, padding: "10px 14px", background: C.warningLight, borderRadius: 8, fontSize: 13, color: C.warning }}>
                ⚠️ การเปลี่ยนอัตรามีผลกับรอบเงินเดือนถัดไปเท่านั้น
              </div>
              <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}><Btn onClick={handleSave}>บันทึก</Btn></div>

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
            </Card>
          )}
          {tab === "employeeTypes" && (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>ประเภทพนักงาน (Employee Types)</div>
                  <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
                    ตั้งค่าสถานะ รูปแบบภาษี และประกันสังคมของแต่ละกลุ่มพนักงาน
                  </div>
                </div>
                <Btn onClick={() => { setEditingEmpType(null); setEmpTypeForm(defaultEmpType); setShowEmpTypeModal(true); }}>
                  + สร้างประเภทใหม่
                </Btn>
              </div>

              {loadingEmpTypes ? (
                <div style={{ textAlign: 'center', padding: 24, color: C.textMuted }}>กำลังโหลด...</div>
              ) : (
                <Tbl
                  columns={[
                    { key: 'code', label: 'รหัส', render: r => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.code}</span> },
                    { key: 'name', label: 'ชื่อ', render: r => <Badge label={r.name} bg={r.color + '18'} color={r.color} /> },
                    { key: 'sso', label: 'ประกันสังคม', render: r => r.ssoEnabled ? <Badge label={`${r.ssoRate * 100}% (สูงสุด ${r.ssoCap})`} bg={C.successLight} color={C.success} /> : <Badge label="ไม่มี" bg={C.bg} color={C.textMuted} /> },
                    { key: 'tax', label: 'ภาษี', render: r => r.taxMethod === 'progressive' ? <Badge label="อัตราก้าวหน้า" bg={C.brandLight} color={C.brand} /> : r.taxMethod === 'wht' ? <Badge label={`หัก ณ ที่จ่าย ${r.taxFlatRate * 100}%`} bg={C.warningLight} color={C.warning} /> : <Badge label="ยกเว้น" bg={C.bg} color={C.textMuted} /> },
                    { key: 'count', label: 'จำนวน (คน)', render: r => <span style={{ fontWeight: 600 }}>{r._count?.employees || 0}</span> },
                    { key: 'actions', label: '', render: r => (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Btn variant="secondary" size="sm" onClick={() => {
                          setEditingEmpType(r.id);
                          setEmpTypeForm({ ...r });
                          setShowEmpTypeModal(true);
                        }}>แก้ไข</Btn>
                        <Btn variant="danger" size="sm" onClick={() => setConfirmDeleteEmpType(r)}>ลบ</Btn>
                      </div>
                    )},
                  ]}
                  data={[...employeeTypes].sort((a, b) => a.sortOrder - b.sortOrder)}
                />
              )}
            </Card>
          )}
          {tab === "publicHolidays" && (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>วันหยุดนักขัตฤกษ์ (Public Holidays)</div>
                  <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
                    จัดการวันหยุดประจำปีของบริษัท เพื่อใช้คำนวณวันลาและวันทำงาน
                  </div>
                </div>
                <Btn onClick={() => { setEditingHoliday(null); setHolidayForm({ date: '', name: '' }); setShowHolidayModal(true); }}>
                  + เพิ่มวันหยุด
                </Btn>
              </div>

              {loadingHolidays ? (
                <div style={{ textAlign: 'center', padding: 24, color: C.textMuted }}>กำลังโหลด...</div>
              ) : (
                <Tbl
                  columns={[
                    { key: 'date', label: 'วันที่', render: r => new Date(r.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) },
                    { key: 'name', label: 'ชื่อวันหยุด', render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
                    { key: 'actions', label: '', render: r => (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Btn variant="secondary" size="sm" onClick={() => {
                          setEditingHoliday(r.id);
                          setHolidayForm({ date: r.date.split('T')[0], name: r.name });
                          setShowHolidayModal(true);
                        }}>แก้ไข</Btn>
                        <Btn variant="danger" size="sm" onClick={() => setConfirmDeleteHoliday(r)}>ลบ</Btn>
                      </div>
                    )},
                  ]}
                  data={holidays}
                />
              )}
            </Card>
          )}
          {tab === "users" && isSA && (
            <Card style={{ padding: 0 }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, fontWeight: 700 }}>จัดการบัญชีผู้ใช้ (ดู User Mgmt Module แบบเต็มที่เมนูด้านซ้าย)</div>
              <Tbl columns={[
                {
                  key: "name", label: "ชื่อ", render: r => (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Avatar name={r.name} size={28} />
                      <div><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: 11, color: C.textMuted }}>{r.email}</div></div>
                    </div>
                  )
                },
                {
                  key: "role", label: "บทบาท", render: r => ({
                    superadmin: <Badge label="👑 Superadmin" bg={C.purpleLight} color={C.purple} />,
                    hr_admin: <Badge label="👩‍💼 HR Admin" bg={C.brandLight} color={C.brand} />,
                    user: <Badge label="👤 User" bg={C.successLight} color={C.success} />,
                  }[r.role] || <Badge label={r.role} bg={C.bg} color={C.text} />)
                },
              ]} data={users} />
            </Card>
          )}
          {tab === "audit" && isSA && (
            <Card style={{ padding: 0 }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                <span>บันทึกความปลอดภัย (Audit Log)</span>
                <Badge label={`${auditLogs.length} รายการ`} bg={C.brandLight} color={C.brand} />
              </div>
              <Tbl columns={[
                { key: "createdAt", label: "เวลา", render: r => <span style={{ fontSize: 12, color: C.textMuted }}>{new Date(r.createdAt).toLocaleString("th-TH")}</span> },
                { key: "actor", label: "ผู้กระทำ", render: r => { const u = users.find(u => u.id === r.userId); return u ? u.email : (r.userId === 0 ? "System/Guest" : `ID: ${r.userId}`); } },
                { key: "action", label: "เหตุการณ์", render: r => <span style={{ fontWeight: 600 }}>{r.action}</span> },
                { key: "module", label: "โมดูล", render: r => <Badge label={r.module} bg={C.bg} color={C.text} /> },
              ]} data={(Array.isArray(auditLogs) ? auditLogs : []).slice(0, 50)} />
            </Card>
          )}
          {tab === "personal" && (
            <Card>
              <div style={{ fontWeight: 700, marginBottom: 18 }}>ตั้งค่าส่วนตัว</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Sel label="ภาษา" value="th" onChange={() => { }} options={[{ value: "th", label: "ภาษาไทย" }, { value: "en", label: "English" }]} />
                <Sel label="รูปแบบวันที่" value="th" onChange={() => { }} options={[{ value: "th", label: "DD/MM/YYYY" }, { value: "en", label: "MM/DD/YYYY" }]} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 8 }}>ความปลอดภัย (MFA)</div>
                  {mfaMsg && <div style={{ fontSize: 13, marginBottom: 10, color: mfaMsg.includes("❌") ? C.danger : C.success }}>{mfaMsg}</div>}
                  <div style={{ display: "flex", gap: 10 }}>
                    <Btn size="sm" onClick={setupMfa}>เปิดตั้งค่า MFA</Btn>
                    <Btn size="sm" variant="danger" onClick={disableMfa}>ยกเลิก MFA</Btn>
                  </div>
                  {mfaQr && (
                    <div style={{ marginTop: 14, padding: 14, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                      <p style={{ fontSize: 13, marginBottom: 10 }}>1. สแกน QR Code ด้วย Google Authenticator</p>
                      <img src={mfaQr} alt="MFA QR" style={{ width: 150, height: 150 }} />
                      <p style={{ fontSize: 13, marginTop: 10 }}>2. กรอกรหัส 6 หลักที่ได้เพื่อยืนยัน</p>
                      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                        <Inp value={mfaCode} onChange={setMfaCode} placeholder="123456" />
                        <Btn onClick={verifyMfa}>ยืนยัน</Btn>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 8 }}>การแจ้งเตือน</div>
                  {["แจ้งเตือนเมื่อมีอนุมัติการลา", "แจ้งเตือนรับสลิปเงินเดือน", "แจ้งเตือน OT ที่อนุมัติ"].map(n => (
                    <label key={n} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", fontSize: 13, cursor: "pointer" }}>
                      <input type="checkbox" defaultChecked /> {n}
                    </label>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn onClick={handleSave}>บันทึก</Btn></div>
              </div>
            </Card>
          )}
        </div>
      </div>

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

          {/* ─── Formula Tester ─── */}
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

      {confirmDeleteComp && (
        <Modal title="ยืนยันการลบ Component" onClose={() => setConfirmDeleteComp(null)} width={400}>
          <div style={{ marginBottom: 20 }}>
            ลบ "{confirmDeleteComp.name}" ({confirmDeleteComp.code})?<br/><br/>
            Component นี้จะถูกปิดการใช้งาน (soft delete)<br/>
            ประวัติ Payroll ที่ผ่านมาจะไม่ได้รับผลกระทบ
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setConfirmDeleteComp(null)}>ยกเลิก</Btn>
            <Btn variant="danger" onClick={handleDeleteComp}>ยืนยันการลบ</Btn>
          </div>
        </Modal>
      )}

      {showEmpTypeModal && (
        <Modal
          title={editingEmpType ? `แก้ไขประเภทพนักงาน: ${empTypeForm.code}` : 'สร้างประเภทพนักงาน'}
          onClose={() => setShowEmpTypeModal(false)}
          width={650}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Inp label="รหัส (code) *" value={empTypeForm.code}
              onChange={v => setEmpTypeForm(p => ({ ...p, code: v.toLowerCase() }))}
              readOnly={!!editingEmpType}
              placeholder="เช่น fulltime, parttime" />
            <Inp label="ชื่อประเภท *" value={empTypeForm.name}
              onChange={v => setEmpTypeForm(p => ({ ...p, name: v }))}
              placeholder="เช่น พนักงานประจำ" />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted }}>สีสัญลักษณ์ (Color)</label>
              <input type="color" value={empTypeForm.color} onChange={e => setEmpTypeForm(p => ({ ...p, color: e.target.value }))}
                style={{ width: '100%', height: 38, border: `1px solid ${C.border}`, borderRadius: 8, padding: '2px 8px', cursor: 'pointer' }} />
            </div>
            <Inp label="ลำดับการแสดงผล" value={empTypeForm.sortOrder}
              onChange={v => setEmpTypeForm(p => ({ ...p, sortOrder: Number(v) }))} type="number" />
            
            <div style={{ gridColumn: '1/-1', fontWeight: 700, fontSize: 14, marginTop: 10, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>ตั้งค่าประกันสังคม (SSO)</div>
            
            <label style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              <input type="checkbox" checked={empTypeForm.ssoEnabled} onChange={e => setEmpTypeForm(p => ({ ...p, ssoEnabled: e.target.checked }))} />
              หักประกันสังคม (SSO Enabled)
            </label>
            
            {empTypeForm.ssoEnabled && (
              <>
                <Inp label="อัตราหักส่วนพนักงาน (เช่น 0.05 = 5%)" value={empTypeForm.ssoRate} onChange={v => setEmpTypeForm(p => ({ ...p, ssoRate: v }))} type="number" step="0.01" />
                <Inp label="ยอดหักสูงสุด (บาท)" value={empTypeForm.ssoCap} onChange={v => setEmpTypeForm(p => ({ ...p, ssoCap: v }))} type="number" />
              </>
            )}

            <div style={{ gridColumn: '1/-1', fontWeight: 700, fontSize: 14, marginTop: 10, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>ตั้งค่าภาษีเงินได้ (Tax)</div>
            
            <Sel label="รูปแบบการคิดภาษี" value={empTypeForm.taxMethod}
              onChange={v => setEmpTypeForm(p => ({ ...p, taxMethod: v }))}
              options={[
                { value: 'progressive', label: 'อัตราก้าวหน้า (ตามฐานรายได้)' },
                { value: 'wht', label: 'หัก ณ ที่จ่าย (Withholding Tax)' },
                { value: 'exempt', label: 'ยกเว้นภาษี (Exempt)' },
              ]} />
            
            {empTypeForm.taxMethod === 'wht' && (
              <Inp label="อัตราหัก ณ ที่จ่าย (เช่น 0.03 = 3%)" value={empTypeForm.taxFlatRate} onChange={v => setEmpTypeForm(p => ({ ...p, taxFlatRate: v }))} type="number" step="0.01" />
            )}
            
            <div style={{ gridColumn: '1/-1', fontWeight: 700, fontSize: 14, marginTop: 10, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>สิทธิประโยชน์อื่นๆ</div>
            
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={empTypeForm.otEligible} onChange={e => setEmpTypeForm(p => ({ ...p, otEligible: e.target.checked }))} /> มีสิทธิ์ได้ OT
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={empTypeForm.leaveEligible} onChange={e => setEmpTypeForm(p => ({ ...p, leaveEligible: e.target.checked }))} /> มีสิทธิ์ลา
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={empTypeForm.includeInPayroll} onChange={e => setEmpTypeForm(p => ({ ...p, includeInPayroll: e.target.checked }))} /> คำนวณเงินเดือนอัตโนมัติ
              </label>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
            <Btn variant="ghost" onClick={() => setShowEmpTypeModal(false)}>ยกเลิก</Btn>
            <Btn onClick={handleSaveEmpType}>บันทึกประเภทพนักงาน</Btn>
          </div>
        </Modal>
      )}

      {confirmDeleteEmpType && (
        <Modal title="ยืนยันการลบประเภทพนักงาน" onClose={() => setConfirmDeleteEmpType(null)} width={400}>
          <div style={{ marginBottom: 20 }}>
            ลบประเภท "{confirmDeleteEmpType.name}"?<br/><br/>
            คุณจะไม่สามารถลบได้หากยังมีพนักงานที่เชื่อมโยงกับประเภทนี้อยู่
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setConfirmDeleteEmpType(null)}>ยกเลิก</Btn>
            <Btn variant="danger" onClick={handleDeleteEmpType}>ยืนยันการลบ</Btn>
          </div>
        </Modal>
      )}

      {showHolidayModal && (
        <Modal title={editingHoliday ? "แก้ไขวันหยุด" : "เพิ่มวันหยุด"} onClose={() => setShowHolidayModal(false)} width={400}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Inp label="วันที่ *" type="date" value={holidayForm.date} onChange={v => setHolidayForm({ ...holidayForm, date: v })} />
            <Inp label="ชื่อวันหยุด *" value={holidayForm.name} onChange={v => setHolidayForm({ ...holidayForm, name: v })} placeholder="เช่น วันปีใหม่" />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
            <Btn variant="ghost" onClick={() => setShowHolidayModal(false)}>ยกเลิก</Btn>
            <Btn onClick={handleSaveHoliday}>บันทึก</Btn>
          </div>
        </Modal>
      )}

      {confirmDeleteHoliday && (
        <Modal title="ยืนยันการลบวันหยุด" onClose={() => setConfirmDeleteHoliday(null)} width={400}>
          <div style={{ marginBottom: 20 }}>
            คุณต้องการลบวันหยุด "{confirmDeleteHoliday.name}" ใช่หรือไม่?<br/><br/>
            การลบจะมีผลต่อการคำนวณวันลาในอนาคต แต่ไม่กระทบประวัติย้อนหลัง
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setConfirmDeleteHoliday(null)}>ยกเลิก</Btn>
            <Btn variant="danger" onClick={handleDeleteHoliday}>ยืนยันการลบ</Btn>
          </div>
        </Modal>
      )}

      {showProbationModal && (
        <Modal title="ตั้งค่านโยบายช่วงทดลองงาน" onClose={() => setShowProbationModal(false)} width={500}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Inp label="ระยะเวลาทดลองงาน (วัน)" type="number" value={probationForm.probationDays} onChange={v => setProbationForm(p => ({ ...p, probationDays: Number(v) }))} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={probationForm.allowLeaveDuring} onChange={e => setProbationForm(p => ({ ...p, allowLeaveDuring: e.target.checked }))} /> อนุญาตให้ลาช่วงทดลองงาน
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={probationForm.prorateAfterPassed} onChange={e => setProbationForm(p => ({ ...p, prorateAfterPassed: e.target.checked }))} /> คำนวณแบบ Pro-rata หลังผ่านโปร
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <Btn onClick={async () => {
                try {
                  const id = probationPolicy ? probationPolicy.id : 1;
                  await api.put(`/leave-policies/probation/${id}`, probationForm);
                  setProbationPolicy({ ...probationPolicy, ...probationForm });
                  setShowProbationModal(false);
                  showToast('บันทึกสำเร็จ', 'success');
                } catch (e) {
                  showToast('บันทึกไม่สำเร็จ', 'error');
                }
              }}>บันทึก</Btn>
            </div>
          </div>
        </Modal>
      )}

      {showPolicyModal && (
        <Modal title={`ตั้งค่านโยบายการลา: ${editingPolicy?.description}`} onClose={() => setShowPolicyModal(false)} width={700}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={policyForm.requiresCert} onChange={e => setPolicyForm(p => ({ ...p, requiresCert: e.target.checked }))} /> ต้องใช้ใบรับรองแพทย์
              </label>
              {policyForm.requiresCert && <Inp label="เมื่อลาติดต่อกัน (วัน) ขึ้นไป" type="number" value={policyForm.certThreshold || 0} onChange={v => setPolicyForm(p => ({ ...p, certThreshold: Number(v) }))} />}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={policyForm.proRata} onChange={e => setPolicyForm(p => ({ ...p, proRata: e.target.checked }))} /> คำนวณสิทธิ์ตามอายุงาน (Pro-rata)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={policyForm.isCarryForward} onChange={e => setPolicyForm(p => ({ ...p, isCarryForward: e.target.checked }))} /> อนุญาตให้ยกยอดสิทธิ์คงเหลือ
              </label>
              {policyForm.isCarryForward && <Inp label="จำกัดการยกยอดสูงสุด (วัน)" type="number" value={policyForm.maxCarryDays || 0} onChange={v => setPolicyForm(p => ({ ...p, maxCarryDays: Number(v) }))} />}
            </div>

            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 600 }}>ตารางเงื่อนไขอายุงาน (Entitlement Rules)</div>
                <Btn size="sm" variant="secondary" onClick={() => {
                  setPolicyForm(p => ({ ...p, rules: [...p.rules, { _tempId: crypto.randomUUID(), minYearsOfService: 0, maxYearsOfService: null, entitledDays: 0 }] }));
                }}>+ เพิ่มเงื่อนไข</Btn>
              </div>
              <Tbl
                columns={[
                  { key: 'min', label: 'อายุงานขั้นต่ำ (ปี)', render: (r, i) => <Inp type="number" step="0.1" value={r?.minYearsOfService || 0} onChange={v => handleRuleChange(i, 'minYearsOfService', Number(v))} /> },
                  { key: 'max', label: 'อายุงานสูงสุด (ปี)', render: (r, i) => <Inp type="number" step="0.1" value={r?.maxYearsOfService === null ? '' : (r?.maxYearsOfService || '')} placeholder="Infinity" onChange={v => handleRuleChange(i, 'maxYearsOfService', v === '' ? null : Number(v))} /> },
                  { key: 'days', label: 'สิทธิ์วันลา (วัน)', render: (r, i) => <Inp type="number" step="0.5" value={r?.entitledDays || 0} onChange={v => handleRuleChange(i, 'entitledDays', Number(v))} /> },
                  { key: 'del', label: '', render: (r, i) => <Btn size="sm" variant="danger" onClick={() => setPolicyForm(p => { const newRules = [...p.rules]; newRules.splice(i, 1); return { ...p, rules: newRules }; })}>ลบ</Btn> }
                ]}
                data={policyForm.rules}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <Btn onClick={async () => {
                try {
                  const sanitizedRules = policyForm.rules.map(r => {
                    const { _tempId, ...rest } = r;
                    return {
                      ...rest,
                      minYearsOfService: Number(rest.minYearsOfService),
                      maxYearsOfService: rest.maxYearsOfService === null ? null : Number(rest.maxYearsOfService),
                      entitledDays: Number(rest.entitledDays)
                    };
                  });
                  const payload = { ...policyForm, rules: sanitizedRules };
                  const res = await api.put(`/leave-policies/${editingPolicy.id}`, payload);
                  setLeavePolicies(lp => lp.map(x => x.id === res.data.id ? { ...x, ...payload } : x));
                  setShowPolicyModal(false);
                  showToast('บันทึกสำเร็จ', 'success');
                } catch (e) {
                  showToast('บันทึกไม่สำเร็จ', 'error');
                }
              }}>บันทึก</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
