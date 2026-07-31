import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { C } from '../utils/theme';
import { Avatar, Btn } from './common/UI';
import { logAudit, USERS } from '../utils/mockData';
import { useNotifications } from '../hooks/useNotifications';

const NAV = [
  { id: "dashboard", path: "/", label: "Dashboard", icon: "🏠", permission: "dashboard:view" },
  { id: "organization", path: "/organization", label: "Organization", icon: "🏢", permission: "organization:view" },
  { id: "employees", path: "/employees", label: "Employee", icon: "👥", permission: "employee:view" },
  { id: "attendance", path: "/attendance", label: "Time & Att.", icon: "⏰", permission: "attendance:view" },
  { id: "shifts", path: "/shifts", label: "Shift Mgmt", icon: "🔄", permission: "shift:view" },
  { id: "payroll", path: "/payroll", label: "Payroll", icon: "💰", permission: "payroll:view" },
  { id: "access_control", path: "/access-control", label: "Access Control", icon: "🛡️", permission: "access_control:view" },
  { id: "audit_logs", path: "/audit-logs", label: "Audit Logs", icon: "📋", permission: "audit_logs:view" },
  { id: "settings", path: "/settings", label: "Settings", icon: "⚙️", permission: "settings:view" },
];

const NotificationCenter = ({ user }) => {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(user);

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, position: "relative" }}>
        🔔
        {unreadCount > 0 && <div style={{ position: "absolute", top: -2, right: -4, background: C.danger, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 5px", borderRadius: 10 }}>{unreadCount}</div>}
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: 32, width: 320, background: "#fff", borderRadius: 10, boxShadow: "0 10px 25px rgba(0,0,0,0.1)", zIndex: 100, overflow: "hidden", border: `1px solid ${C.borderLight}` }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
            <div style={{ fontWeight: 700 }}>การแจ้งเตือน</div>
            {unreadCount > 0 && <Btn variant="ghost" size="sm" onClick={markAllAsRead}>อ่านทั้งหมด</Btn>}
          </div>
          <div style={{ maxHeight: 350, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: C.textMuted, fontSize: 13 }}>ไม่มีการแจ้งเตือน</div>
            ) : notifications.map(n => (
              <div key={n.id} onClick={() => { if (!n.isRead) markAsRead(n.id); }} style={{ padding: "12px 16px", borderBottom: `1px solid ${C.borderLight}`, background: n.isRead ? "#fff" : C.brandLight, opacity: n.isRead ? 0.7 : 1, cursor: "pointer" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div>{n.type === "email" ? "📧" : "🔔"}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{n.message}</div>
                    <div style={{ fontSize: 11, color: C.textLight, marginTop: 6 }}>{new Date(n.createdAt).toLocaleString('th-TH')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const hasPerm = useCallback((perm) => {
    if (!user) return false;
    const perms = user.permissions || [];
    return perms.includes(perm);
  }, [user]);

  const nav = NAV.filter(n => {
    return hasPerm(n.permission);
  });

  const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
  const idleTimer = useRef(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      alert("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่ (ไม่มีการใช้งานเกิน 30 นาที)");
      logout();
      navigate('/login');
    }, IDLE_TIMEOUT_MS);
  }, [logout, navigate]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer));
    resetIdleTimer();

    const checkStatus = setInterval(() => {
      const currentUser = USERS.find(u => u.id === user.id);
      if (currentUser && currentUser.status === "suspended") {
        alert("บัญชีของคุณถูกระงับการใช้งาน");
        logout();
        navigate('/login');
      }
    }, 3000);

    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      if (idleTimer.current) clearTimeout(idleTimer.current);
      clearInterval(checkStatus);
    };
  }, [resetIdleTimer, user.id, logout, navigate]);

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
            <button key={n.id} onClick={() => navigate(n.path)}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px", border: "none", cursor: "pointer", borderRadius: 8, marginBottom: 2, textAlign: "left",
                background: location.pathname === n.path ? C.brandLight : "transparent",
                color: location.pathname === n.path ? C.brand : C.textMuted,
                fontWeight: location.pathname === n.path ? 700 : 400, fontSize: 13
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
              logAudit(user.id, "Logout", "Auth");
              logout();
              navigate('/login');
            }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.textLight }} title="ออกจากระบบ">⬡</button>
          </div>
        </div>
      </div>
      <main style={{ flex: 1, padding: "28px 32px", overflowY: "auto", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
           <NotificationCenter user={user} />
        </div>
        <Outlet />
      </main>
    </div>
  );
};
