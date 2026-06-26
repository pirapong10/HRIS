import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes';
import employeeRoutes from './routes/employee.routes';
import attendanceRoutes from './routes/attendance.routes';
import approvalRoutes from './routes/approval.routes';
import departmentRoutes from './routes/department.routes';
import positionRoutes from './routes/position.routes';
import costcenterRoutes from './routes/costcenter.routes';
import rbacRoutes from './routes/rbac.routes';
import payrollRoutes from './routes/payroll.routes';
import leaveRoutes from './routes/leave.routes';
import settingsRoutes from './routes/settings.routes';
import shiftRoutes from './routes/shift.routes';
import mfaRoutes from './routes/mfa.routes';
import otRoutes from './routes/ot.routes';
import authGroupRoutes from './routes/authGroup.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Global API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per `window`
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/costcenters', costcenterRoutes);
app.use('/api/rbac', rbacRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/mfa', mfaRoutes);
app.use('/api/ot', otRoutes);
app.use('/api/auth-groups', authGroupRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'HRIS API is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
