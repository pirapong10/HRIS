import React from 'react';
import { C } from '../../utils/theme';
import { Btn } from '../common/UI';

export const EmployeeOnboarding = ({ selected, toggleTask }) => {
  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 14 }}>รายการ Onboarding / Offboarding</div>
      {(selected.onboarding || []).map(t => (
        <label key={t.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.borderLight}`, cursor: "pointer" }}>
          <input type="checkbox" checked={t.isCompleted} onChange={(e) => toggleTask(t.id, e.target.checked)} />
          <span style={{ textDecoration: t.isCompleted ? "line-through" : "none", color: t.isCompleted ? C.textMuted : C.text, fontSize: 13 }}>{t.title}</span>
        </label>
      ))}
      <Btn size="sm" variant="secondary" style={{ marginTop: 14 }}>+ เพิ่มรายการ</Btn>
    </div>
  );
};
