import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { usePermission } from '../hooks/usePermission';
import { SectionHeader, StatCard, Card, Tabs, Tbl, Avatar, Badge, statusBadge, Btn } from '../components/common/UI';
import { useToast } from '../components/common/Toast';
import api from '../utils/api';
import { C } from '../utils/theme';
import { fmt, fmtB, getPosName, getDeptName, getShift, generatePayslipHTML, downloadPayslip, previewPayslip } from '../utils/helpers';

const TAX_BRACKETS_DISPLAY = [
  { min: 0,       max: 150000,   rate: 0 },
  { min: 150000,  max: 300000,   rate: 0.05 },
  { min: 300000,  max: 500000,   rate: 0.10 },
  { min: 500000,  max: 750000,   rate: 0.15 },
  { min: 750000,  max: 1000000,  rate: 0.20 },
  { min: 1000000, max: 2000000,  rate: 0.25 },
  { min: 2000000, max: 5000000,  rate: 0.30 },
  { min: 5000000, max: Infinity, rate: 0.35 },
];

export const Payroll = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { canRunPayroll } = usePermission();
  const { showToast } = useToast();

  const [tab, setTab] = useState("summary");
  const [selected, setSelected] = useState(null);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const isHR = canRunPayroll || user.roles?.includes("SUPER_ADMIN") || user.roles?.includes("HR_ADMIN");

  useEffect(() => {
    const fetchPayroll = async () => {
      setLoading(true);
      try {
        const res = await api.get('/payroll');
        const data = res.data;
        if (Array.isArray(data)) setPayrolls(data);
      } catch (err) {
        showToast('โหลดข้อมูล payroll ไม่สำเร็จ', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchPayroll();
  }, [showToast]);

  const myData = payrolls;
  
  const periodData = myData.filter(p => p.period === selectedPeriod);
  const totalGross = periodData.reduce((s, p) => s + p.gross, 0);
  const totalNet = periodData.reduce((s, p) => s + p.net, 0);
  const totalOTPay = periodData.reduce((s, p) => s + p.otPay, 0);
  const totalTax = periodData.reduce((s, p) => s + p.tax, 0);

  const displayNet = (r) => {
    if (r.currency && r.currency !== 'THB') {
      return `${fmtB(r.net)} THB (${fmt(r.netLocal)} ${r.currency} @ ${r.exchangeRate})`;
    }
    return fmtB(r.net);
  };

  const handlePreview = (pr) => {
    const emp = pr.employee;
    if (emp) previewPayslip(pr, emp, settings);
  };

  const handleDownload = async (pr) => {
    try {
      showToast('กำลังสร้าง PDF...', 'info');
      const res = await api.get(`/payroll/details/${pr.id}/payslip-pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip_${pr.employee?.empCode || pr.id}_${pr.period}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('ดาวน์โหลด PDF สำเร็จ', 'success');
    } catch (err) {
      showToast('ไม่สามารถสร้าง PDF ได้', 'error');
    }
  };

  const handleBulkDownload = async () => {
    if (periodData.length === 0) {
      showToast('ไม่มีข้อมูลสำหรับงวดนี้', 'warning');
      return;
    }
    const zip = new JSZip();
    periodData.forEach(pr => {
      const emp = pr.employee;
      if (emp) {
        const html = generatePayslipHTML(pr, emp, settings);
        zip.file(`payslip_${emp.empCode}_${pr.period}.html`, html);
      }
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payslips_${selectedPeriod}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('ดาวน์โหลด ZIP สำเร็จ', 'success');
  };

  const runPayroll = async () => {
    setLoading(true);
    try {
      const res = await api.post('/payroll/run', { period: selectedPeriod });
      const newDetails = res.data;
      if (Array.isArray(newDetails)) {
        setPayrolls(prev => [
          ...newDetails,
          ...prev.filter(x => x.period !== selectedPeriod)
        ]);
        showToast(`รัน Payroll งวด ${selectedPeriod} สำเร็จ (${newDetails.length} คน)`, 'success');
      }
    } catch (err) {
      showToast(`รัน Payroll ไม่สำเร็จ: ${err.response?.data?.message || err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBankExport = async () => {
    if (periodData.length === 0) {
      showToast('ไม่มีข้อมูล payroll สำหรับงวดนี้', 'warning');
      return;
    }
    const runId = periodData[0]?.payrollRunId;
    if (runId) {
      try {
        const res = await api.post(`/payroll/${runId}/export`, {}, 
          { responseType: 'blob' });
        const url = URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = `bank_transfer_${selectedPeriod}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('ส่งออกไฟล์ Bank Transfer สำเร็จ', 'success');
        return;
      } catch (err) {
        // fallback to client-side
      }
    }
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    let txt = `0140000000 ${dateStr} COMPANY_NAME\n`;
    periodData.forEach(pr => {
      if (!pr.employee?.bankAcc) return;
      const bankAcc = pr.employee.bankAcc.replace(/-/g, '').padEnd(15, ' ');
      const amount = Math.round(pr.net).toString().padStart(10, '0');
      const empCode = pr.employee.empCode || '';
      txt += `${bankAcc} ${amount} ${empCode}\n`;
    });
    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bank_transfer_${selectedPeriod}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('ส่งออกไฟล์ Bank Transfer สำเร็จ', 'success');
  };

  const thaiMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const periodLabel = (() => {
    if (!selectedPeriod) return '';
    const [y, m] = selectedPeriod.split('-');
    return `${thaiMonths[parseInt(m, 10) - 1]} ${parseInt(y, 10) + 543}`;
  })();

  return (
    <div>
      <SectionHeader title="ระบบเงินเดือน" sub="คำนวณภาษีอัตราก้าวหน้า · รวม OT อัตโนมัติ" />

      {isHR && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 24 }}>
          <StatCard label="เงินเดือนรวม" value={fmtB(totalGross)} sub={periodLabel} color={C.brand} icon="💵" />
          <StatCard label="ค่าโอทีรวม" value={fmtB(totalOTPay)} sub={periodLabel} color={C.orange} icon="💪" />
          <StatCard label="ภาษีรวม" value={fmtB(totalTax)} sub={periodLabel} color={C.warning} icon="🧾" />
          <StatCard label="จ่ายสุทธิรวม" value={fmtB(totalNet)} sub={periodLabel} color={C.success} icon="✅" />
        </div>
      )}

      <Tabs tabs={[
        { id: "summary", label: "สรุปเงินเดือน" },
        ...(isHR ? [{ id: "run", label: "รัน Payroll" }] : []),
        { id: "slip", label: "สลิปเงินเดือน" },
        { id: "tax", label: "ตารางภาษี" },
      ]} active={tab} onChange={setTab} />

      {tab === "summary" && (
        <Card style={{ padding: 0 }}>
          {isHR && (
            <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.border}`, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textMuted }}>งวดเงินเดือน:</span>
                <input
                  type="month"
                  value={selectedPeriod}
                  onChange={e => setSelectedPeriod(e.target.value)}
                  style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 8px', fontSize: 13, outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn variant="ghost" onClick={handleBankExport}>🏦 ส่งออกไฟล์ Bank Transfer (.txt)</Btn>
                <Btn variant="secondary" onClick={handleBulkDownload}>📦 ดาวน์โหลดสลิปทั้งหมด (ZIP)</Btn>
              </div>
            </div>
          )}
          <Tbl columns={[
            ...(isHR ? [{
              key: "emp", label: "พนักงาน", render: r => (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Avatar name={r.employee?.name || r.employee?.empCode || "Unknown"} size={28} />
                  {r.employee?.name || r.employee?.empCode || "Unknown"}
                </div>
              )
            }] : []),
            { key: "period", label: "งวด", render: r => <Badge label={r.period} bg={C.brandLight} color={C.brand} /> },
            { key: "baseSalary", label: "เงินเดือน", render: r => <span style={{ fontWeight: 600 }}>{fmtB(r.baseSalary)}</span> },
            { key: "otPay", label: "ค่าโอที", render: r => r.otPay > 0 ? <span style={{ color: C.orange, fontWeight: 600 }}>+{fmtB(r.otPay)}</span> : "—" },
            { key: "tax", label: "ภาษี", render: r => <span style={{ color: C.warning }}>-{fmtB(r.tax)}</span> },
            { key: "sso", label: "ประกันสังคม", render: r => <span style={{ color: C.warning }}>-{fmtB(r.sso)}</span> },
            { key: "deducts", label: "หักอื่นๆ (PVF/กู้)", render: r => <span style={{ color: C.danger }}>-{fmtB((r.providentFund||0) + (r.loan||0) + (r.other_deduct||0))}</span> },
            { key: "net", label: "สุทธิ", render: r => <span style={{ fontWeight: 700, color: C.success, fontSize: 14 }}>{displayNet(r)}</span> },
            { key: "status", label: "สถานะ", render: r => statusBadge(r.status) },
            {
              key: "actions", label: "", render: r => (
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn variant="ghost" size="sm" onClick={() => { setSelected(r); setTab("slip"); }}>ดูสลิป</Btn>
                  <Btn variant="secondary" size="sm" onClick={() => handleDownload(r)}>📥 PDF</Btn>
                </div>
              )
            },
          ]} data={periodData} /> 
        </Card>
      )}

      {tab === "run" && isHR && (
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>รัน Payroll</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: 5 }}>
                งวดเงินเดือน
              </label>
              <input
                type="month"
                value={selectedPeriod}
                onChange={e => setSelectedPeriod(e.target.value)}
                style={{ border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: '8px 12px', fontSize: 14, outline: 'none', background: C.surface }}
              />
            </div>
            <Btn onClick={runPayroll} disabled={loading} size="lg">
              {loading ? 'กำลังประมวลผล...' : `▶ รัน Payroll ${selectedPeriod}`}
            </Btn>
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, background: C.warningLight,
            borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
            ⚠️ การรัน Payroll จะคำนวณเงินเดือนใหม่ทั้งหมดตาม Component Engine
            สามารถรันซ้ำได้ — ระบบจะลบและสร้างผลใหม่ทุกครั้ง
          </div>
        </Card>
      )}

      {tab === "slip" && (
        <div>
          {selected ? (
            <div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.brand, fontSize: 13, marginBottom: 16, padding: 0 }}>← กลับ</button>
              <Card style={{ maxWidth: 560, margin: "0 auto" }}>
                {/* Slip preview card */}
                <div style={{ textAlign: "center", marginBottom: 20, paddingBottom: 16, borderBottom: `3px solid ${C.brand}` }}>
                  <div style={{ fontWeight: 800, fontSize: 20, color: C.brand }}>🏢 PS Company</div>
                  <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>สลิปเงินเดือน รอบ {selected.period}</div>
                </div>
                {(() => {
                  const emp = selected.employee;
                  const shift = getShift(emp?.shiftId);
                  const empName = emp?.name || emp?.empCode || "Unknown";
                  return (
                    <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                      <Avatar name={empName} size={52} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{empName}</div>
                        <div style={{ fontSize: 13, color: C.textMuted }}>{getPosName(emp?.posId)} · {getDeptName(emp?.deptId)}</div>
                        {shift && <Badge label={`⏰ ${shift.name}`} bg={shift.color + "18"} color={shift.color} />}
                      </div>
                    </div>
                  );
                })()}
                {(() => {
                  const ytdData = payrolls.filter(p => 
                    p.empId === selected.empId && 
                    p.period.startsWith(selected.period.split('-')[0]) && 
                    p.period <= selected.period
                  );
                  const ytdGross = ytdData.reduce((s, p) => s + p.gross, 0);
                  const ytdTax   = ytdData.reduce((s, p) => s + p.tax, 0);
                  
                  return [
                    ["รายได้", [
                      ["เงินเดือนพื้นฐาน", selected.baseSalary, false],
                      ...(selected.otPay > 0 ? [[`ค่าโอที (${selected.otHours} ชม.)`, selected.otPay, false]] : []),
                      ["รวมรายได้", selected.gross, false],
                    ]],
                    ["รายการหัก", [
                      ["ภาษีหัก ณ ที่จ่าย (อัตราก้าวหน้า)", -selected.tax, true],
                      ["ประกันสังคม 5% (สูงสุด ฿750)", -selected.sso, true],
                      ...(selected.providentFund > 0 ? [["กองทุนสำรองเลี้ยงชีพ", -selected.providentFund, true]] : []),
                      ...(selected.loan > 0 ? [["เงินกู้", -selected.loan, true]] : []),
                      ...(selected.other_deduct > 0 ? [["หักอื่นๆ", -selected.other_deduct, true]] : []),
                    ]],
                    ["ข้อมูลสะสมรายปี (YTD) & เงินสมทบ", [
                      ["รายได้สะสม (YTD)", ytdGross, false],
                      ["ภาษีสะสม (YTD)", ytdTax, true],
                      ["เงินสมทบนายจ้าง (ประกันสังคม)", selected.employerSso || selected.sso, false],
                    ]],
                  ].map(([sec, rows]) => (
                    <div key={sec} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{sec}</div>
                      {rows.map(([k, v, isDeduct]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "5px 0", borderBottom: `1px solid ${C.borderLight}` }}>
                          <span style={{ color: C.textMuted }}>{k}</span>
                          <span style={{ fontWeight: 600, color: isDeduct ? C.danger : v === selected.gross || v === selected.otPay ? C.success : C.text }}>
                            {v < 0 ? `-${fmtB(-v)}` : `${fmtB(v)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))
                })()}
                <div style={{ borderTop: `2px solid ${C.border}`, paddingTop: 14, display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 800, marginBottom: 20 }}>
                  <span>💰 เงินสุทธิ</span>
                  <span style={{ color: C.success }}>{displayNet(selected)}</span>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn variant="ghost" onClick={() => setSelected(null)} style={{ flex: 1, justifyContent: "center" }}>← กลับ</Btn>
                  <Btn variant="secondary" onClick={() => handlePreview(selected)} style={{ flex: 1, justifyContent: "center" }}>👁 Preview</Btn>
                  <Btn onClick={() => handleDownload(selected)} style={{ flex: 1, justifyContent: "center" }}>📥 Export HTML</Btn>
                </div>
              </Card>
            </div>
          ) : (
            <Card style={{ padding: 0 }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textMuted }}>เลือกงวด:</span>
                <input
                  type="month"
                  value={selectedPeriod}
                  onChange={e => setSelectedPeriod(e.target.value)}
                  style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 8px', fontSize: 13, outline: 'none' }}
                />
              </div>
              <Tbl columns={[
                ...(isHR ? [{ key: "emp", label: "พนักงาน", render: r => r.employee?.name || r.employee?.empCode || "Unknown" }] : []),
                { key: "period", label: "งวด" },
                { key: "net", label: "จ่ายสุทธิ", render: r => <span style={{ fontWeight: 700, color: C.success }}>{displayNet(r)}</span> },
                { key: "status", label: "สถานะ", render: r => statusBadge(r.status) },
                {
                  key: "actions", label: "", render: r => (
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn variant="ghost" size="sm" onClick={() => setSelected(r)}>ดูสลิป</Btn>
                      <Btn variant="secondary" size="sm" onClick={() => handleDownload(r)}>📥 PDF</Btn>
                    </div>
                  )
                },
              ]} data={periodData} />
            </Card>
          )}
        </div>
      )}

      {tab === "tax" && (
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>ตารางอัตราภาษีเงินได้บุคคลธรรมดา (อัตราก้าวหน้า)</div>
          <Tbl columns={[
            { key: "range", label: "รายได้สุทธิต่อปี (บาท)" },
            { key: "rate", label: "อัตราภาษี (%)" },
            { key: "maxTax", label: "ภาษีสูงสุดในขั้น" },
          ]} data={TAX_BRACKETS_DISPLAY.slice(0, -1).map(b => ({
            range: b.min === 0 ? "0 – 150,000" : `${fmt(b.min)} – ${fmt(b.max)}`,
            rate: b.rate === 0 ? "ยกเว้น" : `${b.rate * 100}%`,
            maxTax: b.rate === 0 ? "฿0" : fmtB((b.max - b.min) * b.rate),
          }))} />
          <div style={{ marginTop: 14, background: C.brandLight, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.brand }}>
            💡 ค่าลดหย่อน: ค่าใช้จ่าย 50% (สูงสุด ฿100,000) + ค่าลดหย่อนส่วนตัว ฿60,000
          </div>
          <div style={{ marginTop: 14, fontWeight: 700, marginBottom: 10 }}>ตัวอย่างการคำนวณจริง</div>
          <Tbl columns={[
            { key: "name", label: "พนักงาน", render: r => r.employee?.name || r.employee?.empCode || "Unknown" },
            { key: "salary", label: "เงินเดือน/เดือน", render: r => fmtB(r.baseSalary) },
            { key: "annual", label: "รายได้/ปี", render: r => fmtB(r.baseSalary * 12) },
            { key: "taxAnnual", label: "ภาษี/ปี (ประเมิน)", render: r => fmtB(r.tax * 12) },
            { key: "taxMonthly", label: "ภาษี/เดือน", render: r => <span style={{ fontWeight: 700, color: C.warning }}>{fmtB(r.tax)}</span> },
            { key: "effRate", label: "อัตราแท้จริง", render: r => `${((r.tax * 12) / (r.baseSalary * 12) * 100).toFixed(2)}%` },
          ]} data={periodData.filter((p, i, a) => a.findIndex(x => x.empId === p.empId) === i).slice(0, 10)} />
        </Card>
      )}

    </div>
  );
};
