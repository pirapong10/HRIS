import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

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
import payrollComponentRoutes from './routes/payrollComponent.routes';
import dashboardRoutes from './routes/dashboard.routes';
import headcountRoutes from './routes/headcount.routes';

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
app.use('/api/payroll-components', payrollComponentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/headcount', headcountRoutes);

import notificationRoutes from './routes/notification.routes';
app.use('/api/notifications', notificationRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'HRIS API is running' });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
