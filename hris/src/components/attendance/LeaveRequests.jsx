import React from 'react';
import { C } from '../../utils/theme';
import { Card, Tbl, Btn, statusBadge } from '../common/UI';
import { getEmpName } from '../../utils/helpers';

export const LeaveRequests = ({ leaves, isHR, user, leaveWarning, setLeaveWarning, leaveBalances, approveLeave, setShowLeaveModal }) => {
  return (
    <div>
      {leaveWarning && (
        <div style={{ background: C.dangerLight, color: C.danger, borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{leaveWarning}</span>
          <button onClick={() => setLeaveWarning(null)} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontWeight: 700 }}>✕</button>
        </div>
      )}
      {!isHR && (() => {
        const bal = leaveBalances.find(b => b.empId === (user.empId || 3));
        if (!bal) return null;
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10, marginBottom: 16 }}>
            {Object.entries(bal.balances).map(([type, b]) => (
              <div key={type} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>{type}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: b.used >= b.quota ? C.danger : C.success }}>{b.quota - b.used}</div>
                <div style={{ fontSize: 11, color: C.textLight }}>เหลือ / {b.quota} วัน</div>
              </div>
            ))}
          </div>
        );
      })()}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <Btn onClick={() => setShowLeaveModal(true)}>+ ขอลา</Btn>
      </div>
      <Card style={{ padding: 0 }}>
        <Tbl columns={[
          { key: "emp", label: "พนักงาน", render: r => getEmpName(r.empId) },
          { key: "type", label: "ประเภท" },
          { key: "startDate", label: "วันที่เริ่ม" },
          { key: "days", label: "จำนวนวัน", render: r => `${r.days} วัน` },
          { key: "reason", label: "เหตุผล" },
          { key: "status", label: "สถานะ", render: r => statusBadge(r.status) },
          ...(isHR ? [{
            key: "actions", label: "", render: r => {
              if (r.status === "pending_manager") return (
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn size="sm" onClick={() => approveLeave(r.id, "pending_hr")}>Manager อนุมัติ</Btn>
                  <Btn size="sm" variant="danger" onClick={() => approveLeave(r.id, "rejected")}>✕</Btn>
                </div>
              );
              if (r.status === "pending_hr") return (
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn size="sm" variant="success" onClick={() => approveLeave(r.id, "approved")}>HR อนุมัติ</Btn>
                  <Btn size="sm" variant="danger" onClick={() => approveLeave(r.id, "rejected")}>✕</Btn>
                </div>
              );
              return <span style={{ fontSize: 12, color: C.textMuted }}>{r.approver || "—"}</span>;
            }
          }] : []),
        ]} data={isHR ? leaves : leaves.filter(l => l.empId === (user.empId || 3))} />
      </Card>
    </div>
  );
};
