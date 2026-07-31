import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import { C } from '../utils/theme';
import { Inp, Btn } from '../components/common/UI';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [view, setView] = useState("login"); // login, forgot, reset, mfa
  const [email, setEmail] = useState(""); 
  const [pass, setPass] = useState(""); 
  const [err, setErr] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPass, setNewPass] = useState("");

  const handleLoginSuccess = (u, token) => {
    login(u, token);
    navigate("/");
  };

  const go = async () => {
    setLoading(true); setErr("");
    try {
      const res = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass, mfaCode })
      });
      const data = await res.json();
      
      if (res.ok) {
        if (data.requireMfa) {
          setView("mfa");
        } else {
          const apiUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.email.split("@")[0],

            empId: data.user.empId,
            permissions: data.user.permissions,
            roles: data.user.roles,
            level: data.user.level,
            deptIds: data.user.deptIds
          };
          handleLoginSuccess(apiUser, data.token);
        }
      } else {
        setErr(data.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      }
    } catch {
      setErr("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    }
    setLoading(false);
  };

  const verifyMFA = () => {
    go();
  };

  const reqReset = () => {
    if (!email) return setErr("กรุณากรอกอีเมล");
    setView("reset");
    setErr("");
  };

  const doReset = async () => {
    if (!resetToken || !newPass) return setErr("กรุณากรอกข้อมูลให้ครบ");
    const u = USERS.find(user => user.email === email);
    if (u && resetToken === "0000") {
      u.passwordHash = await hashPassword(newPass);
      logAudit(u.id, "Password Reset Success", "Auth");
      setView("login");
      setErr("");
      setPass("");
      alert("รีเซ็ตรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่");
    } else {
      setErr("Token ไม่ถูกต้อง (ใช้ 0000 เพื่อทดสอบ)");
      if (u) logAudit(u.id, "Password Reset Failed (Invalid Token)", "Auth");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg,${C.brand} 0%,#7C3AED 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "40px 44px", width: 420, boxShadow: "0 30px 80px rgba(0,0,0,0.2)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: C.brand, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 28 }}>🏢</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text }}>PS HRIS</h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: C.textMuted }}>Human Resource Information System v2.0</p>
        </div>
        
        {view === "login" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Inp label="อีเมล" value={email} onChange={setEmail} type="email" placeholder="your@company.com" />
            <Inp label="รหัสผ่าน" value={pass} onChange={setPass} type="password" placeholder="••••••••" />
            {err && <div style={{ background: C.dangerLight, color: C.danger, borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>{err}</div>}
            <Btn onClick={go} disabled={loading} size="lg" style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Btn>
            <button onClick={() => setView("forgot")} style={{ background: "none", border: "none", color: C.brand, cursor: "pointer", fontSize: 13, marginTop: 8 }}>ลืมรหัสผ่าน?</button>
          </div>
        )}

        {view === "mfa" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center" }}>กรุณากรอกรหัสจากแอป Authenticator<br/>(ทดสอบพิมพ์: 123456)</div>
            <Inp label="รหัส OTP 6 หลัก" value={mfaCode} onChange={setMfaCode} placeholder="123456" />
            {err && <div style={{ background: C.dangerLight, color: C.danger, borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>{err}</div>}
            <Btn onClick={verifyMFA} size="lg" style={{ width: "100%", justifyContent: "center" }}>ยืนยันรหัส</Btn>
            <button onClick={() => { setView("login"); setErr(""); }} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 13, marginTop: 8 }}>ยกเลิก</button>
          </div>
        )}

        {view === "forgot" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center" }}>กรอกอีเมลของคุณเพื่อรับรหัสรีเซ็ต</div>
            <Inp label="อีเมล" value={email} onChange={setEmail} type="email" />
            {err && <div style={{ background: C.dangerLight, color: C.danger, borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>{err}</div>}
            <Btn onClick={reqReset} size="lg" style={{ width: "100%", justifyContent: "center" }}>ขอรหัสผ่านใหม่</Btn>
            <button onClick={() => { setView("login"); setErr(""); }} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 13, marginTop: 8 }}>กลับไปเข้าสู่ระบบ</button>
          </div>
        )}

        {view === "reset" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center" }}>ระบบจำลองส่ง Token ไปที่อีเมลแล้ว<br/>(ทดสอบพิมพ์: 0000)</div>
            <Inp label="Token จากอีเมล" value={resetToken} onChange={setResetToken} placeholder="0000" />
            <Inp label="รหัสผ่านใหม่" value={newPass} onChange={setNewPass} type="password" />
            {err && <div style={{ background: C.dangerLight, color: C.danger, borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>{err}</div>}
            <Btn onClick={doReset} size="lg" style={{ width: "100%", justifyContent: "center" }}>ตั้งรหัสผ่านใหม่</Btn>
            <button onClick={() => { setView("login"); setErr(""); }} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 13, marginTop: 8 }}>กลับไปเข้าสู่ระบบ</button>
          </div>
        )}

        {view === "login" && (
          <div style={{ marginTop: 20, padding: "12px 14px", background: C.bg, borderRadius: 10, fontSize: 12, color: C.textMuted }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>บัญชีทดสอบ:</div>
            <div>👑 admin@company.com / Admin@123!</div>
            <div>👩‍💼 hr_director@company.com / admin1234</div>
            <div>👤 employee@company.com / admin1234</div>
          </div>
        )}
      </div>
    </div>
  );
};
