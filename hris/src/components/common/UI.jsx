import React, { useState } from 'react';
import { C } from '../../utils/theme';

// ─── Badge ────────────────────────────────────────────────────────────
// Before: fontSize 11, fontWeight 600
// After:  fontSize 11px, fontWeight 500 (lighter — reserved 600 for headings)
export const Badge = ({ label, bg, color }) => (
  <span style={{ background: bg, color, fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99, letterSpacing: 0.3, whiteSpace: "nowrap" }}>{label}</span>
);

export const statusBadge = s => {
  const m = {
    active: { label: "ปฏิบัติงาน", bg: C.successLight, color: C.success },
    inactive: { label: "พ้นสภาพ", bg: C.dangerLight, color: C.danger },
    approved: { label: "อนุมัติ", bg: C.successLight, color: C.success },
    pending_manager: { label: "รอหัวหน้าอนุมัติ", bg: C.warningLight, color: C.warning },
    pending_hr: { label: "รอ HR อนุมัติ", bg: C.brandLight, color: C.brand },
    pending: { label: "รอตรวจสอบ", bg: C.warningLight, color: C.warning },
    rejected: { label: "ปฏิเสธ", bg: C.dangerLight, color: C.danger },
    normal: { label: "ปกติ", bg: C.successLight, color: C.success },
    late: { label: "มาสาย", bg: C.warningLight, color: C.warning },
    early: { label: "มาก่อนเวลา", bg: C.brandLight, color: C.brand },
    paid: { label: "จ่ายแล้ว", bg: C.successLight, color: C.success },
    draft: { label: "ร่าง", bg: C.borderLight, color: C.textMuted },
    fulltime: { label: "ประจำ", bg: C.brandLight, color: C.brand },
    parttime: { label: "พาร์ทไทม์", bg: C.purpleLight, color: C.purple },
    morning: { label: "Morning", bg: C.brandLight, color: C.brand },
    evening: { label: "Evening", bg: C.purpleLight, color: C.purple },
    night: { label: "Night", bg: C.tealLight, color: C.teal },
  };
  const t = m[s] || { label: s, bg: "#eee", color: "#555" };
  return <Badge label={t.label} bg={t.bg} color={t.color} />;
};

// ─── Avatar ───────────────────────────────────────────────────────────
export const Avatar = ({ name, size = 36, color = C.brand }) => {
  const ini = name?.split(" ").map(w => w[0]).slice(0, 2).join("") || "?";
  return <div style={{ width: size, height: size, borderRadius: "50%", background: color + "22", color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.36, flexShrink: 0 }}>{ini}</div>;
};

// ─── Card ─────────────────────────────────────────────────────────────
// Before: no fontFamily definition
// After:  fontFamily: "inherit" ensures card inherits the global Inter stack
export const Card = ({ children, style = {} }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px", fontFamily: "inherit", ...style }}>{children}</div>
);

// ─── StatCard ─────────────────────────────────────────────────────────
// Before: value fontSize 22px
// After:  value fontSize 24px, fontWeight 700 (hero number)
export const StatCard = ({ label, value, sub, color = C.brand, icon }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px", display: "flex", alignItems: "flex-start", gap: 14 }}>
    <div style={{ width: 44, height: 44, borderRadius: 10, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{icon}</div>
    <div>
      <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>{sub}</div>}
    </div>
  </div>
);

// ─── Btn ──────────────────────────────────────────────────────────────
// Before: fontSize per size variant, fontWeight 600
// After:  fontSize 13px standardized, fontWeight 500 (medium — less heavy)
export const Btn = ({ children, onClick, variant = "primary", size = "md", style = {}, disabled = false }) => {
  const sv = {
    primary:   { background: C.brand,    color: "#fff",       border: "none" },
    secondary: { background: "transparent", color: C.brand,   border: `1px solid ${C.brand}` },
    danger:    { background: C.danger,   color: "#fff",       border: "none" },
    ghost:     { background: "transparent", color: C.textMuted, border: `1px solid ${C.border}` },
    success:   { background: C.success,  color: "#fff",       border: "none" },
  };
  const ss = {
    sm: { padding: "5px 12px",  fontSize: 12 },
    md: { padding: "8px 16px",  fontSize: 13 },
    lg: { padding: "11px 22px", fontSize: 13 },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...sv[variant], ...ss[size],
        borderRadius: 8, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, display: "inline-flex", alignItems: "center",
        gap: 6, fontFamily: "inherit", ...style
      }}
    >
      {children}
    </button>
  );
};

// ─── Inp ──────────────────────────────────────────────────────────────
// Before: label fontSize 12 fontWeight 600, no focus highlight, no transition
// After:  label fontSize 12px fontWeight 500, lineHeight 1.5, border-color
//         transitions to C.brand on focus via onFocus/onBlur handlers
export const Inp = ({ label, value, onChange, type = "text", placeholder, required, style = {}, readOnly = false }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, ...style }}>
      {label && <label style={{ fontSize: 12, fontWeight: 500, color: C.textMuted }}>{label}{required && " *"}</label>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          border: `1px solid ${focused ? C.brand : C.border}`,
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 14,
          lineHeight: "1.5",
          outline: "none",
          background: readOnly ? '#f9f9f9' : C.surface,
          color: C.text,
          fontFamily: "inherit",
          transition: "border-color 0.15s",
        }}
      />
    </div>
  );
};

// ─── Sel ──────────────────────────────────────────────────────────────
// Before: label fontSize 12 fontWeight 600
// After:  label fontSize 12px fontWeight 500
export const Sel = ({ label, value, onChange, options, style = {} }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5, ...style }}>
    {label && <label style={{ fontSize: 12, fontWeight: 500, color: C.textMuted }}>{label}</label>}
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px",
        fontSize: 14, outline: "none", background: C.surface, color: C.text,
        fontFamily: "inherit", cursor: "pointer",
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

// ─── Tbl ──────────────────────────────────────────────────────────────
// Before: th padding "10px 14px", td padding "11px 14px", fontSize 12/13
// After:  th padding "10px 16px", td padding "12px 16px"
//         th: fontSize 11px, fontWeight 600, uppercase, letterSpacing 0.05em
//         td: fontSize 13px
//         tr: borderBottom `1px solid ${C.border}` (stronger separator)
export const Tbl = ({ columns, data, emptyMsg = "ไม่มีข้อมูล" }) => (
  <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ background: C.bg }}>
          {columns.map(c => (
            <th key={c.key} style={{
              padding: "10px 16px", textAlign: "left", fontWeight: 600,
              color: C.textMuted, borderBottom: `1px solid ${C.border}`,
              whiteSpace: "nowrap", fontSize: 11, textTransform: "uppercase",
              letterSpacing: "0.05em", fontFamily: "inherit",
            }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0
          ? <tr><td colSpan={columns.length} style={{ padding: 32, textAlign: "center", color: C.textLight, fontSize: 13 }}>{emptyMsg}</td></tr>
          : data.map((row, i) => (
            <tr key={row?.id || row?._tempId || i}
              style={{ borderBottom: `1px solid ${C.border}` }}
              onMouseEnter={e => e.currentTarget.style.background = C.bg}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              {columns.map(c => (
                <td key={c.key} style={{ padding: "12px 16px", color: C.text, verticalAlign: "middle", fontSize: 13, fontFamily: "inherit" }}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))
        }
      </tbody>
    </table>
  </div>
);

// ─── Modal ────────────────────────────────────────────────────────────
// Before: title fontSize 16px, fontWeight 700
// After:  title fontSize 17px, fontWeight 600 (polished, less aggressive)
export const Modal = ({ title, onClose, children, width = 520 }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
    <div style={{ background: C.surface, borderRadius: 16, width, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontWeight: 600, fontSize: 17, color: C.text }}>{title}</div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.textMuted, padding: 4 }}>✕</button>
      </div>
      <div style={{ padding: "20px 24px" }}>{children}</div>
    </div>
  </div>
);

// ─── Tabs ─────────────────────────────────────────────────────────────
export const Tabs = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", gap: 0, marginBottom: 20, background: C.bg, borderRadius: 10, padding: 4, width: "fit-content" }}>
    {tabs.map(t => (
      <button key={t.id} onClick={() => onChange(t.id)}
        style={{
          padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer",
          fontWeight: 500, fontSize: 13, fontFamily: "inherit",
          background: active === t.id ? C.surface : "transparent",
          color: active === t.id ? C.brand : C.textMuted,
          boxShadow: active === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
        }}>
        {t.label}
      </button>
    ))}
  </div>
);

// ─── SectionHeader ────────────────────────────────────────────────────
// Before: title h2 fontSize 20px fontWeight 700, sub fontSize 13px
// After:  title fontSize 22px fontWeight 700, sub fontSize 14px fontWeight 400
export const SectionHeader = ({ title, sub, action }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
    <div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text, lineHeight: 1.25 }}>{title}</h2>
      {sub && <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 400, color: C.textMuted, lineHeight: 1.5 }}>{sub}</p>}
    </div>
    {action}
  </div>
);
