import React, { useState } from 'react';
import { C } from '../../utils/theme';
import { Card, Tbl, Avatar, Badge, statusBadge, Btn, Modal } from '../common/UI';
import { getEmpName, getShift } from '../../utils/helpers';

export const GPSCheckIn = ({ attData, page, setPage, limit, total, search, setSearch }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  return (
    <div>
      {/* Top Filter Bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
          <input 
            value={search || ''} 
            onChange={e => { if(setSearch) setSearch(e.target.value); if(setPage) setPage(1); }} 
            placeholder="🔍 ค้นหาพนักงาน, แผนก, หรือวันที่..."
            style={{ 
              width: "100%", 
              border: `1px solid ${C.border}`, 
              borderRadius: 12, 
              padding: "10px 16px", 
              fontSize: 14, 
              outline: "none", 
              background: C.surface,
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }} 
          />
        </div>
      </div>

      <Card style={{ padding: 0, borderRadius: 16, overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
        <Tbl columns={[
          {
            key: "emp", label: "พนักงาน", render: r => (
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Avatar name={getEmpName(r.empId || r.employee?.name)} size={32} />
                <div>
                  <div style={{ fontWeight: 600, color: C.text }}>{getEmpName(r.empId || r.employee?.name)}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{r.employee?.department?.name || 'พนักงาน'}</div>
                </div>
              </div>
            )
          },
          { key: "date", label: "วันที่", render: r => <span style={{ fontWeight: 500 }}>{r.date}</span> },
          { key: "shift", label: "กะการทำงาน", render: r => { const s = getShift(r.shiftId); return s ? <Badge label={s.name} bg={s.color + "18"} color={s.color} /> : <Badge label="ปกติ (08:30 - 17:30)" bg="#E0E7FF" color="#3730A3" />; } },
          { key: "clockIn", label: "เวลาเข้างาน", render: r => <span style={{ color: C.brand, fontWeight: 700, fontFamily: 'monospace', fontSize: 14 }}>{r.clockIn || '—'}</span> },
          { key: "clockOut", label: "เวลาออกงาน", render: r => <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 14, color: r.clockOut ? C.text : C.textMuted }}>{r.clockOut || "—"}</span> },
          {
            key: "photo", label: "ภาพถ่าย", render: r => r.photoUrl ? (
              <button 
                onClick={() => setSelectedPhoto(r.photoUrl)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: C.brand, fontWeight: 600, fontSize: 12 }}
              >
                📸 ดูภาพถ่าย
              </button>
            ) : <span style={{ color: C.textMuted, fontSize: 12 }}>ไม่มีภาพ</span>
          },
          {
            key: "ot", label: "OT", render: r => r.otHours > 0 ? (
              <span style={{ color: C.orange, fontWeight: 700 }}>{r.otHours} ชม.{r.otApproved ? " ✓" : ""}</span>
            ) : "—"
          },
          { key: "status", label: "สถานะ", render: r => statusBadge(r.status) },
        ]} data={attData} />

        {page && setPage && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: `1px solid ${C.border}`, background: '#F8FAFC' }}>
            <div style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}>
              แสดง <span style={{ fontWeight: 700, color: C.text }}>{(page - 1) * limit + 1}</span> ถึง <span style={{ fontWeight: 700, color: C.text }}>{Math.min(page * limit, total)}</span> จากทั้งหมด <span style={{ fontWeight: 700, color: C.brand }}>{total}</span> รายการ
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← ก่อนหน้า</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * limit >= total}>ถัดไป →</Btn>
            </div>
          </div>
        )}
      </Card>

      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <Modal title="ภาพถ่ายสแกนใบหน้าเข้างาน" onClose={() => setSelectedPhoto(null)}>
          <div style={{ textAlign: 'center', padding: 10 }}>
            <img 
              src={selectedPhoto.startsWith('http') ? selectedPhoto : `http://localhost:3000${selectedPhoto}`} 
              alt="Check-in Photo" 
              style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }} 
            />
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
              <Btn onClick={() => setSelectedPhoto(null)}>ปิดหน้าต่าง</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
