import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SectionHeader, StatCard, Card, Avatar, Badge, statusBadge } from '../components/common/UI';
import { C } from '../utils/theme';
import { fmtB, getEmpName, getShift } from '../utils/helpers';
import api from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const Dashboard = () => {
  const { user } = useAuth();
  
  const [stats, setStats] = useState({
    empCount: 0,
    shiftCount: 0,
    pendingOT: 0,
    totalOTPay: 0,
    totalNet: 0
  });
  const [recentOT, setRecentOT] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [empsMap, setEmpsMap] = useState({});
  const [chartData, setChartData] = useState({ otCostsData: [], leaveData: [], departmentData: [] });

  useEffect(() => {
    const load = async () => {
      try {
        const [empRes, shiftRes, otRes, payrollRes, summaryRes] = await Promise.allSettled([
          api.get('/employees?limit=1000'),
          api.get('/shifts?limit=100'),
          api.get('/ot?limit=100'),
          api.get('/payroll'),
          api.get('/dashboard/summary')
        ]);

        if (summaryRes.status === 'fulfilled') {
          setChartData(summaryRes.value.data);
        }

        let empList = [];
        if (empRes.status === 'fulfilled' && empRes.value.data) {
          empList = Array.isArray(empRes.value.data) ? empRes.value.data : (empRes.value.data.data || []);
          const map = {};
          empList.forEach(e => map[e.id] = e);
          setEmpsMap(map);
        }

        let shiftList = [];
        if (shiftRes.status === 'fulfilled' && shiftRes.value.data) {
          shiftList = Array.isArray(shiftRes.value.data) ? shiftRes.value.data : (shiftRes.value.data.data || []);
          setShifts(shiftList.slice(0, 5));
        }

        let otList = [];
        let pOT = 0;
        if (otRes.status === 'fulfilled' && otRes.value.data) {
          const raw = Array.isArray(otRes.value.data) ? otRes.value.data : (otRes.value.data.data || []);
          otList = raw;
          pOT = raw.filter(o => o.status === 'pending_manager' || o.status === 'pending_hr').length;
          setRecentOT(raw.slice(0, 5));
        }

        let tNet = 0;
        let tOTPay = 0;
        if (payrollRes.status === 'fulfilled' && Array.isArray(payrollRes.value.data)) {
          const pr = payrollRes.value.data;
          tNet = pr.reduce((s, p) => s + (p.net || 0), 0);
          tOTPay = pr.reduce((s, p) => s + (p.otPay || 0), 0);
        }

        setStats({
          empCount: empList.length,
          shiftCount: shiftList.length,
          pendingOT: pOT,
          totalOTPay: tOTPay,
          totalNet: tNet
        });

      } catch (err) {
        console.error("Dashboard fetch error", err);
      }
    };
    load();
  }, []);

  return (
    <div>
      <SectionHeader title={`สวัสดี ${user?.name || ''} 👋`} sub="ภาพรวมระบบ HR ประจำวันนี้" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
        <StatCard label="พนักงานทั้งหมด" value={stats.empCount} sub="ปฏิบัติงานอยู่" color={C.brand} icon="👥" />
        <StatCard label="กะทั้งหมด" value={stats.shiftCount} sub="ประเภทกะ" color={C.teal} icon="⏰" />
        <StatCard label="OT รออนุมัติ" value={stats.pendingOT} sub="คำขอ" color={C.warning} icon="⏳" />
        <StatCard label="ค่าโอทีรวม" value={fmtB(stats.totalOTPay)} sub="ทุกพนักงานในขอบเขต" color={C.orange} icon="💪" />
        <StatCard label="จ่ายสุทธิรวม" value={fmtB(stats.totalNet)} sub="งวดล่าสุด" color={C.success} icon="💰" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 20 }}>
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>สถิติค่า OT (6 งวดล่าสุด)</div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.otCostsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toLocaleString()} ฿`} />
                <Legend />
                <Bar dataKey="otCost" name="ค่าโอที (บาท)" fill={C.orange} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>การใช้วันลา (อนุมัติแล้ว)</div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData.leaveData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {chartData.leaveData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} วัน`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>คำขอ OT ล่าสุด</div>
          {recentOT.map(o => {
            const eName = empsMap[o.empId]?.name || getEmpName(o.empId);
            return (
              <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.borderLight}` }}>
                <Avatar name={eName} size={30} color={C.orange} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{eName} — {o.requestedHours} ชม.</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{new Date(o.date).toLocaleDateString('th-TH')} · {o.shift?.name || getShift(o.shiftId)?.name}</div>
                </div>
                {statusBadge(o.status)}
              </div>
            );
          })}
          {recentOT.length === 0 && <div style={{ fontSize: 13, color: C.textMuted }}>ไม่มีข้อมูล OT</div>}
        </Card>
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>กะการทำงาน</div>
          {shifts.map(s => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.borderLight}` }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color || C.teal, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{s.startTime}–{s.endTime} · OT ×{s.otRate || 1.5}</div>
              </div>
            </div>
          ))}
          {shifts.length === 0 && <div style={{ fontSize: 13, color: C.textMuted }}>ไม่มีข้อมูลกะการทำงาน</div>}
        </Card>
      </div>
    </div>
  );
};
