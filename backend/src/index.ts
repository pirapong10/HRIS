import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import path from 'path';

dotenv.config();

import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes';
import employeeRoutes from './routes/employee.routes';
import attendanceRoutes from './routes/attendance.routes';
import approvalsRoutes from './routes/approvals.routes';
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
import payrollComponentRoutes from './routes/payrollComponent.routes';
import dashboardRoutes from './routes/dashboard.routes';
import headcountRoutes from './routes/headcount.routes';
import payrollConfigRoutes from './routes/payrollConfig.routes';
import employeeTypeRoutes from './routes/employeeType.routes';
import publicHolidayRoutes from './routes/public-holiday.routes';
import leavePolicyRoutes from './routes/leave-policy.routes';
import adminLeaveRoutes from './routes/admin-leave.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:5174'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123') as any;
    socket.data.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  socket.join(`user_${userId}`);
  
  socket.on('disconnect', () => {});
});

// Global API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 200 : 5000, // Limit each IP to 200 in prod, 5000 in dev
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/approvals', approvalsRoutes);
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
app.use('/api/payroll-components', payrollComponentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/headcount', headcountRoutes);
app.use('/api/payroll-config', payrollConfigRoutes);
app.use('/api/employee-types', employeeTypeRoutes);
app.use('/api/public-holidays', publicHolidayRoutes);
app.use('/api/leave-policies', leavePolicyRoutes);
app.use('/api/admin/leave', adminLeaveRoutes);

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

import notificationRoutes from './routes/notification.routes';
app.use('/api/notifications', notificationRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'HRIS API is running' });
});

import { startLeaveAccrualJob } from './jobs/leave-accrual.job';
import { startEndOfYearJob, processEndOfYear } from './jobs/end-of-year.job';

// Initialize Cron Jobs
startLeaveAccrualJob();
startEndOfYearJob();

// Secure manual trigger for EOY (admin use only in emergencies)
app.post('/api/admin/leave/trigger-end-of-year', async (req, res) => {
  const { year } = req.body;
  const targetYear = year ? parseInt(year as string, 10) : new Date().getFullYear();
  try {
    const results = await processEndOfYear(targetYear);
    res.json({ message: `EOY processing complete for ${targetYear}`, count: results.length, results });
  } catch (err: any) {
    res.status(500).json({ message: 'EOY processing failed', details: err.message });
  }
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
