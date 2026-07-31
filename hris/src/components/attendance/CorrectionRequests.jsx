import React from 'react';
import { C } from '../../utils/theme';
import { Card, Tbl, Btn, statusBadge } from '../common/UI';
import { getEmpName } from '../../utils/helpers';

export const CorrectionRequests = ({ corrections, isHR, user, approveCorrection, setShowCorrectionModal }) => {
  return (
    <Card style={{ padding: 0 }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>คำร้องขอแก้ไขเวลาเข้า-ออกงาน</div>
        <Btn size="sm" onClick={() => setShowCorrectionModal(true)}>+ ขอแก้เวลา</Btn>
      </div>
      <Tbl columns={[
        { key: "emp", label: "พนักงาน", render: r => getEmpName(r.empId) },
        { key: "date", label: "วันที่ขอแก้" },
        { key: "type", label: "รายการ", render: r => r.type === "clockIn" ? "เวลาเข้างาน" : "เวลาออกงาน" },
        { key: "time", label: "เวลาที่ขอแก้", render: r => <span style={{ fontWeight: 600, color: C.brand }}>{r.requestedTime}</span> },
        { key: "reason", label: "เหตุผล", render: r => r.reason },
        { key: "status", label: "สถานะ", render: r => statusBadge(r.status) },
        ...(isHR ? [{
          key: "actions", label: "", render: r => {
            if (r.status === "pending_manager") return (
              <div style={{ display: "flex", gap: 6 }}>
                <Btn size="sm" onClick={() => approveCorrection(r.id, "pending_hr")}>Manager อนุมัติ</Btn>
                <Btn size="sm" variant="danger" onClick={() => approveCorrection(r.id, "rejected")}>✕</Btn>
              </div>
            );
            if (r.status === "pending_hr") return (
              <div style={{ display: "flex", gap: 6 }}>
                <Btn size="sm" variant="success" onClick={() => approveCorrection(r.id, "approved")}>HR อนุมัติ</Btn>
                <Btn size="sm" variant="danger" onClick={() => approveCorrection(r.id, "rejected")}>✕</Btn>
              </div>
            );
            return <span style={{ fontSize: 12, color: C.textMuted }}>{r.approver || "—"}</span>;
          }
        }] : []),
      ]} data={isHR ? corrections : corrections.filter(c => c.empId === (user.empId || 3))} />
    </Card>
  );
};
