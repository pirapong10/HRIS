import React, { useState, useEffect } from 'react';
import { SectionHeader, Card, Tbl, Badge, Sel, Btn } from '../components/common/UI';
import { C } from '../utils/theme';
import api from '../utils/api';

export const AuditLogModule = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterModule, setFilterModule] = useState("");
  const [loading, setLoading] = useState(true);
  const LIMIT = 50;

  const load = async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page, limit: LIMIT, ...(filterModule ? { module: filterModule } : {}) });
    try {
      const res = await api.get('/rbac/audit-logs', { params: { page, limit: LIMIT, ...(filterModule ? { module: filterModule } : {}) } });
      const data = res.data;
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch { setLogs([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, filterModule]);

  const ACTION_COLORS = {
    LOGIN_SUCCESS: { bg: "#d1fae5", color: "#065f46" },
    LOGIN_FAILED:  { bg: "#fee2e2", color: "#991b1b" },
    LOGOUT:        { bg: "#f1f5f9", color: "#475569" },
    PERMISSION_CHANGED: { bg: "#fef3c7", color: "#92400e" },
    ROLE_ASSIGNED: { bg: "#e0f2fe", color: "#0369a1" },
    USER_CREATED:  { bg: "#f0fdf4", color: "#15803d" },
  };

  return (
    <div>
      <SectionHeader title="Audit Logs" sub="บันทึกการใช้งานระบบทั้งหมด" />
      <Card style={{ padding: 0 }}>
        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ fontWeight: 700 }}>ทั้งหมด {total} รายการ</div>
          <Sel label="" value={filterModule} onChange={setFilterModule} options={[
            { value: "", label: "ทุก Module" },
            ...["auth","employee","organization","attendance","leave","payroll","access_control","settings"].map(m => ({ value: m, label: m }))
          ]} />
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>กำลังโหลด...</div>
        ) : (
          <Tbl columns={[
            { key: "createdAt", label: "เวลา", render: r => <div style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>{new Date(r.createdAt).toLocaleString("th-TH")}</div> },
            { key: "user", label: "ผู้ใช้", render: r => <div style={{ fontSize: 13 }}>{r.user?.email || "System"}</div> },
            { key: "action", label: "Action", render: r => {
              const cfg = ACTION_COLORS[r.action] || { bg: "#f1f5f9", color: "#475569" };
              return <Badge label={r.action} bg={cfg.bg} color={cfg.color} />;
            }},
            { key: "module", label: "Module", render: r => r.module ? <Badge label={r.module} bg={C.brandLight} color={C.brand} /> : "-" },
            { key: "details", label: "รายละเอียด", render: r => <div style={{ fontSize: 12, color: C.textMuted }}>{r.details || "-"}</div> },
            { key: "ipAddress", label: "IP", render: r => <div style={{ fontSize: 11, color: C.textLight, fontFamily: "monospace" }}>{r.ipAddress || "-"}</div> },
          ]} data={logs} />
        )}
        {total > LIMIT && (
          <div style={{ padding: "12px 20px", display: "flex", gap: 8, justifyContent: "center" }}>
            {page > 1 && <Btn variant="secondary" size="sm" onClick={() => setPage(p => p - 1)}>← ก่อนหน้า</Btn>}
            <span style={{ padding: "8px 12px", fontSize: 13, color: C.textMuted }}>หน้า {page} / {Math.ceil(total / LIMIT)}</span>
            {page * LIMIT < total && <Btn variant="secondary" size="sm" onClick={() => setPage(p => p + 1)}>ถัดไป →</Btn>}
          </div>
        )}
      </Card>
    </div>
  );
};