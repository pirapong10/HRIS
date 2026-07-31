import React from 'react';
import { C } from '../../utils/theme';
import { fmtB } from '../../utils/helpers';

export const EmployeeProfile = ({ selected, isHR }) => {
  const genderMap = {
    male: 'ชาย',
    female: 'หญิง',
  };

  const taxMethodMap = {
    progressive: 'แบบขั้นบันได (Progressive)',
    flat: 'อัตราคงที่ (Flat Rate)',
  };

  const showCountrySection = selected.workCountry && selected.workCountry !== 'TH';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Section 1: General Info */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: C.brand, borderBottom: `1px solid ${C.borderLight}`, paddingBottom: 4 }}>
          📋 ข้อมูลทั่วไป
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px", fontSize: 13 }}>
          {[
            ["รหัสพนักงาน", selected.empCode], 
            ["วันที่เริ่มงาน", selected.hireDate], 
            ["โทรศัพท์", selected.phone], 
            ["อีเมล", selected.email],
            ["วันเกิด", selected.dob || "-"],
            ["เพศ", genderMap[selected.gender] || selected.gender || "ไม่ระบุ"],
            ["เลขบัตรประชาชน / Passport", selected.nationalId || "-"],
          ].map(([k, v]) => (
            <div key={k}><span style={{ color: C.textMuted }}>{k}: </span><strong>{v}</strong></div>
          ))}
          {selected.address && (
            <div style={{ gridColumn: "1/-1" }}>
              <span style={{ color: C.textMuted }}>ที่อยู่: </span>
              <strong>{selected.address}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Financial Info (isHR only) */}
      {isHR && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: C.brand, borderBottom: `1px solid ${C.borderLight}`, paddingBottom: 4 }}>
            💰 ข้อมูลการเงิน & ภาษี
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px", fontSize: 13 }}>
            {[
              ["เงินเดือน", fmtB(selected.salary)], 
              ["ธนาคาร", selected.bank || "-"],
              ["เลขบัญชีธนาคาร", selected.bankAcc || "-"],
              ["วิธีคำนวณภาษี", taxMethodMap[selected.taxMethod] || selected.taxMethod || "-"],
              ["เลขผู้ประกันตน SSO", selected.ssoNumber || "-"],
              ["เลขประจำตัวผู้เสียภาษี", selected.taxId || "-"],
            ].map(([k, v]) => (
              <div key={k}><span style={{ color: C.textMuted }}>{k}: </span><strong>{v}</strong></div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Country Info (if applicable) */}
      {showCountrySection && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: C.brand, borderBottom: `1px solid ${C.borderLight}`, paddingBottom: 4 }}>
            🌐 ข้อมูลต่างประเทศ
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px", fontSize: 13 }}>
            <div><span style={{ color: C.textMuted }}>ประเทศที่ปฏิบัติงาน: </span><strong>{selected.workCountry}</strong></div>
            <div><span style={{ color: C.textMuted }}>ประเทศที่เสียภาษี: </span><strong>{selected.taxCountry}</strong></div>
          </div>
        </div>
      )}

      {/* Section 4: Emergency Contact */}
      {selected.emName && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: C.danger, borderBottom: `1px solid ${C.borderLight}`, paddingBottom: 4 }}>
            🚨 ผู้ติดต่อฉุกเฉิน
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px", fontSize: 13 }}>
            <div><span style={{ color: C.textMuted }}>ชื่อ: </span><strong>{selected.emName}</strong></div>
            <div><span style={{ color: C.textMuted }}>ความสัมพันธ์: </span><strong>{selected.emRel}</strong></div>
            <div><span style={{ color: C.textMuted }}>โทรศัพท์: </span><strong>{selected.emPhone}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
};
