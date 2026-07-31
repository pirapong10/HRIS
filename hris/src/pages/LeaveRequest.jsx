import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, Btn, Inp, Sel, Tbl, Badge } from '../components/common/UI';
import { useToast } from '../components/common/Toast';

const statusBadge = (status) => {
  switch (status) {
    case 'pending_manager': return <Badge label="รออนุมัติ (Manager)" bg="#FCD34D18" color="#F59E0B" />;
    case 'pending_hr': return <Badge label="รออนุมัติ (HR)" bg="#FCD34D18" color="#F59E0B" />;
    case 'approved': return <Badge label="อนุมัติแล้ว" bg="#10B98118" color="#10B981" />;
    case 'rejected': return <Badge label="ไม่อนุมัติ" bg="#EF444418" color="#EF4444" />;
    case 'cancelled': return <Badge label="ยกเลิก" bg="#9CA3AF18" color="#6B7280" />;
    default: return <Badge label={status} />;
  }
};

const LeaveRequest = () => {
  const { showToast } = useToast();
  const [leaves, setLeaves] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    type: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
    medicalCert: null
  });

  const [days, setDays] = useState(0);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await api.get('/leaves/my-requests');
      setLeaves(res.data || []);
    } catch (err) {
      showToast('ไม่สามารถดึงข้อมูลการลาได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveBalance = async () => {
    try {
      const res = await api.get('/leaves/balance');
      setLeaveBalance(res.data || []);
    } catch (err) {
      console.error('Failed to fetch leave balance', err);
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchLeaveBalance();
  }, []);

  useEffect(() => {
    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (end >= start) {
        // Calculate days inclusive (simple days difference)
        // Note: For a real enterprise system, weekend exclusion & public holidays should be checked in backend.
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setDays(diffDays);
      } else {
        setDays(0);
      }
    } else {
      setDays(0);
    }
  }, [form.startDate, form.endDate]);

  const showMedCert = form.type === 'sick' && days >= 2;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (days <= 0) {
      showToast('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น', 'error');
      return;
    }
    if (showMedCert && !form.medicalCert) {
      showToast('กรุณาแนบใบรับรองแพทย์สำหรับการลาป่วยตั้งแต่ 2 วันขึ้นไป', 'error');
      return;
    }

    setSubmitting(true);
    try {
      // Create FormData if uploading file, otherwise JSON
      const formData = new FormData();
      formData.append('type', form.type);
      formData.append('startDate', form.startDate);
      formData.append('endDate', form.endDate);
      formData.append('days', days.toString());
      if (form.reason) formData.append('reason', form.reason);
      if (showMedCert && form.medicalCert) {
        formData.append('medicalCert', form.medicalCert);
      }

      await api.post('/leaves', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast('ส่งคำร้องขอลาสำเร็จ', 'success');
      setForm({ type: 'annual', startDate: '', endDate: '', reason: '', medicalCert: null });
      fetchLeaves();
    } catch (err) {
      showToast(err.response?.data?.message || 'ส่งคำร้องไม่สำเร็จ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {leaveBalance.length > 0 && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {leaveBalance.map(b => (
            <Card key={b.id} style={{ padding: '16px 20px', minWidth: 200, borderLeft: `4px solid ${b.remaining > 0 ? '#10B981' : '#EF4444'}` }}>
              <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>{b.leaveType} Leave</div>
              <div style={{ fontSize: 28, fontWeight: 700, margin: '4px 0' }}>{b.remaining} <span style={{ fontSize: 14, fontWeight: 400, color: '#6B7280' }}>วัน (คงเหลือ)</span></div>
              <div style={{ fontSize: 12, color: '#4B5563' }}>ใช้ไป: {b.used} / สิทธิ์รวม: {b.entitled} (รออนุมัติ: {b.pending})</div>
            </Card>
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        <div>
          <Card style={{ padding: 24, position: 'sticky', top: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>ยื่นคำร้องขอลา (New Leave)</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Sel
              label="ประเภทการลา (Leave Type) *"
              value={form.type}
              onChange={v => setForm({ ...form, type: v })}
              options={[
                { value: 'annual', label: 'ลาพักร้อน (Annual Leave)' },
                { value: 'sick', label: 'ลาป่วย (Sick Leave)' },
                { value: 'personal', label: 'ลากิจ (Personal Leave)' },
                { value: 'maternity', label: 'ลาคลอด (Maternity Leave)' }
              ]}
              required
            />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Inp 
                label="วันที่เริ่มต้น *" 
                type="date" 
                value={form.startDate} 
                onChange={v => setForm({ ...form, startDate: v })} 
                required 
              />
              <Inp 
                label="วันที่สิ้นสุด *" 
                type="date" 
                value={form.endDate} 
                onChange={v => setForm({ ...form, endDate: v })} 
                required 
              />
            </div>

            <div style={{ padding: 12, background: '#F3F4F6', borderRadius: 8, textAlign: 'center', fontWeight: 600 }}>
              รวมจำนวนวัน: <span style={{ color: days > 0 ? '#10B981' : '#6B7280', fontSize: 18, marginLeft: 8 }}>{days} วัน</span>
            </div>

            {showMedCert && (
              <div style={{ padding: 12, background: '#FEF2F2', borderRadius: 8, border: '1px dashed #F87171' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#B91C1C', marginBottom: 8, display: 'block' }}>
                  แนบใบรับรองแพทย์ (Medical Certificate) *
                </label>
                <input 
                  type="file" 
                  accept="image/*,.pdf"
                  onChange={e => setForm({ ...form, medicalCert: e.target.files[0] })}
                  style={{ width: '100%', fontSize: 13 }}
                  required
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563' }}>เหตุผลการลา</label>
              <textarea 
                rows={3} 
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 8, outline: 'none' }}
                placeholder="ระบุเหตุผล (ไม่บังคับ)"
              />
            </div>

            <Btn type="submit" disabled={submitting || days <= 0}>
              {submitting ? 'กำลังบันทึก...' : 'ส่งคำร้อง'}
            </Btn>
          </form>
        </Card>
      </div>

      <div>
        <Card style={{ padding: 24, minHeight: '100%' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>ประวัติการลา (My Leave Requests)</h2>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#6B7280' }}>กำลังโหลด...</div>
          ) : leaves.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6B7280', background: '#F9FAFB', borderRadius: 8 }}>
              ไม่พบประวัติการลา
            </div>
          ) : (
            <Tbl 
              columns={[
                { key: 'type', label: 'ประเภท', render: r => <span style={{ textTransform: 'capitalize' }}>{r.type}</span> },
                { key: 'dates', label: 'วันที่ลา', render: r => `${r.startDate} ถึง ${r.endDate}` },
                { key: 'days', label: 'จำนวน (วัน)', render: r => <span style={{ fontWeight: 600 }}>{r.days}</span> },
                { key: 'status', label: 'สถานะ', render: r => statusBadge(r.status) },
                { key: 'approver', label: 'ผู้อนุมัติ', render: r => r.approver || '-' },
              ]}
              data={leaves}
            />
          )}
        </Card>
      </div>
      </div>
    </div>
  );
};

export default LeaveRequest;
