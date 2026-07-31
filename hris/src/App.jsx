import React, { useState, useRef, useCallback, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AuthCtx } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import { C } from "./utils/theme";

import { Avatar } from "./components/common/UI";
import { ToastProvider } from "./components/common/Toast";

import { Organization } from "./pages/Organization";
import { Employee } from "./pages/Employee";
import { Attendance } from "./pages/Attendance";
import { Payroll } from "./pages/Payroll";
import { PayrollConfig } from "./pages/PayrollConfig";
import { Settings } from "./pages/Settings";
import { Dashboard } from "./pages/Dashboard";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { ShiftManagement } from "./pages/ShiftManagement";
import { AccessControlModule } from "./pages/AccessControlModule";
import { AuditLogModule } from "./pages/AuditLogModule";
import { Login } from "./pages/Login";
import LeaveRequest from "./pages/LeaveRequest";
import { OTRequest } from "./pages/OTRequest";
import { LeaveAdmin } from "./pages/LeaveAdmin";
import { Approvals } from "./pages/Approvals";

const NAV = [
  { id: "dashboard", label: "แดชบอร์ด", icon: "📊", permission: "dashboard:view" },
  { id: "organization", label: "องค์กร", icon: "🏢", permission: "org:view" },
  { id: "employees", label: "พนักงาน", icon: "👥", permission: "employee:view" },
  { id: "attendance", label: "เวลาทำงาน", icon: "⏰", permission: "attendance:view" },
  { id: "shifts", label: "กะทำงาน", icon: "📅", permission: "shift:view" },
  { id: "leave_request", label: "ขอลาหยุด", icon: "📝", permission: "leave:view" },
  { id: "ot_request", label: "ขอล่วงเวลา (OT)", icon: "⏱️", permission: "leave:view" },
  { id: "leave_admin", label: "จัดการวันลา (HR)", icon: "🏛️", permission: "leave:approve" },
  { id: "approvals", label: "การอนุมัติ", icon: "✅", permission: "leave:approve" },
  { id: "payroll", label: "เงินเดือน", icon: "💰", permission: "payroll:view" },
  { id: "payroll_config", label: "ตั้งค่าเงินเดือน", icon: "🛠️", permission: "payroll:edit" },
  { id: "access_control", label: "สิทธิ์", icon: "🔐", permission: "role:view" },
  { id: "audit_logs", label: "ประวัติ", icon: "📝", permission: "audit:view" },
  { id: "settings", label: "ตั้งค่า", icon: "⚙️", permission: "settings:view" },
];

const hasPerm = (user, permCode) => {
  if (!user) return false;
  if (user.roles?.includes("SUPER_ADMIN")) return true;
  return user.permissions?.includes(permCode) || false;
};

const NotificationCenter = () => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)}
        style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <span style={{ fontSize: 16 }}>🔔</span>
        <span style={{ position: "absolute", top: -2, right: -2, background: C.danger, color: "#fff", fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>3</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: 46, right: 0, width: 320, background: C.surface, borderRadius: 12, boxShadow: "0 10px 40px rgba(0,0,0,0.12)", border: `1px solid ${C.border}`, zIndex: 100, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 14, color: C.text, display: "flex", justifyContent: "space-between" }}>
            การแจ้งเตือน
            <button onClick={() => setOpen(false)} style={{ border: "none", background: "none", cursor: "pointer", color: C.textLight }}>✕</button>
          </div>
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.borderLight}`, display: "flex", gap: 12, background: C.brandLight + "44" }}>
              <div style={{ width: 8, height: 8, background: C.brand, borderRadius: "50%", marginTop: 6, flexShrink: 0 }}></div>
              <div>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>พนักงานใหม่ (วิจิตร) อัปโหลดเอกสารครบแล้ว</div>
                <div style={{ fontSize: 11, color: C.textLight, marginTop: 4 }}>10 นาทีที่แล้ว</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MainApp = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const page = location.pathname.substring(1) || "dashboard";

  // Filter nav by RBAC permissions
  const nav = NAV.filter(n => {
    return hasPerm(user, n.permission);
  });
  
  // Ensure current page is accessible
  const accessibleIds = nav.map(n => n.id);
  const safePage = accessibleIds.includes(page) ? page : (accessibleIds[0] || 'dashboard');

  // [FIX-HIGH-1] Session timeout: auto-logout after 30 min of inactivity
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  const idleTimer = useRef(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      alert("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่ (ไม่มีการใช้งานเกิน 30 นาที)");
      onLogout();
    }, IDLE_TIMEOUT_MS);
  }, [onLogout]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer));
    resetIdleTimer(); // start on mount
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdleTimer]);

  const pages = {
    dashboard: <Dashboard />,
    organization: <Organization />,
    employees: <Employee />,
    attendance: <Attendance />,
    shifts: <ShiftManagement />,
    leave_request: <LeaveRequest />,
    ot_request: <OTRequest />,
    leave_admin: <LeaveAdmin />,
    approvals: <Approvals />,
    payroll: <Payroll />,
    payroll_config: <PayrollConfig />,
    access_control: <AccessControlModule user={user} />,
    audit_logs: <AuditLogModule />,
    settings: <Settings />,
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <div style={{ width: 240, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${C.borderLight}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.brand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏢</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>PS HRIS</div>
              <div style={{ fontSize: 11, color: C.textLight }}>v2.0 · PS Trading</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {nav.map(n => (
            <button key={n.id} onClick={() => navigate(`/${n.id}`)}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px", border: "none", cursor: "pointer", borderRadius: 8, marginBottom: 2, textAlign: "left",
                background: safePage === n.id ? C.brandLight : "transparent",
                color: safePage === n.id ? C.brand : C.textMuted,
                fontWeight: safePage === n.id ? 700 : 400, fontSize: 13
              }}>
              <span style={{ fontSize: 16 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 10px", borderTop: `1px solid ${C.borderLight}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px" }}>
            <Avatar name={user.name} size={32} color={user.roles?.includes("SUPER_ADMIN") ? C.purple : user.roles?.includes("HR_ADMIN") ? C.brand : C.success} />
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
              <div style={{ fontSize: 11, color: C.textLight }}>{user.roles?.includes("SUPER_ADMIN") ? "Superadmin" : user.roles?.includes("HR_ADMIN") ? "HR Admin" : "Employee"}</div>
            </div>
            <button onClick={() => {
              onLogout();
            }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.textLight }} title="ออกจากระบบ">⬡</button>
          </div>
        </div>
      </div>
      <main style={{ flex: 1, padding: "28px 32px", overflowY: "auto", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
            <NotificationCenter />
        </div>
        <ErrorBoundary>
          <Routes>
            {nav.map(n => (
              <Route key={n.id} path={`/${n.id}`} element={pages[n.id] || <Dashboard />} />
            ))}
            <Route path="*" element={<Navigate to={`/${safePage}`} replace />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("hris_user");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const handleLogin = (userData, token) => {
    setUser(userData);
    try { 
      localStorage.setItem("hris_user", JSON.stringify(userData)); 
      if (token) localStorage.setItem("hris_token", token);
    } catch {}
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem("hris_user");
      localStorage.removeItem("hris_token");
    } catch {}
  };

  return (
    <SettingsProvider>
      <ToastProvider>
        <AuthCtx.Provider value={{ user, hasPerm: (p) => hasPerm(user, p), login: handleLogin, logout: handleLogout }}>
          {user ? <MainApp user={user} onLogout={handleLogout} /> : <Login />}
        </AuthCtx.Provider>
      </ToastProvider>
    </SettingsProvider>
  );
}
