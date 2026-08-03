# 🔄 HRIS Enterprise — Real-World End-to-End Operational Workflows Specification

**System Name:** PS-Trading Enterprise HRIS (v2.0)  
**Document Type:** Role-Based Operational Workflow & Standard Operating Procedure (SOP) Specification  
**Date:** August 3, 2026  

---

## 📑 1. Overview of Organizational Roles

```mermaid
graph TD
    subgraph Operational_Tier [ระดับปฏิบัติการ & บังคับบัญชาชั้นต้น]
        R1[1. พนักงานทั่วไป - Employee L10]
        R2[2. หัวหน้างาน / Supervisor L30]
    end

    subgraph Management_Tier [ระดับบริหารแผนก & สายงาน]
        R3[3. ผู้จัดการแผนก - Department Manager L40-50]
        R4[4. เจ้าหน้าที่ฝ่ายบุคคล - HR Officer L40-50]
        R5[5. ผู้จัดการฝ่ายบุคคล - HR Manager/Director L60-80]
    end

    subgraph Finance_Payroll_Tier [ระดับการเงิน & จ่ายเงินเดือน]
        R6[6. เจ้าหน้าที่เงินเดือน - Payroll Officer L50-60]
        R7[7. ผู้จัดการเงินเดือน - Payroll Manager/CFO L70-80]
    end

    subgraph Governance_Tier [ระดับกำกับดูแล & ไอที]
        R8[8. ผู้ดูแลระบบ - System Admin/Security L90-100]
    end

    R1 --> R2 --> R3
    R4 --> R5
    R6 --> R7
    R8 -. กำหนดสิทธิ์ .- R1 & R3 & R5 & R7
```

---

## 📝 2. Role-Based End-to-End Workflows

---

### 👤 Role 1: พนักงานทั่วไป (Employee / Operational Staff - Level 10)

#### **เวิร์กโฟลว์ประจำวันและการยื่นคำร้อง (Daily Routine & Self-Service Workflow)**

```mermaid
sequenceDiagram
    autonumber
    actor EMP as พนักงาน (Employee)
    participant UI as HRIS Web Application
    participant API as Backend API Server
    participant DB as Database & Storage

    rect rgb(240, 248, 255)
        note over EMP, DB: 1. ตอกบัตรเข้า-ออกงานประจำวัน (Geofenced Check-In)
        EMP->>UI: เปิดหน้าจอตอกบัตร อนุญาต GPS & กล้องถ่ายภาพสด
        UI->>API: ตรวจสอบพิกัด GPS + อัปโหลดรูปภาพสด (CameraCheckIn)
        API->>DB: บันทึกเวลา, สถานะ (ON_TIME/LATE) และบันทึกภาพถ่าย
        API-->>UI: แสดง Badge สถานะสำเร็จ + เวลาตอกบัตร
    end

    rect rgb(255, 250, 240)
        note over EMP, DB: 2. ยื่นคำขอลา (Leave Request Workflow)
        EMP->>UI: เลือกประเภทการลา + วันที่เริ่ม-สิ้นสุด + แนบใบรับรองแพทย์ (ถ้ามี)
        UI->>API: คำนวณวันลาจริง (หักวันหยุด) และเช็กโควต้า LeaveBalance
        API->>DB: บันทึก Leave Record (pending_manager) + สร้าง ApprovalRequest
        API-->>UI: แสดงข้อความยื่นคำขอสำเร็จ
    end

    rect rgb(245, 255, 245)
        note over EMP, DB: 3. ยื่นขอ OT ล่วงหน้า (Pre-approval OT Request)
        EMP->>UI: ระบุวันที่ขอ OT + กะงาน + จำนวนชั่วโมง
        UI->>API: ตรวจสอบเพดาน OT สะสมสัปดาห์นี้ (ห้ามเกิน 36 ชม./สัปดาห์)
        API->>DB: บันทึกคำขอ OT ขึ้นสถานะ pending_manager
        API-->>UI: แจ้งยื่นคำขอ OT ล่วงหน้าสำเร็จ
    end
```

---

### 👔 Role 2: หัวหน้างาน / ซูเปอร์ไวเซอร์ (Team Leader / Supervisor - Level 30)

#### **เวิร์กโฟลว์กำกับดูแลทีมอนุมัติชั้นที่ 1 (First-line Team Supervision Workflow)**
1. **ติดตามการลงเวลาของลูกทีมประจำวัน (Daily Team Monitoring)**:
   - เข้าสู่ระบบดูหน้า Dashboard สรุปจำนวนทีมงานที่มาตรงเวลา, มาสาย (`LATE`), หรือยังไม่ตอกบัตร
2. **กลั่นกรองคำขอชั้นแรก (Step 1 Initial Verification)**:
   - ตรวจสอบคำขอลา / OT / ขอแก้ไขเวลา ของลูกทีมในสังกัด
   - หากเห็นชอบ: ส่งต่อคำขอขึ้นสถานะ `pending_manager` เพื่อให้ผู้จัดการอนุมัติขั้นสุดท้าย
   - หากไม่เห็นชอบ: กดปฏิเสธพร้อมระบุเหตุผลชัดเจน

---

### 🏢 Role 3: ผู้จัดการแผนก (Department Manager - Level 40-50)

#### **เวิร์กโฟลว์อนุมัติขั้นสุดท้ายและการบริหารอัตรากำลัง (Department Approval & Headcount Workflow)**

```mermaid
flowchart TD
    Start([ผู้จัดการเข้าสู่ระบบ]) --> ViewApp[เปิดหน้า Unified Approval Hub]
    ViewApp --> SelectReq{เลือกคำขอ}
    
    SelectReq -->|คำขอลา / OT / แก้ไขเวลา| CheckQuota[ตรวจสอบโควต้า & ผลกระทบต่อกะงาน]
    CheckQuota --> Decision1{อนุมัติหรือไม่?}
    Decision1 -->|อนุมัติ| Appr[กดอนุมัติ -> ระบบอัปเดต LeaveBalance / OT Pay / Attendance Record]
    Decision1 -->|ปฏิเสธ| Rej[กรอกเหตุผลปฏิเสธ -> คืนโควต้าวันลาให้พนักงาน]
    
    SelectReq -->|ขอเพิ่มอัตรากำลัง| ReqHeadcount[ยื่น Headcount Request พร้อมงบประมาณ]
    ReqHeadcount --> SendHR[ส่งคำขอไปยังผู้จัดการฝ่ายบุคคลเพื่อพิจารณา]
```

---

### 📋 Role 4: เจ้าหน้าที่ฝ่ายบุคคล / สรรหา (HR Officer - Level 40-50)

#### **เวิร์กโฟลว์การบริหารข้อมูลพนักงานและวันหยุด (Employee Master Data & Attendance Audit Workflow)**
1. **การบันทึกพนักงานใหม่ (Employee Onboarding)**:
   - บันทึกประวัติพนักงาน, กำหนดประเภทพนักงาน (`EmployeeType`), กะงานประจำ (`Shift`), เลขบัญชีธนาคาร, เลขประกันสังคม, และ Tax ID
2. **การจัดการวันหยุดและนโยบายการลา (Calendar & Leave Policy Management)**:
   - กำหนดวันหยุดนักขัตฤกษ์ประจำปี (`PublicHoliday`) และตั้งค่านโยบายสิทธิ์การลาตามอายุงาน
3. **การตรวจสอบความถูกต้องของการลงเวลาก่อนตัดวิก (Pre-Payroll Attendance Audit)**:
   - ตรวจสอบและอนุมัติคำขอแก้ไขเวลาลงงานย้อนหลัง
   - ส่งออกรายงานการลงเวลาและการลาเป็นไฟล์ Excel (`export/excel`) เพื่อส่งต่อให้ฝ่ายเงินเดือน

---

### 👑 Role 5: ผู้จัดการฝ่ายบุคคล / ผู้อำนวยการ HR (HR Manager/Director - Level 60-80)

#### **เวิร์กโฟลว์การบริหารโครงสร้างองค์กร นโยบาย และอนุมัติ Headcount (HR Executive Workflow)**
1. **การบริหารโครงสร้างองค์กร (Organization Subtree Hierarchy)**:
   - กำหนดโครงสร้าง Region -> Branch -> Department และกำหนดตำแหน่งงาน (`Position`)
   - บริหารจัดการ Smart Delete ป้องกันการลบแผนกที่มีพนักงานผูกอยู่
2. **การอนุมัติ Headcount & Job Requisitions**:
   - พิจารณาอนุมัติคำขอเพิ่มอัตรากำลังจากผู้จัดการแผนกตามกรอบงบประมาณ
3. **การกำหนดนโยบายระบบ (System Policy Control)**:
   - กำหนดเงื่อนไขประกันสังคม (SSO Cap 750 THB), อัตราคูณ OT, และวิธีการคำนวณภาษีเงินได้

---

### 💸 Role 6: เจ้าหน้าที่ฝ่ายจ่ายเงินเดือน (Payroll Officer / Specialist - Level 50-60)

#### **เวิร์กโฟลว์คำนวณเงินเดือนและออกไฟล์โอนเงิน (Payroll Computation & Export Workflow)**

```mermaid
sequenceDiagram
    autonumber
    actor PAY as เจ้าหน้าที่เงินเดือน (Payroll Officer)
    participant UI as HRIS Application
    participant ENG as Backend Payroll Engine
    participant DB as Enterprise Database

    PAY->>UI: เลือกงวดเงินเดือน (เช่น 2026-07) กด "คำนวณเงินเดือน"
    UI->>ENG: เรียก runPayroll (ระบบเปิด Distributed Execution Lock)
    ENG->>DB: กรองพนักงานตาม PayrollScope ของผู้ใช้
    ENG->>ENG: ประมวลผล Math.js (เงินเดือน + OT - ภาษี พ.ง.ด.1 - SSO)
    ENG->>DB: บันทึก PayrollRunDetail และ Audit Log
    ENG-->>UI: แสดงตารางสรุปผลเงินเดือนสุทธิ
    
    PAY->>UI: กดส่งออกไฟล์โอนเงินธนาคาร (Bank Transfer TXT)
    UI-->>PAY: ดาวน์โหลดไฟล์ TXT ตามฟอร์แมตธนาคาร
    
    PAY->>UI: กดส่งออกรายงานประกันสังคม (สปส. 1-10 CSV)
    UI-->>PAY: ดาวน์โหลดไฟล์ CSV สำหรับนำส่งประกันสังคมออนไลน์
```

---

### 📑 Role 7: ผู้จัดการฝ่ายเงินเดือน / ผู้อำนวยการการเงิน (Payroll Manager / CFO - Level 70-80)

#### **เวิร์กโฟลว์ตรวจสอบ Audit Trail และอนุมัติจ่ายเงินเดือน (Payroll Audit & Final Approval Workflow)**
1. **การตรวจสอบ Audit Log เงินเดือน (Payroll Audit Inspection)**:
   - ตรวจสอบรายการโอนเงิน, ภาษีหัก ณ ที่จ่าย และเงินสมทบประกันสังคมสะสม
   - ตรวจสอบ `EnterpriseAuditLog` พร้อม Cryptographic SHA-256 Hash เพื่อยืนยันว่าไม่มีการแก้ไขยอดเงินโดยมิชอบ
2. **การอนุมัติจ่ายเงินเดือนขั้นสุดท้าย (Final Payroll Approval)**:
   - ปรับสถานะงวดเงินเดือนจาก `draft` เป็น `approved`
   - ระบบเปิดให้พนักงานดาวน์โหลดสลิปเงินเดือนรูปแบบ PDF ได้ทันที

---

### 🛡️ Role 8: ผู้ดูแลระบบ / เจ้าหน้าที่ความปลอดภัย (System Admin / Security Officer - Level 90-100)

#### **เวิร์กโฟลว์การบริหารสิทธิ์ RBAC และความปลอดภัยระบบ (System Administration & Security Governance)**
1. **การกำหนดสิทธิ์การใช้งาน (RBAC & AuthGroup Setup)**:
   - กำหนด Role, Permission, และผูก DataScope / PayrollScope ให้ผู้ใช้งานแต่ละท่าน
2. **การตั้งค่าพิกัด Geofence และกฎการมาสาย**:
   - ปรับตั้งค่า ละติจูด/ลองจิจูด ของบริษัท, ระยะรัศมีตอกบัตรที่อนุญาต (`allowedRadiusM`) และระยะเวลาอนุโลมสาย (`lateThresholdMins`)
3. **การกำกับดูแลความปลอดภัย (Session Security & Audit)**:
   - ตรวจสอบการยกเลิก Token (JWT Blacklist) และสุ่มตรวจความถูกต้องของ Audit Logs ในระบบ

---

## 📊 3. Operational Matrix by Role & Permission Summary

| บทบาท (Role) | ตอกบัตร / ยื่นลา / OT | อนุมัติวันลา / OT | บริหารองค์กร / พนักงาน | คำนวณเงินเดือน | ส่งออกไฟล์ธนาคาร / สปส. | อนุมัติเงินเดือนสุทธิ | กำหนดสิทธิ์ RBAC / Geofence |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **พนักงานทั่วไป** | ✅ (เฉพาะตนเอง) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **หัวหน้างาน** | ✅ (เฉพาะตนเอง) | 🟡 (กลั่นกรอง ชั้นที่ 1) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **ผู้จัดการแผนก** | ✅ (เฉพาะตนเอง) | ✅ (อนุมัติในแผนก) | 🟡 (ยื่น Headcount) | ❌ | ❌ | ❌ | ❌ |
| **เจ้าหน้าที่ HR** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **ผู้จัดการ HR** | ✅ | ✅ | ✅ (สิทธิ์เต็ม) | ❌ | ❌ | ❌ | ❌ |
| **เจ้าหน้าที่เงินเดือน** | ✅ | ❌ | ❌ | ✅ (ตาม Scope) | ✅ | ❌ | ❌ |
| **ผู้จัดการเงินเดือน** | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **System Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---
*เอกสารข้อกำหนดขั้นตอนการทำงานจริง (Standard Operating Procedures - SOP) สำหรับระบบ PS-Trading Enterprise HRIS v2.0*
