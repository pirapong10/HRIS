import React from 'react';
import { C } from '../../utils/theme';
import { Card, Tbl, Avatar, Badge, statusBadge, Btn } from '../common/UI';
import { getEmpName, getShift } from '../../utils/helpers';

export const GPSCheckIn = ({ attData, page, setPage, limit, total, search, setSearch }) => {
  return (
    <div>
      <input value={search || ''} onChange={e => { if(setSearch) setSearch(e.target.value); if(setPage) setPage(1); }} placeholder="🔍 ค้นหาพนักงาน..."
        style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 14, outline: "none", marginBottom: 16, background: C.surface }} />
      <Card style={{ padding: 0 }}>
      <Tbl columns={[
        {
          key: "emp", label: "พนักงาน", render: r => (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Avatar name={getEmpName(r.empId)} size={28} />
              {getEmpName(r.empId)}
            </div>
          )
        },
        { key: "date", label: "วันที่" },
        { key: "shift", label: "กะ", render: r => { const s = getShift(r.shiftId); return s ? <Badge label={s.name} bg={s.color + "18"} color={s.color} /> : "-"; } },
        { key: "clockIn", label: "เข้างาน", render: r => <span style={{ color: C.brand, fontWeight: 600 }}>{r.clockIn}</span> },
        { key: "clockOut", label: "ออกงาน", render: r => <span style={{ fontWeight: 600 }}>{r.clockOut || "—"}</span> },
        {
          key: "ot", label: "OT", render: r => r.otHours > 0 ? (
            <span style={{ color: C.orange, fontWeight: 600 }}>{r.otHours} ชม.{r.otApproved ? " ✓" : ""}</span>
          ) : "—"
        },
        { key: "status", label: "สถานะ", render: r => statusBadge(r.status) },
      ]} data={attData} />
        {page && setPage && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 13, color: C.textMuted }}>แสดง {(page - 1) * limit + 1} ถึง {Math.min(page * limit, total)} จาก {total} รายการ</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>ก่อนหน้า</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * limit >= total}>ถัดไป</Btn>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
