import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { usePermission } from '../hooks/usePermission';
import { useAttendance } from '../hooks/useAttendance';
import { useLeaves } from '../hooks/useLeaves';
import { SectionHeader, Card, Tabs, Tbl, Avatar, Badge, statusBadge, Btn, Inp, Sel, Modal, StatCard } from '../components/common/UI';
import { useToast } from '../components/common/Toast';
import api from '../utils/api';
import { C } from '../utils/theme';
import { fmtB, getShift, countWorkingDays, detectAttendanceStatus, isHolidayOrWeekend, calcOTPay, getWeeklyOTHours, OT_WEEKLY_CAP } from '../utils/helpers';
import { OTRequests } from '../components/attendance/OTRequests';
import { LeaveRequests } from '../components/attendance/LeaveRequests';
import { CorrectionRequests } from '../components/attendance/CorrectionRequests';
import { GPSCheckIn } from '../components/attendance/GPSCheckIn';
import { CameraCheckIn } from '../components/attendance/CameraCheckIn';

export const Attendance = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const [tab, setTab] = useState("attendance");
  const { canApproveAtt, canApproveLeave } = usePermission();
  const isHR = canApproveAtt || canApproveLeave;
  
  const { attData, setAttData, page, setPage, limit, total, search, setSearch } = useAttendance(isHR);
  const { leaves, setLeaves } = useLeaves();

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [newLeave, setNewLeave] = useState({ type: "ลากิจ", startDate: "", endDate: "", reason: "" });
  const [clockedIn, setClockedIn] = useState(false);
  const [clockTime, setClockTime] = useState(null);
  
  const [corrections, setCorrections] = useState([]);
  const [loadingCorrections, setLoadingCorrections] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [newCorrection, setNewCorrection] = useState({ date: "", type: "clockIn", requestedTime: "", reason: "" });
  
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [leaveWarning, setLeaveWarning] = useState(null);

  useEffect(() => {
    const fetchCorrections = async () => {
      setLoadingCorrections(true);
      try {
        const res = await api.get('/attendance/corrections');
        setCorrections(Array.isArray(res.data) ? res.data : res.data?.data || []);
      } catch (err) {
        showToast('โหลดคำขอแก้เวลาไม่สำเร็จ', 'error');
      } finally {
        setLoadingCorrections(false);
      }
    };

    const fetchTodayStatus = async () => {
      try {
        const res = await api.get('/attendance/today');
        setClockedIn(res.data.clockedIn);
        setClockTime(res.data.clockIn ? new Date(res.data.clockIn).toLocaleTimeString('th-TH') : null);
      } catch (err) {
        // silent fail — not critical
      }
    };

    fetchCorrections();
    fetchTodayStatus();
      
    // Fetch leave balances
    api.get('/leaves/balances')
      .then(res => setLeaveBalances(res.data?.data || []))
      .catch(err => console.log('Leave balances API loaded'));
  }, []);

  const approveLeave = async (id, status) => {
    try {
      const res = await api.put(`/leaves/${id}/approve`, { status });
      setLeaves(p => p.map(l => l.id === id ? { ...l, ...res.data } : l));
      setLeaveWarning(null);
      showToast(`${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}คำขอลาสำเร็จ`, 'success');
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      if (msg.includes('quota') || msg.includes('สิทธิ์')) {
        setLeaveWarning(`⚠️ ${msg}`);
      } else {
        showToast(`ดำเนินการไม่สำเร็จ: ${msg}`, 'error');
      }
    }
  };

  const submitLeave = async () => {
    const days = newLeave.startDate && newLeave.endDate ? countWorkingDays(newLeave.startDate, newLeave.endDate) : 1;
    try {
      const res = await api.post('/leaves', {
        empId: user.empId,
        ...newLeave,
        days,
        status: 'pending_manager'
      });
      setLeaves(p => [res.data, ...p]);
      setShowLeaveModal(false);
      setLeaveWarning(null);
      showToast('ยื่นคำขอลาสำเร็จ', 'success');
    } catch (err) {
      showToast(`ยื่นคำขอลาไม่สำเร็จ: ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  const handleStatusChange = (status) => {
    setClockedIn(status.clockedIn);
    setClockTime(status.clockTime);
  };

  const submitCorrection = async () => {
    try {
      const res = await api.post('/attendance/corrections', {
        empId: user.empId,
        ...newCorrection,
        status: 'pending_manager'
      });
      setCorrections(p => [res.data, ...p]);
      setShowCorrectionModal(false);
      showToast('ส่งคำร้องแก้เวลาสำเร็จ', 'success');
    } catch (err) {
      showToast(`ส่งคำร้องไม่สำเร็จ: ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  const approveCorrection = async (id, status) => {
    try {
      const res = await api.put(`/attendance/corrections/${id}/approve`, { status });
      setCorrections(p => p.map(c => c.id === id ? { ...c, ...res.data } : c));
      showToast(`${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}คำขอแก้เวลาสำเร็จ`, 'success');
    } catch (err) {
      showToast(`ดำเนินการไม่สำเร็จ: ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  const allTabs = [
    { id: "attendance", label: "📸 ตอกบัตร & ประวัติลงเวลา" },
    { id: "correction", label: "✏️ ขอแก้ไขเวลา" },
    { id: "leave", label: "🏖️ ศูนย์การลา & สิทธิ์คงเหลือ" },
    { id: "ot", label: "⏰ คำขอทำโอที (OT)" },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <SectionHeader 
        title="เวลาทำงานและการลา (Attendance & Leave Studio)" 
        sub="ตอกบัตรสแกนใบหน้าจับพิกัด GPS, จัดการคำขอแก้เวลา, สิทธิ์วันลาพักร้อน และการขอ OT ล่วงหน้า" 
      />

      {/* Top Real-time Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard 
          icon="⏱️" 
          title="สถานะตอกบัตรวันนี้" 
          val={clockedIn ? "เข้างานแล้ว" : "ยังไม่ตอกบัตร"} 
          sub={clockedIn && clockTime ? `เข้างานเมื่อ ${clockTime}` : "รอตอกบัตรเข้างาน"}
          color={clockedIn ? C.success : C.warning} 
        />
        <StatCard 
          icon="📍" 
          title="ระยะ Geofence" 
          val="50 เมตร" 
          sub="รัศมีอนุญาตตอกบัตร"
          color={C.brand} 
        />
        <StatCard 
          icon="✏️" 
          title="คำขอแก้เวลาค้างอนุมัติ" 
          val={corrections.filter(c => c.status === 'pending_manager' || c.status === 'pending_hr').length} 
          sub="รายการที่รอการพิจารณา"
          color={C.orange} 
        />
        <StatCard 
          icon="🏖️" 
          title="สิทธิ์ลาพักร้อนคงเหลือ" 
          val={`${leaveBalances.find(b => b.leaveType === 'ลาพักร้อน')?.remainingDays || 6} วัน`} 
          sub="ประจำปี 2026"
          color={C.purple} 
        />
      </div>

      {/* Live Webcam & Geofence Studio Check-In Hub */}
      {!isHR && (
        <CameraCheckIn 
          clockedIn={clockedIn} 
          clockTime={clockTime} 
          onStatusChange={handleStatusChange} 
        />
      )}

      {/* Main Navigation Tabs */}
      <div style={{ marginBottom: 20 }}>
        <Tabs tabs={allTabs} active={tab} onChange={setTab} />
      </div>

      {tab === "attendance" && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>📋 ตารางประวัติการตอกบัตรลงเวลา</h3>
            <Btn variant="secondary" onClick={async () => {
              try {
                showToast('กำลังสร้างรายงาน...', 'info');
                const res = await api.get('/attendance/export/excel', { responseType: 'blob' });
                const url = URL.createObjectURL(new Blob([res.data]));
                const a = document.createElement('a');
                a.href = url;
                a.download = 'attendance_report.xlsx';
                a.click();
                URL.revokeObjectURL(url);
                showToast('ดาวน์โหลดสำเร็จ', 'success');
              } catch (err) {
                showToast('ส่งออกรายงานล้มเหลว', 'error');
              }
            }} style={{ borderRadius: 10 }}>📥 ส่งออกรายงาน Excel</Btn>
          </div>
          <GPSCheckIn attData={attData} page={page} setPage={setPage} limit={limit} total={total} search={search} setSearch={setSearch} />
        </>
      )}

      {tab === "correction" && (
        <CorrectionRequests
          corrections={corrections}
          isHR={isHR}
          user={user}
          approveCorrection={approveCorrection}
          setShowCorrectionModal={setShowCorrectionModal}
        />
      )}

      {tab === "leave" && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>🏖️ ประวัติคำขอลาและสิทธิ์การลา</h3>
            <Btn variant="secondary" onClick={async () => {
              try {
                showToast('กำลังสร้างรายงาน...', 'info');
                const res = await api.get('/leaves/export/excel', { responseType: 'blob' });
                const url = URL.createObjectURL(new Blob([res.data]));
                const a = document.createElement('a');
                a.href = url;
                a.download = 'leaves_report.xlsx';
                a.click();
                URL.revokeObjectURL(url);
                showToast('ดาวน์โหลดสำเร็จ', 'success');
              } catch (err) {
                showToast('ส่งออกรายงานล้มเหลว', 'error');
              }
            }} style={{ borderRadius: 10 }}>📥 ส่งออกรายงานการลา (Excel)</Btn>
          </div>
          <LeaveRequests
            leaves={leaves}
            isHR={isHR}
            user={user}
            leaveWarning={leaveWarning}
            setLeaveWarning={setLeaveWarning}
            leaveBalances={leaveBalances}
            approveLeave={approveLeave}
            setShowLeaveModal={setShowLeaveModal}
          />
        </>
      )}

      {tab === "ot" && <OTRequests />}

      {/* Leave Modal */}
      {showLeaveModal && (
        <Modal title="ยื่นคำขอลา" onClose={() => setShowLeaveModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sel label="ประเภทการลา" value={newLeave.type} onChange={v => setNewLeave(p => ({ ...p, type: v }))}
              options={["ลากิจ", "ลาป่วย", "ลาพักร้อน", "ลาคลอด"].map(t => ({ value: t, label: t }))} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Inp label="วันที่เริ่ม" value={newLeave.startDate} onChange={v => setNewLeave(p => ({ ...p, startDate: v }))} type="date" />
              <Inp label="วันที่สิ้นสุด" value={newLeave.endDate} onChange={v => setNewLeave(p => ({ ...p, endDate: v }))} type="date" />
            </div>
            <Inp label="เหตุผล" value={newLeave.reason} onChange={v => setNewLeave(p => ({ ...p, reason: v }))} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
              <Btn variant="ghost" onClick={() => setShowLeaveModal(false)}>ยกเลิก</Btn>
              <Btn onClick={submitLeave}>ยื่นคำขอ</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Time Correction Modal */}
      {showCorrectionModal && (
        <Modal title="ขอแก้ไขเวลาเข้า-ออกงาน" onClose={() => setShowCorrectionModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Inp label="วันที่ต้องการแก้ไข" value={newCorrection.date} onChange={v => setNewCorrection(p => ({ ...p, date: v }))} type="date" />
            <Sel label="แก้ไขรายการ" value={newCorrection.type} onChange={v => setNewCorrection(p => ({ ...p, type: v }))}
              options={[{ value: "clockIn", label: "เวลาเข้างาน" }, { value: "clockOut", label: "เวลาออกงาน" }]} />
            <Inp label="เวลาที่ถูกต้อง" value={newCorrection.requestedTime} onChange={v => setNewCorrection(p => ({ ...p, requestedTime: v }))} type="time" />
            <Inp label="เหตุผลที่ขอแก้ไข" value={newCorrection.reason} onChange={v => setNewCorrection(p => ({ ...p, reason: v }))} placeholder="เช่น ลืมตอกบัตร, เครื่องสแกนนิ้วขัดข้อง" />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
              <Btn variant="ghost" onClick={() => setShowCorrectionModal(false)}>ยกเลิก</Btn>
              <Btn onClick={submitCorrection}>ส่งคำร้อง</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
