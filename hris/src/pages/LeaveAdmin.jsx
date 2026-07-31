import React, { useState, useEffect, useCallback } from 'react';
import { SectionHeader, Card, Tbl, Btn, Inp, Badge, Modal, Tabs, Avatar } from '../components/common/UI';
import { useToast } from '../components/common/Toast';
import api from '../utils/api';
import { C } from '../utils/theme';

// ─── Helpers ───────────────────────────────────────────────────────────────
const Label = ({ children, required }) => (
  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>
    {children}{required && <span style={{ color: C.danger }}> *</span>}
  </label>
);

const Textarea = ({ value, onChange, placeholder, rows = 3 }) => (
  <textarea
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    style={{
      width: '100%', padding: '8px 12px', borderRadius: 8,
      border: `1px solid ${C.border}`, fontSize: 14, outline: 'none',
      resize: 'vertical', fontFamily: 'inherit', color: C.text,
      boxSizing: 'border-box'
    }}
  />
);

const EmptyState = ({ icon, text }) => (
  <div style={{ padding: '40px 20px', textAlign: 'center', color: C.textMuted }}>
    <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontSize: 13 }}>{text}</div>
  </div>
);

// ─── Leave Type Modal ──────────────────────────────────────────────────────
const LeaveTypeModal = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState(initial || {
    code: '', name: '', description: '',
    isCarryForward: false, maxCarryDays: 0
  });
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const isEdit = !!initial?.id;

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      showToast('กรุณากรอก Code และ ชื่อ', 'error');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } catch (e) {
      showToast(e.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'แก้ไขประเภทการลา' : 'เพิ่มประเภทการลาใหม่'} onClose={onClose} width={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <Label required>Code (ตัวพิมพ์เล็ก)</Label>
          <Inp value={form.code} onChange={v => setForm(p => ({ ...p, code: v }))}
            placeholder="เช่น annual, sick, personal" readOnly={isEdit} />
        </div>
        <div>
          <Label required>ชื่อประเภทการลา</Label>
          <Inp value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="เช่น ลาพักร้อน" />
        </div>
        <div>
          <Label>คำอธิบาย</Label>
          <Textarea value={form.description || ''} onChange={v => setForm(p => ({ ...p, description: v }))}
            placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)" rows={2} />
        </div>
        {/* Carry-Over Settings */}
        <div style={{ padding: '14px 16px', background: C.bg, borderRadius: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>การยกยอดวันลา (Carry-Over)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <input
              type="checkbox"
              id="isCarryForward"
              checked={!!form.isCarryForward}
              onChange={e => setForm(p => ({ ...p, isCarryForward: e.target.checked }))}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <label htmlFor="isCarryForward" style={{ fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
              อนุญาตให้ยกวันลาคงเหลือไปปีถัดไป
            </label>
          </div>
          {form.isCarryForward && (
            <div>
              <Label>สูงสุดที่ยกได้ (วัน) — ใส่ 0 = ไม่จำกัด</Label>
              <Inp
                type="number"
                value={String(form.maxCarryDays ?? 0)}
                onChange={v => setForm(p => ({ ...p, maxCarryDays: parseFloat(v) || 0 }))}
                placeholder="เช่น 5"
              />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <Btn variant="ghost" onClick={onClose} disabled={saving}>ยกเลิก</Btn>
          <Btn onClick={handleSave} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Btn>
        </div>
      </div>
    </Modal>
  );
};

// ─── Manual Adjustment Modal ───────────────────────────────────────────────
const AdjustModal = ({ account, onDone, onClose }) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed === 0) {
      showToast('กรุณาระบุจำนวนที่ถูกต้อง (ไม่ใช่ 0)', 'error');
      return;
    }
    if (!reason.trim()) {
      showToast('เหตุผลเป็นข้อมูลบังคับ', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post(`/admin/leave/leave-accounts/${account.id}/adjust`, {
        amount: parsed,
        reason: reason.trim()
      });
      showToast(`ปรับยอดสำเร็จ: ${parsed > 0 ? '+' : ''}${parsed} วัน`, 'success');
      onDone(res.data.newBalance);
    } catch (e) {
      showToast(e.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setSaving(false);
    }
  };

  const parsed = parseFloat(amount) || 0;
  const isPositive = parsed > 0;

  return (
    <Modal title="ปรับยอดคงเหลือ (Manual Adjustment)" onClose={onClose} width={440}>
      <div style={{ marginBottom: 16, padding: 12, background: C.bg, borderRadius: 8 }}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 2 }}>บัญชีวันลา</div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{account.leavePolicy?.leaveType}</div>
        <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
          ยอดปัจจุบัน: <strong style={{ color: C.brand }}>{account.cachedBalance} วัน</strong>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <Label required>จำนวนวัน (+ เพิ่ม / - ตัด)</Label>
          <Inp type="number" value={amount} onChange={setAmount} placeholder="เช่น 3 หรือ -1.5" />
          {parsed !== 0 && (
            <div style={{ marginTop: 6, fontSize: 12, color: isPositive ? C.success : C.danger, fontWeight: 600 }}>
              {isPositive ? `▲ เพิ่ม ${parsed} วัน → ยอดใหม่: ${(account.cachedBalance + parsed).toFixed(2)} วัน`
                : `▼ ตัด ${Math.abs(parsed)} วัน → ยอดใหม่: ${(account.cachedBalance + parsed).toFixed(2)} วัน`}
            </div>
          )}
        </div>
        <div>
          <Label required>เหตุผล (บังคับ — บันทึกใน Audit Log)</Label>
          <Textarea value={reason} onChange={setReason} placeholder="ระบุเหตุผลการปรับยอดให้ชัดเจน เช่น ชดเชยวันลาที่บันทึกผิด" />
        </div>
        <div style={{ padding: '10px 12px', background: '#FDF6B2', borderRadius: 8, fontSize: 12, color: '#92400E' }}>
          ⚠️ การปรับยอดทุกครั้งจะถูกบันทึกใน Enterprise Audit Log พร้อม Cryptographic Hash
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose} disabled={saving}>ยกเลิก</Btn>
          <Btn variant={parsed < 0 ? 'danger' : 'primary'} onClick={handleSubmit} disabled={saving}>
            {saving ? 'กำลังบันทึก...' : 'ยืนยันการปรับยอด'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};

// ─── Employee Leave Accounts Panel ────────────────────────────────────────
const EmployeeLeavePanel = ({ employee, policies, onClose }) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [assignPolicyId, setAssignPolicyId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const { showToast } = useToast();

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/leave/employees/${employee.id}/leave-accounts`);
      setAccounts(Array.isArray(res.data) ? res.data : []);
    } catch {
      showToast('โหลดบัญชีวันลาไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  }, [employee.id]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleAssign = async () => {
    if (!assignPolicyId) { showToast('กรุณาเลือกนโยบายการลา', 'error'); return; }
    setAssigning(true);
    try {
      const res = await api.post(`/admin/leave/employees/${employee.id}/leave-accounts`, {
        policyId: assignPolicyId
      });
      setAccounts(prev => {
        const exists = prev.find(a => a.id === res.data.id);
        return exists ? prev.map(a => a.id === res.data.id ? res.data : a) : [res.data, ...prev];
      });
      setAssignPolicyId('');
      showToast('กำหนดนโยบายสำเร็จ', 'success');
    } catch (e) {
      showToast(e.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleRevoke = async (accountId) => {
    if (!window.confirm('ยืนยันการยกเลิกบัญชีวันลานี้?')) return;
    try {
      await api.put(`/admin/leave/leave-accounts/${accountId}/revoke`);
      setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, isActive: false } : a));
      showToast('ยกเลิกบัญชีสำเร็จ', 'success');
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error');
    }
  };

  const activeAccounts = accounts.filter(a => a.isActive);
  const inactiveAccounts = accounts.filter(a => !a.isActive);

  return (
    <Modal title={`บัญชีวันลา — ${employee.name}`} onClose={onClose} width={680}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Assign new policy */}
        <div style={{ padding: 16, background: C.bg, borderRadius: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>กำหนดนโยบายการลาเพิ่มเติม</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={assignPolicyId}
              onChange={e => setAssignPolicyId(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
            >
              <option value="">-- เลือกนโยบายการลา --</option>
              {policies.map(p => (
                <option key={p.id} value={p.id}>{p.leaveType}</option>
              ))}
            </select>
            <Btn onClick={handleAssign} disabled={assigning || !assignPolicyId}>
              {assigning ? 'กำลังกำหนด...' : '+ กำหนด'}
            </Btn>
          </div>
        </div>

        {/* Active accounts */}
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: C.text }}>
            บัญชีวันลาที่ใช้งานอยู่ ({activeAccounts.length})
          </div>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: C.textMuted }}>กำลังโหลด...</div>
          ) : activeAccounts.length === 0 ? (
            <EmptyState icon="📭" text="ยังไม่มีบัญชีวันลาที่ใช้งานอยู่" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeAccounts.map(acc => (
                <div key={acc.id} style={{
                  padding: '14px 16px', borderRadius: 10,
                  border: `1px solid ${C.border}`, background: C.surface,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {acc.leaveTypeDef?.name || acc.leavePolicy?.leaveType}
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                      นโยบาย: {acc.leavePolicy?.leaveType}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: C.brand }}>{acc.cachedBalance}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>วันคงเหลือ</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Btn size="sm" variant="secondary" onClick={() => setAdjustTarget(acc)}>ปรับยอด</Btn>
                      <Btn size="sm" variant="ghost" onClick={() => handleRevoke(acc.id)}>ยกเลิก</Btn>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inactive accounts */}
        {inactiveAccounts.length > 0 && (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: C.textMuted }}>
              ยกเลิกแล้ว ({inactiveAccounts.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {inactiveAccounts.map(acc => (
                <div key={acc.id} style={{
                  padding: '10px 14px', borderRadius: 8, background: C.bg,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.65
                }}>
                  <span style={{ fontSize: 13 }}>{acc.leavePolicy?.leaveType}</span>
                  <Badge label="ยกเลิกแล้ว" bg={C.dangerLight} color={C.danger} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {adjustTarget && (
        <AdjustModal
          account={adjustTarget}
          onDone={(newBalance) => {
            setAccounts(prev => prev.map(a => a.id === adjustTarget.id
              ? { ...a, cachedBalance: newBalance } : a));
            setAdjustTarget(null);
          }}
          onClose={() => setAdjustTarget(null)}
        />
      )}
    </Modal>
  );
};

// ─── EOY Tab Component ────────────────────────────────────────────────────
const EoyTab = () => {
  const { showToast } = useToast();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);

  const handleTrigger = async () => {
    if (!window.confirm(`ยืนยัน: รัน End-of-Year Carry-Over สำหรับปี ${year}?\n\nการกระทำนี้จะสร้าง Transaction FORFEIT และ CARRY_OVER_ADD สำหรับพนักงานทุกคน`)) return;
    setRunning(true);
    setResults(null);
    try {
      const res = await api.post('/admin/leave/trigger-end-of-year', { year: parseInt(year, 10) });
      setResults(res.data.results);
      showToast(`ประมวลผลสำเร็จ ${res.data.count} บัญชี`, 'success');
    } catch (e) {
      showToast(e.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setRunning(false);
    }
  };

  const totalCarry = results?.reduce((s, r) => s + r.carryOverAmount, 0) || 0;
  const totalForfeit = results?.reduce((s, r) => s + r.forfeitAmount, 0) || 0;
  const affectedCount = results?.filter(r => r.carryOverAmount > 0 || r.forfeitAmount > 0).length || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>ประมวลผลสิ้นปี (End-of-Year Carry-Over)</div>
        <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>
          รันการยกยอดวันลาคงเหลือไปปีถัดไป และบันทึกวันลาที่หมดอายุ (FORFEIT) สำหรับพนักงานทุกคน
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 160 }}>
            <Inp label="ปี (ค.ศ.)" type="number" value={year} onChange={setYear} />
          </div>
          <Btn variant="danger" onClick={handleTrigger} disabled={running}>
            {running ? '⏳ กำลังประมวลผล...' : '🔄 รัน Carry-Over'}
          </Btn>
        </div>

        <div style={{ padding: '12px 16px', background: '#FDF6B2', borderRadius: 8, fontSize: 12, color: '#92400E' }}>
          ⚠️ Cron Job จะรันอัตโนมัติทุกวันที่ 31 ธ.ค. เวลา 23:59 น. (Asia/Bangkok) — ปุ่มนี้ใช้สำหรับทดสอบหรือ Recovery เท่านั้น
        </div>
      </Card>

      {results && (
        <Card style={{ padding: 0 }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.brand }}>{totalCarry}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>วันที่ยกยอด</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.danger }}>{totalForfeit}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>วันที่หมดอายุ</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.success }}>{affectedCount}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>บัญชีที่มีผลกระทบ</div>
            </div>
          </div>
          <Tbl
            columns={[
              { key: 'empId', label: 'EmpID', render: r => <code style={{ fontSize: 12 }}>{r.empId}</code> },
              { key: 'leaveType', label: 'ประเภทการลา', render: r => <span style={{ fontWeight: 600 }}>{r.leaveType}</span> },
              { key: 'remainingBalance', label: 'ยอดคงเหลือ', render: r => `${r.remainingBalance} วัน` },
              { key: 'carryOverAmount', label: 'ยกยอด', render: r => r.carryOverAmount > 0
                ? <span style={{ color: C.brand, fontWeight: 600 }}>+{r.carryOverAmount} วัน</span>
                : <span style={{ color: C.textMuted }}>-</span> },
              { key: 'forfeitAmount', label: 'หมดอายุ', render: r => r.forfeitAmount > 0
                ? <span style={{ color: C.danger, fontWeight: 600 }}>{r.forfeitAmount} วัน</span>
                : <span style={{ color: C.textMuted }}>-</span> },
            ]}
            data={results}
            emptyMsg="ไม่มีข้อมูล"
          />
        </Card>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────
export const LeaveAdmin = () => {
  const { showToast } = useToast();
  const [tab, setTab] = useState('leaveTypes');

  // Leave Types
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [typeModal, setTypeModal] = useState(null); // null | 'new' | {id,...}

  // Employees & Policies
  const [employees, setEmployees] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loadingEmps, setLoadingEmps] = useState(false);
  const [searchEmp, setSearchEmp] = useState('');
  const [selectedEmp, setSelectedEmp] = useState(null);

  // ── Fetch Leave Types ──
  const fetchLeaveTypes = useCallback(async () => {
    setLoadingTypes(true);
    try {
      const res = await api.get('/admin/leave/leave-types');
      setLeaveTypes(Array.isArray(res.data) ? res.data : []);
    } catch {
      showToast('โหลดประเภทการลาไม่สำเร็จ', 'error');
    } finally {
      setLoadingTypes(false);
    }
  }, []);

  // ── Fetch Employees & Policies (lazy on tab switch) ──
  const fetchEmpsAndPolicies = useCallback(async () => {
    setLoadingEmps(true);
    try {
      const [empRes, polRes] = await Promise.all([
        api.get('/employees?limit=500'),
        api.get('/leave-policies')
      ]);
      setEmployees(Array.isArray(empRes.data?.data) ? empRes.data.data : Array.isArray(empRes.data) ? empRes.data : []);
      setPolicies(Array.isArray(polRes.data) ? polRes.data : []);
    } catch {
      showToast('โหลดข้อมูลพนักงานไม่สำเร็จ', 'error');
    } finally {
      setLoadingEmps(false);
    }
  }, []);

  useEffect(() => { fetchLeaveTypes(); }, [fetchLeaveTypes]);
  useEffect(() => {
    if (tab === 'accounts') fetchEmpsAndPolicies();
  }, [tab, fetchEmpsAndPolicies]);

  // ── Leave Type CRUD ──
  const handleSaveType = async (form) => {
    if (form.id) {
      const res = await api.put(`/admin/leave/leave-types/${form.id}`, form);
      setLeaveTypes(prev => prev.map(t => t.id === form.id ? res.data : t));
      showToast('แก้ไขสำเร็จ', 'success');
    } else {
      const res = await api.post('/admin/leave/leave-types', form);
      setLeaveTypes(prev => [res.data, ...prev]);
      showToast('เพิ่มประเภทการลาสำเร็จ', 'success');
    }
    setTypeModal(null);
  };

  const handleDeleteType = async (id) => {
    if (!window.confirm('ยืนยันการลบประเภทการลานี้?')) return;
    try {
      await api.delete(`/admin/leave/leave-types/${id}`);
      setLeaveTypes(prev => prev.filter(t => t.id !== id));
      showToast('ลบสำเร็จ', 'success');
    } catch (e) {
      showToast(e.response?.data?.message || 'ไม่สามารถลบได้', 'error');
    }
  };

  const filteredEmps = employees.filter(e =>
    e.name?.toLowerCase().includes(searchEmp.toLowerCase()) ||
    e.empCode?.toLowerCase().includes(searchEmp.toLowerCase())
  );

  return (
    <div style={{ padding: 28 }}>
      <SectionHeader
        title="จัดการการลา (HR Admin)"
        sub="กำหนดประเภทการลา, มอบหมายนโยบายให้พนักงาน, และปรับยอดวันลา"
      />

      <Tabs
        tabs={[
          { id: 'leaveTypes', label: '📋 ประเภทการลา' },
          { id: 'accounts', label: '👤 บัญชีวันลาพนักงาน' },
          { id: 'eoy', label: '📅 สิ้นปี (Carry-Over)' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ── Tab 1: Leave Type Catalog ── */}
      {tab === 'leaveTypes' && (
        <Card style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>ประเภทการลาทั้งหมด</div>
            <Btn onClick={() => setTypeModal('new')}>+ เพิ่มประเภทการลา</Btn>
          </div>

          {loadingTypes ? (
            <EmptyState icon="⏳" text="กำลังโหลด..." />
          ) : leaveTypes.length === 0 ? (
            <EmptyState icon="📋" text="ยังไม่มีประเภทการลา กดปุ่มเพิ่มเพื่อเริ่มต้น" />
          ) : (
            <Tbl
              columns={[
                { key: 'code', label: 'Code', render: r => <code style={{ background: C.bg, padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{r.code}</code> },
                { key: 'name', label: 'ชื่อ', render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
                { key: 'description', label: 'คำอธิบาย', render: r => <span style={{ color: C.textMuted }}>{r.description || '-'}</span> },
                { key: 'isActive', label: 'สถานะ', render: r => r.isActive
                  ? <Badge label="ใช้งาน" bg={C.successLight} color={C.success} />
                  : <Badge label="ปิดใช้งาน" bg={C.dangerLight} color={C.danger} /> },
                { key: 'actions', label: '', render: r => (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn size="sm" variant="ghost" onClick={() => setTypeModal(r)}>แก้ไข</Btn>
                    <Btn size="sm" variant="danger" onClick={() => handleDeleteType(r.id)}>ลบ</Btn>
                  </div>
                )},
              ]}
              data={leaveTypes}
            />
          )}
        </Card>
      )}

      {/* ── Tab 2: Employee Leave Accounts ── */}
      {tab === 'accounts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>เลือกพนักงาน</div>
            <Inp
              placeholder="ค้นหาชื่อหรือรหัสพนักงาน..."
              value={searchEmp}
              onChange={setSearchEmp}
            />
          </Card>

          <Card style={{ padding: 0 }}>
            {loadingEmps ? (
              <EmptyState icon="⏳" text="กำลังโหลด..." />
            ) : (
              <Tbl
                columns={[
                  { key: 'emp', label: 'พนักงาน', render: r => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={r.name} size={32} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>{r.empCode}</div>
                      </div>
                    </div>
                  )},
                  { key: 'dept', label: 'แผนก', render: r => r.department?.name || '-' },
                  { key: 'type', label: 'ประเภท', render: r => r.employeeType?.name
                    ? <Badge label={r.employeeType.name} bg={C.brandLight} color={C.brand} />
                    : <Badge label={r.type || '-'} bg={C.bg} color={C.textMuted} /> },
                  { key: 'actions', label: '', render: r => (
                    <Btn size="sm" onClick={() => setSelectedEmp(r)}>จัดการบัญชีวันลา →</Btn>
                  )},
                ]}
                data={filteredEmps}
                emptyMsg="ไม่พบพนักงานที่ค้นหา"
              />
            )}
          </Card>
        </div>
      )}

      {/* ── Tab 3: End-of-Year Carry-Over ── */}
      {tab === 'eoy' && <EoyTab />}

      {/* ── Leave Type Modal ── */}
      {typeModal && (
        <LeaveTypeModal
          initial={typeModal === 'new' ? null : typeModal}
          onSave={handleSaveType}
          onClose={() => setTypeModal(null)}
        />
      )}

      {/* ── Employee Leave Account Panel ── */}
      {selectedEmp && (
        <EmployeeLeavePanel
          employee={selectedEmp}
          policies={policies}
          onClose={() => setSelectedEmp(null)}
        />
      )}
    </div>
  );
};
