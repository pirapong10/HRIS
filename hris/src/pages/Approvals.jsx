import React, { useState, useEffect } from 'react';
import { Card, Tbl, Btn, Badge, Modal, Inp, SectionHeader } from '../components/common/UI';
import { useToast } from '../components/common/Toast';
import api from '../utils/api';
import { C } from '../utils/theme';

export const Approvals = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState([]);
  
  // Modals state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  
  const [processingId, setProcessingId] = useState(null);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const res = await api.get('/approvals/pending');
      setApprovals(res.data || []);
    } catch (err) {
      showToast('ดึงข้อมูลคำขออนุมัติล้มเหลว', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleApprove = async (id) => {
    if (!window.confirm('ยืนยันการอนุมัติคำขอนี้ใช่หรือไม่?')) return;
    
    setProcessingId(id);
    try {
      await api.put(`/approvals/${id}/status`, { status: 'approved' });
      showToast('อนุมัติคำขอสำเร็จ', 'success');
      setApprovals(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      showToast(err.response?.data?.message || 'อนุมัติไม่สำเร็จ', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectClick = (req) => {
    setSelectedReq(req);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const submitReject = async () => {
    if (!rejectReason.trim()) {
      showToast('กรุณาระบุเหตุผลการไม่อนุมัติ', 'warning');
      return;
    }
    
    setProcessingId(selectedReq.id);
    try {
      await api.put(`/approvals/${selectedReq.id}/status`, { 
        status: 'rejected', 
        comment: rejectReason 
      });
      showToast('ปฏิเสธคำขอสำเร็จ', 'success');
      setApprovals(prev => prev.filter(a => a.id !== selectedReq.id));
      setShowRejectModal(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'ปฏิเสธคำขอไม่สำเร็จ', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const renderDetails = (r) => {
    if (r.type === 'LEAVE') {
      return (
        <div>
          <div style={{ fontWeight: 600 }}>{r.leaveType}</div>
          <div style={{ fontSize: 13, color: C.textMuted }}>
            {new Date(r.startDate).toLocaleDateString('th-TH')} - {new Date(r.endDate).toLocaleDateString('th-TH')} ({r.days} วัน)
          </div>
        </div>
      );
    } else if (r.type === 'OT') {
      return (
        <div>
          <div style={{ fontWeight: 600 }}>OT: {r.hours} ชั่วโมง</div>
          <div style={{ fontSize: 13, color: C.textMuted }}>
            วันที่: {new Date(r.date).toLocaleDateString('th-TH')}
          </div>
        </div>
      );
    } else if (r.type === 'CORRECTION') {
      return (
        <div>
          <div style={{ fontWeight: 600 }}>แก้ไขเวลาเข้า-ออกงาน</div>
          <div style={{ fontSize: 13, color: C.textMuted }}>
            วันที่: {new Date(r.date).toLocaleDateString('th-TH')} ({r.requestedTime})
          </div>
        </div>
      );
    }
    return r.details || '-';
  };

  const typeBadge = (type) => {
    switch (type) {
      case 'LEAVE': return <Badge label="การลา (LEAVE)" bg={C.blue + '22'} color={C.blue} />;
      case 'OT': return <Badge label="โอที (OT)" bg={C.orange + '22'} color={C.orange} />;
      case 'CORRECTION': return <Badge label="แก้เวลา" bg={C.purple + '22'} color={C.purple} />;
      default: return <Badge label={type} bg={C.bg} color={C.textMuted} />;
    }
  };

  return (
    <div>
      <SectionHeader title="การอนุมัติรวม (Centralized Approvals)" sub="จัดการคำขอลาและล่วงเวลาทั้งหมดในหน้าเดียว" />

      <Card>
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: C.textMuted }}>กำลังโหลดข้อมูล...</div>
        ) : approvals.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.textMuted }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>ไม่มีคำขอรออนุมัติ</div>
            <div style={{ fontSize: 13 }}>คุณเคลียร์งานทุกอย่างหมดแล้ว!</div>
          </div>
        ) : (
          <Tbl
            columns={[
              { key: 'requester', label: 'ผู้ยื่นคำขอ', render: r => (
                <div style={{ fontWeight: 600 }}>{r.requesterName || `พนักงาน #${r.requesterId}`}</div>
              )},
              { key: 'type', label: 'ประเภท', render: r => typeBadge(r.type) },
              { key: 'details', label: 'รายละเอียด', render: r => renderDetails(r) },
              { key: 'created', label: 'วันที่ยื่น', render: r => (
                <div style={{ fontSize: 13, color: C.textMuted }}>
                  {new Date(r.createdAt || new Date()).toLocaleString('th-TH')}
                </div>
              )},
              { key: 'actions', label: '', render: r => (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Btn 
                    size="sm" 
                    variant="danger" 
                    disabled={processingId === r.id}
                    onClick={() => handleRejectClick(r)}
                  >
                    ไม่อนุมัติ
                  </Btn>
                  <Btn 
                    size="sm" 
                    variant="primary" 
                    disabled={processingId === r.id}
                    style={{ background: C.success, borderColor: C.success }}
                    onClick={() => handleApprove(r.id)}
                  >
                    อนุมัติ
                  </Btn>
                </div>
              )}
            ]}
            data={approvals}
          />
        )}
      </Card>

      {showRejectModal && (
        <Modal title="ไม่อนุมัติคำขอ" onClose={() => setShowRejectModal(false)} width={450}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 14, color: C.textMuted }}>
              ระบุเหตุผลในการไม่อนุมัติคำขอของ <strong>{selectedReq?.requesterName}</strong>
            </div>
            <Inp 
              label="เหตุผล (จำเป็นต้องระบุ) *" 
              value={rejectReason} 
              onChange={setRejectReason} 
              placeholder="กรุณากรอกเหตุผล..."
              autoFocus
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <Btn variant="ghost" onClick={() => setShowRejectModal(false)}>ยกเลิก</Btn>
              <Btn variant="danger" onClick={submitReject} disabled={processingId === selectedReq?.id}>
                {processingId === selectedReq?.id ? 'กำลังดำเนินการ...' : 'ยืนยันไม่อนุมัติ'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
