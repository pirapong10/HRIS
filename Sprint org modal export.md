=== SPRINT: Organization Modal UX + Org Chart Export ===

Read CONTEXT.md first.
PLANNING MODE — show plan before any code changes.
Wait for my approval before implementing.

Show me these files first:
  cat hris/src/pages/Organization.jsx | sed -n '439,516p'
  (Modal JSX section — lines 439-516)

---

## PART 1: Organization Modal UX

### Current problem
Department modal is a flat 2-column grid with all fields mixed together.
No visual hierarchy, no sections, small labels.

### Redesign: Add/Edit Department Modal

Structure with labeled sections (not tabs — sections work better for short forms):

```jsx
<Modal title={editingDept ? "แก้ไขแผนก/หน่วยงาน" : "เพิ่มแผนก/หน่วยงานใหม่"} onClose={...} width={640}>
  
  {/* Section 1: ข้อมูลพื้นฐาน */}
  <div style={{ marginBottom: 20 }}>
    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '0.05em', color: C.textMuted, marginBottom: 12,
      paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
      ข้อมูลพื้นฐาน
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <Inp label="ชื่อแผนก *" value={form.name} onChange={v => setForm(p => ({...p, name: v}))}
        placeholder="เช่น ฝ่ายทรัพยากรบุคคล" style={{ gridColumn: '1/-1' }} />
      <Inp label="รหัสแผนก *" value={form.code} onChange={v => setForm(p => ({...p, code: v.toUpperCase()}))}
        placeholder="เช่น HR01" />
      <Sel label="ประเภทหน่วยงาน" value={form.type} onChange={v => setForm(p => ({...p, type: v}))}
        options={Object.entries(ORG_LEVEL_CONFIG).map(([k,v]) => ({ value: k, label: `${v.icon} ${v.label} (${k})` }))} />
    </div>
    <div style={{ marginTop: 14 }}>
      <Inp label="คำอธิบาย" value={form.description || ''} 
        onChange={v => setForm(p => ({...p, description: v}))} placeholder="อธิบายบทบาทของหน่วยงานนี้" />
    </div>
  </div>

  {/* Section 2: โครงสร้างองค์กร */}
  <div style={{ marginBottom: 20 }}>
    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '0.05em', color: C.textMuted, marginBottom: 12,
      paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
      โครงสร้างองค์กร
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <SearchableSel label="แผนกแม่ (Parent)" value={form.parentId}
        onChange={v => setForm(p => ({...p, parentId: v}))}
        options={[{ value: '', label: '— ไม่มี (Root) —' }, ...depts.map(d => ({
          value: d.id, label: `${ORG_LEVEL_CONFIG[d.type]?.icon || ''} ${d.name} (${d.code})`
        }))]}
        placeholder="ค้นหาแผนกแม่..." />
      <SearchableSel label="หัวหน้าแผนก" value={form.headId}
        onChange={v => setForm(p => ({...p, headId: v}))}
        options={[{ value: '', label: '— ยังไม่กำหนด —' }, ...emps.map(e => ({
          value: e.id, label: `${e.name} (${e.empCode})`
        }))]}
        placeholder="ค้นหาพนักงาน..." />
      <SearchableSel label="Cost Center" value={form.costCenterId}
        onChange={v => setForm(p => ({...p, costCenterId: v}))}
        options={[{ value: '', label: '— ไม่ระบุ —' }, ...costCenters.map(c => ({
          value: c.id, label: `${c.name} (${c.code})`
        }))]}
        placeholder="ค้นหา Cost Center..." />
    </div>
  </div>

  {/* Section 3: ข้อมูลระหว่างประเทศ (แสดงเฉพาะ type Country/Branch/Company) */}
  {['Country', 'Company', 'Branch'].includes(form.type) && (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.05em', color: C.textMuted, marginBottom: 12,
        paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
        ข้อมูลระหว่างประเทศ
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <Inp label="Country Code (ISO 3166)" value={form.countryCode || ''}
          onChange={v => setForm(p => ({...p, countryCode: v.toUpperCase().slice(0,2)}))}
          placeholder="เช่น TH, SG, US" />
        <Inp label="สกุลเงิน (ISO 4217)" value={form.currency || ''}
          onChange={v => setForm(p => ({...p, currency: v.toUpperCase().slice(0,3)}))}
          placeholder="เช่น THB, SGD" />
        <Sel label="Timezone" value={form.timezone || 'Asia/Bangkok'}
          onChange={v => setForm(p => ({...p, timezone: v}))}
          options={[
            { value: 'Asia/Bangkok', label: 'Asia/Bangkok (ICT +7)' },
            { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT +8)' },
            { value: 'Asia/Yangon', label: 'Asia/Yangon (MMT +6:30)' },
            { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho_Chi_Minh (ICT +7)' },
            { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST +9)' },
            { value: 'UTC', label: 'UTC +0' },
          ]} />
      </div>
    </div>
  )}

  {/* Action buttons */}
  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
    <Btn variant="ghost" onClick={() => setShowModal(false)}>ยกเลิก</Btn>
    <Btn onClick={saveDept}>{editingDept ? 'บันทึกการแก้ไข' : 'สร้างหน่วยงาน'}</Btn>
  </div>
</Modal>
```

### Redesign: Add/Edit Position Modal

Same section pattern:

Section 1: ข้อมูลพื้นฐาน
  - ชื่อตำแหน่ง (full width)
  - รหัสตำแหน่ง, ระดับ (grade)

Section 2: การจัดวาง
  - แผนก (SearchableSel)
  - ประเภทงาน (select: fulltime/parttime/contract)

Section 3: เงินเดือน
  - Min salary, Max salary (2 columns)

---

## PART 2: Org Chart Export

### Current state
OrgTree is CSS div-based (no SVG) — need html2canvas for PNG export.

### Install html2canvas
cd hris && npm install html2canvas

### Add export button in chart tab

```jsx
{tab === "chart" && (
  <div>
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, gap: 8 }}>
      <Btn variant="secondary" onClick={handleExportPNG}>
        ⬇ Export PNG
      </Btn>
      <Btn variant="secondary" onClick={handleExportPDF}>
        ⬇ Export PDF
      </Btn>
    </div>
    <div id="org-chart-container" style={{ background: C.bg, padding: 24, borderRadius: 12 }}>
      {rootDepts.map(root => (
        <OrgTree key={root.id} node={root} allDepts={depts} emps={emps} />
      ))}
    </div>
  </div>
)}
```

### Export handlers

```javascript
const handleExportPNG = async () => {
  const html2canvas = (await import('html2canvas')).default;
  const container = document.getElementById('org-chart-container');
  if (!container) return;
  
  try {
    const canvas = await html2canvas(container, {
      backgroundColor: '#F8FAFC',
      scale: 2, // retina quality
      useCORS: true,
      logging: false,
    });
    const link = document.createElement('a');
    link.download = `org-chart-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('ส่งออก Org Chart PNG สำเร็จ', 'success');
  } catch (err) {
    showToast('ส่งออกไม่สำเร็จ: ' + err.message, 'error');
  }
};

const handleExportPDF = async () => {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf'); // check if jspdf installed, if not use PNG fallback
  const container = document.getElementById('org-chart-container');
  if (!container) return;
  
  try {
    const canvas = await html2canvas(container, { backgroundColor: '#F8FAFC', scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width / 2, canvas.height / 2]
    });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save(`org-chart-${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('ส่งออก Org Chart PDF สำเร็จ', 'success');
  } catch (err) {
    // fallback to PNG if jsPDF not available
    showToast('PDF ไม่พร้อมใช้งาน กรุณาใช้ PNG แทน', 'warning');
    handleExportPNG();
  }
};
```

### Check if jspdf is installed
  grep -n "jspdf\|jsPDF" hris/package.json

If not installed: npm install jspdf
Show npm install output.

---

## OrgTree UX Improvements

While we're in the chart section, improve OrgTree visual:

Current: Simple colored boxes with just name + type badge
Improve:
1. Show employee count badge ด้วย (employeeCount)
2. Show headId/head name ถ้ามี
3. Click node → show quick info card (position in tree, employees, parent)
4. Collapse/expand children (add toggle button)

For toggle:
```jsx
const OrgTree = ({ node, allDepts, emps }) => {
  const [collapsed, setCollapsed] = useState(false);
  const children = allDepts.filter(d => d.parentId === node.id);
  const cfg = ORG_LEVEL_CONFIG[node.type] || ORG_LEVEL_CONFIG.Department;
  const head = emps.find(e => e.id === node.headId);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 8px' }}>
      <div style={{ 
        background: cfg.bgHeader, color: '#fff', borderRadius: 10,
        padding: '10px 16px', minWidth: 160, maxWidth: 220,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer',
        position: 'relative'
      }}>
        <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 2 }}>{cfg.icon} {node.type}</div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{node.name}</div>
        <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{node.code}</div>
        {head && <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>👤 {head.name}</div>}
        <div style={{ fontSize: 11, opacity: 0.75 }}>👥 {node.employeeCount || 0} คน</div>
        {children.length > 0 && (
          <button 
            onClick={e => { e.stopPropagation(); setCollapsed(!collapsed); }}
            style={{ 
              position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)',
              background: cfg.bgHeader, border: '2px solid #fff', borderRadius: '50%',
              width: 20, height: 20, cursor: 'pointer', fontSize: 10, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
            }}
          >
            {collapsed ? '▼' : '▲'}
          </button>
        )}
      </div>
      {!collapsed && children.length > 0 && (
        <>
          {/* connector line */}
          <div style={{ width: 2, height: 20, background: '#CBD5E1' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
            {children.length > 1 && (
              <div style={{ 
                position: 'absolute', top: 0, left: '50%', 
                transform: 'translateX(-50%)',
                width: `${(children.length - 1) * 100}%`, 
                height: 2, background: '#CBD5E1' 
              }} />
            )}
            {children.map(child => (
              <OrgTree key={child.id} node={child} allDepts={allDepts} emps={emps} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
```

---

## Commit Strategy

Backend: (no backend changes in this sprint)

Frontend (hris/ repo):
  feat(org): redesign department and position modals with sections
  feat(org): add collapse/expand and head/count display to OrgTree
  feat(org): add PNG and PDF export for Org Chart (html2canvas)

---

## Verification

1. เปิด Organization → tab แผนก → คลิก "+ เพิ่มแผนก"
   ต้องเห็น 3 sections: ข้อมูลพื้นฐาน / โครงสร้างองค์กร / ข้อมูลระหว่างประเทศ
   Section ที่ 3 ต้องซ่อนอยู่สำหรับ type = Department

2. เลือก type = Country → Section ข้อมูลระหว่างประเทศต้องปรากฏ

3. เปิด tab Org Chart
   ต้องเห็นปุ่ม "Export PNG" และ "Export PDF"
   กด Export PNG → ไฟล์ต้องดาวน์โหลด + toast ✅

4. คลิกปุ่ม ▲/▼ บน OrgTree node → children ต้อง collapse/expand

5. grep -n "html2canvas\|jspdf" hris/package.json
   Expected: ทั้งสองอยู่ใน dependencies

6. git log --oneline -4 (from hris/ dir)
   Expected: 3 commits ใหม่

Show all 6 verification outputs.