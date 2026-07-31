import React, { useState, useEffect } from 'react';
import { Card, Btn, Inp, Badge, Tbl, Modal, SectionHeader } from '../components/common/UI';
import { useToast } from '../components/common/Toast';
import api from '../utils/api';
import { C } from '../utils/theme';

export const OTRequest = () => {
  const { showToast } = useToast();
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    reason: ''
  });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ot/my-requests');
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showToast('ไม่สามารถโหลดข้อมูลคำขอ OT ได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const calculateHours = (start, end) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    
    let hours = endH - startH + (endM - startM) / 60;
    
    // Handle cross-midnight (e.g., 22:00 to 02:00)
    if (hours < 0) {
      hours += 24;
    }
    
    return Number(hours.toFixed(2));
  };

  const handleSubmit = async () => {
    if (!form.date || !form.startTime || !form.endTime) {
      showToast('กรุณากรอกวันที่ และเวลาให้ครบถ้วน', 'error');
      return;
    }

    const calculatedHours = calculateHours(form.startTime, form.endTime);
    if (calculatedHours <= 0) {
      showToast('เวลาเริ่มต้นและสิ้นสุดไม่ถูกต้อง', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        hours: calculatedHours,
        reason: form.reason || '-'
      };
      
      const res = await api.post('/ot/request', payload);
      
      showToast('ส่งคำขอทำล่วงเวลาเรียบร้อย', 'success');
      setShowModal(false);
      setForm({ date: '', startTime: '', endTime: '', reason: '' });
      
      // Update local state without full reload
      setRequests(prev => [res.data, ...prev]);
    } catch (err) {
      showToast(err.response?.data?.message || 'เกิดข้อผิดพลาดในการส่งคำขอ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status) => {
    switch (status) {
      case 'pending_manager':
      case 'pending_hr':
      case 'pending':
        return <Badge label="รออนุมัติ" bg={C.warningLight} color={C.warning} />;
      case 'approved':
        return <Badge label="อนุมัติ" bg={C.successLight} color={C.success} />;
      case 'rejected':
        return <Badge label="ไม่อนุมัติ" bg={C.dangerLight} color={C.danger} />;
      default:
        return <Badge label={status} bg={C.bg} color={C.text} />;
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <SectionHeader title="คำขอทำล่วงเวลา (OT)" subtitle="ประวัติและการยื่นคำขอทำ OT ของคุณ" />
        <Btn onClick={() => setShowModal(true)}>+ ยื่นคำขอ OT</Btn>
      </div>

      <Card>
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center' }}>กำลังโหลดข้อมูล...</div>
        ) : (
          <Tbl
            columns={[
              { 
                key: 'date', 
                label: 'วันที่', 
                render: r => new Date(r.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
              },
              { 
                key: 'time', 
                label: 'เวลา (เริ่ม-สิ้นสุด)', 
                render: r => r.startTime && r.endTime ? `${r.startTime} - ${r.endTime}` : '-'
              },
              { 
                key: 'hours', 
                label: 'จำนวนชั่วโมง', 
                render: r => <span style={{ fontWeight: 600 }}>{r.requestedHours || r.hours} ชม.</span> 
              },
              { 
                key: 'reason', 
                label: 'เหตุผล', 
                render: r => r.reason 
              },
              { 
                key: 'status', 
                label: 'สถานะ', 
                render: r => statusBadge(r.status) 
              },
              { 
                key: 'approver', 
                label: 'ผู้อนุมัติ/หมายเหตุ', 
                render: r => <div style={{ fontSize: 12, color: C.textMuted }}>{r.approver || '-'}<br/>{r.rejectReason || ''}</div>
              },
            ]}
            data={requests}
            emptyMsg="ยังไม่มีประวัติคำขอทำล่วงเวลา"
          />
        )}
      </Card>

      {/* Request Modal */}
      {showModal && (
        <Modal title="ยื่นคำขอทำล่วงเวลา (OT)" onClose={() => setShowModal(false)} width={450}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>วันที่ทำล่วงเวลา <span style={{color: C.danger}}>*</span></label>
              <Inp 
                type="date" 
                value={form.date} 
                onChange={v => setForm({ ...form, date: v })} 
              />
            </div>
            
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>เวลาเริ่มต้น <span style={{color: C.danger}}>*</span></label>
                <Inp 
                  type="time" 
                  value={form.startTime} 
                  onChange={v => setForm({ ...form, startTime: v })} 
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>เวลาสิ้นสุด <span style={{color: C.danger}}>*</span></label>
                <Inp 
                  type="time" 
                  value={form.endTime} 
                  onChange={v => setForm({ ...form, endTime: v })} 
                />
              </div>
            </div>

            <div style={{ padding: 12, backgroundColor: C.bg, borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>จำนวนชั่วโมงรวม:</span>
              <span style={{ fontWeight: 700, color: C.brand }}>
                {calculateHours(form.startTime, form.endTime)} ชั่วโมง
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>เหตุผล / รายละเอียดงาน</label>
              <textarea
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: `1px solid ${C.border}`,
                  fontSize: 14,
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: 80
                }}
                placeholder="อธิบายเหตุผลหรือระบุงานที่ทำ"
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <Btn variant="outline" onClick={() => setShowModal(false)} disabled={submitting}>ยกเลิก</Btn>
              <Btn onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'กำลังส่งข้อมูล...' : 'ส่งคำขอ OT'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
