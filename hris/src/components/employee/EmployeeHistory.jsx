import React from 'react';
import { C } from '../../utils/theme';
import { Tbl, Badge } from '../common/UI';
import { fmtB } from '../../utils/helpers';

export const EmployeeHistory = ({ selected, depts = [], positions = [] }) => {
  const getDeptName = id => depts.find(d => String(d.id) === String(id))?.name || `แผนก ID: ${id}`;
  const getPosName = id => positions.find(p => String(p.id) === String(id))?.name || `ตำแหน่ง ID: ${id}`;

  const formatChange = (r) => {
    if (r.type === 'salary') {
      const oldVal = parseFloat(r.oldVal) || 0;
      const newVal = parseFloat(r.newVal) || 0;
      let pctStr = '';
      if (oldVal > 0) {
        const pct = ((newVal - oldVal) / oldVal * 100).toFixed(1);
        pctStr = pct >= 0 ? ` (+${pct}%)` : ` (${pct}%)`;
      }
      return (
        <div style={{ fontSize: 13 }}>
          <div>ก่อนหน้า: <span style={{ color: C.textMuted }}>{fmtB(oldVal)}</span></div>
          <div>ปัจจุบัน: <span style={{ color: C.success, fontWeight: 600 }}>{fmtB(newVal)}</span><span style={{ fontSize: 11, color: C.brand, marginLeft: 4 }}>{pctStr}</span></div>
        </div>
      );
    }
    if (r.type === 'position') {
      return (
        <div style={{ fontSize: 13 }}>
          <div>ก่อนหน้า: <span style={{ color: C.textMuted }}>{getPosName(r.oldVal)}</span></div>
          <div>ปัจจุบัน: <span style={{ color: C.success, fontWeight: 600 }}>{getPosName(r.newVal)}</span></div>
        </div>
      );
    }
    if (r.type === 'department') {
      return (
        <div style={{ fontSize: 13 }}>
          <div>ก่อนหน้า: <span style={{ color: C.textMuted }}>{getDeptName(r.oldVal)}</span></div>
          <div>ปัจจุบัน: <span style={{ color: C.success, fontWeight: 600 }}>{getDeptName(r.newVal)}</span></div>
        </div>
      );
    }
    return (
      <div style={{ fontSize: 13 }}>
        <div>ก่อนหน้า: <span style={{ color: C.textMuted }}>{r.oldVal}</span></div>
        <div>ปัจจุบัน: <span style={{ color: C.success, fontWeight: 600 }}>{r.newVal}</span></div>
      </div>
    );
  };

  const getBadgeType = (type) => {
    switch (type) {
      case 'salary':
        return { label: '💰 ปรับเงินเดือน', bg: C.brandLight, color: C.brand };
      case 'position':
        return { label: '📋 เปลี่ยนตำแหน่ง', bg: C.purpleLight, color: C.purple };
      case 'department':
        return { label: '🏢 เปลี่ยนแผนก', bg: C.tealLight, color: C.teal };
      default:
        return { label: type, bg: '#eee', color: '#555' };
    }
  };

  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 14 }}>ประวัติการทำงาน / เลื่อนตำแหน่ง</div>
      <Tbl columns={[
        { key: "date", label: "วันที่", render: r => <span style={{ fontSize: 12 }}>{r.date}</span> },
        { key: "type", label: "ประเภท", render: r => {
            const b = getBadgeType(r.type);
            return <Badge label={b.label} bg={b.bg} color={b.color} />;
          } 
        },
        { key: "change", label: "การเปลี่ยนแปลง", render: r => formatChange(r) },
        { key: "remark", label: "หมายเหตุ/ผู้บันทึก", render: r => <span style={{ fontSize: 12, color: C.textMuted }}>{r.remark}</span> },
      ]} data={selected.history || []} />
      {(selected.history || []).length === 0 && <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: 20 }}>ไม่มีประวัติการเปลี่ยนแปลง</div>}
    </div>
  );
};
