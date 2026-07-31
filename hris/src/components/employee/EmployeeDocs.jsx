import React, { useRef } from 'react';
import { C } from '../../utils/theme';
import { Tbl, Badge, Btn } from '../common/UI';

export const EmployeeDocs = ({ selected, deleteDoc, handleFileUpload }) => {
  const fileInputRef = useRef(null);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontWeight: 600 }}>เอกสารสำคัญ</div>
        <div>
          <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileUpload} />
          <Btn size="sm" onClick={() => fileInputRef.current?.click()}>+ อัปโหลดเอกสาร</Btn>
        </div>
      </div>
      <Tbl columns={[
        { key: "name", label: "ชื่อไฟล์", render: r => <a href="#" style={{ color: C.brand, textDecoration: "none", fontWeight: 600 }}>📎 {r.name}</a> },
        { key: "type", label: "ประเภท", render: r => <Badge label={r.type} bg={C.bg} color={C.textMuted} /> },
        { key: "size", label: "ขนาด", render: r => <span style={{ fontSize: 12 }}>{r.size}</span> },
        { key: "date", label: "วันที่อัปโหลด", render: r => <span style={{ fontSize: 12 }}>{r.date}</span> },
        { key: "actions", label: "", render: r => <Btn variant="ghost" size="sm" onClick={() => deleteDoc(r.id)}>ลบ</Btn> },
      ]} data={selected.docs || []} />
      {(selected.docs || []).length === 0 && <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: 20 }}>ไม่มีเอกสารแนบ</div>}
    </div>
  );
};
