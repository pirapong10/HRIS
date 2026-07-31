import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, Btn, Tbl, Badge, Modal, Inp } from '../components/common/UI';
import { useToast } from '../components/common/Toast';

const LeaveApproval = () => {
  const { showToast } = useToast();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/leaves/approvals');
      setApprovals(res.data || []);
    } catch (err) {
      showToast('ไม่สามารถดึงข้อมูลรายการรออนุมัติได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleAction = async (action) => {
    if (!selectedReq) return;
    setProcessing(true);
    try {
      await api.put(`/leaves/approvals/${selectedReq.id}`, { action, comment });
      showToast(`ทำรายการ ${action} สำเร็จ`, 'success');
      setSelectedReq(null);
      setComment('');
      fetchApprovals();
    } catch (err) {
      showToast(err.response?.data?.message || 'ทำรายการไม่สำเร็จ', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Card style={{ padding: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>อนุมัติการลา (Leave Approvals)</h2>
        <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 24 }}>จัดการรายการขออนุมัติการลาของพนักงานในความดูแลของคุณ</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>กำลังโหลด...</div>
        ) : approvals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: '#F9FAFB', borderRadius: 8, color: '#6B7280' }}>
            ไม่มีรายการรออนุมัติ
          </div>
        ) : (
          <Tbl 
            columns={[
              { key: 'name', label: 'ผู้ขออนุมัติ', render: r => <div style={{ fontWeight: 600 }}>{r.requester?.name || '-'}</div> },
              { key: 'type', label: 'ประเภทการลา', render: r => <span style={{ textTransform: 'capitalize' }}>{r.leaveDetails?.type || '-'}</span> },
              { key: 'dates', label: 'วันที่ลา', render: r => r.leaveDetails ? `${r.leaveDetails.startDate} ถึง ${r.leaveDetails.endDate}` : '-' },
              { key: 'days', label: 'จำนวน (วัน)', render: r => <Badge label={`${r.leaveDetails?.days || 0} วัน`} bg="#DBEAFE" color="#2563EB" /> },
              { key: 'reason', label: 'เหตุผล', render: r => <span style={{ color: '#4B5563', fontSize: 13 }}>{r.leaveDetails?.reason || '-'}</span> },
              { key: 'action', label: '', render: r => (
                <Btn size="sm" variant="secondary" onClick={() => setSelectedReq(r)}>
                  พิจารณา
                </Btn>
              ) }
            ]}
            data={approvals}
          />
        )}
      </Card>

      {selectedReq && (
        <Modal title="พิจารณาอนุมัติการลา" onClose={() => setSelectedReq(null)} width={500}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 8, display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 0', fontSize: 14 }}>
              <div style={{ color: '#6B7280', fontWeight: 600 }}>ผู้ขออนุมัติ:</div>
              <div style={{ fontWeight: 700 }}>{selectedReq.requester?.name}</div>
              
              <div style={{ color: '#6B7280', fontWeight: 600 }}>ประเภทการลา:</div>
              <div style={{ textTransform: 'capitalize' }}>{selectedReq.leaveDetails?.type}</div>
              
              <div style={{ color: '#6B7280', fontWeight: 600 }}>ระยะเวลา:</div>
              <div>{selectedReq.leaveDetails?.startDate} ถึง {selectedReq.leaveDetails?.endDate}</div>
              
              <div style={{ color: '#6B7280', fontWeight: 600 }}>จำนวนวัน:</div>
              <div style={{ fontWeight: 700, color: '#2563EB' }}>{selectedReq.leaveDetails?.days} วัน</div>
              
              <div style={{ color: '#6B7280', fontWeight: 600 }}>เหตุผล:</div>
              <div>{selectedReq.leaveDetails?.reason || '-'}</div>

              {selectedReq.leaveDetails?.medicalCertPath && (
                <>
                  <div style={{ color: '#6B7280', fontWeight: 600 }}>ใบรับรองแพทย์:</div>
                  <div>
                    <a href={`http://localhost:3000${selectedReq.leaveDetails.medicalCertPath}`} target="_blank" rel="noreferrer" style={{ color: '#2563EB', textDecoration: 'underline' }}>
                      ดูใบรับรองแพทย์
                    </a>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563' }}>หมายเหตุ (Approver Comment)</label>
              <textarea 
                rows={3} 
                value={comment}
                onChange={e => setComment(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 8, outline: 'none' }}
                placeholder="ระบุหมายเหตุ (ถ้ามี)..."
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <Btn 
                variant="danger" 
                style={{ flex: 1 }} 
                onClick={() => handleAction('REJECTED')}
                disabled={processing}
              >
                ไม่อนุมัติ (Reject)
              </Btn>
              <Btn 
                style={{ flex: 1, background: '#10B981', color: '#fff', border: 'none' }} 
                onClick={() => handleAction('APPROVED')}
                disabled={processing}
              >
                อนุมัติ (Approve)
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default LeaveApproval;
