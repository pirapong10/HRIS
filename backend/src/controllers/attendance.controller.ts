import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { buildEmployeeWhereClause } from '../utils/scopeFilter';
import { AuthRequest } from '../middlewares/auth.middleware';
import { GeoService } from '../utils/GeoService';
import ExcelJS from 'exceljs';
import { dispatchNotification } from '../utils/notification.service';

export const getAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const scopeWhere = req.user ? await buildEmployeeWhereClause(req.user) : {};
    if (scopeWhere.id === -1) return res.json({ data: [], total: 0, page: 1, limit: 50 });
    
    // We filter attendance records based on the employee scope
    const whereClause: any = Object.keys(scopeWhere).length > 0 ? { employee: scopeWhere } : {};

    // Extract pagination from query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    
    if (search) {
      whereClause.employee = {
        ...whereClause.employee,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { empCode: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where: whereClause,
        include: { employee: true, shift: true },
        skip,
        take: limit,
        orderBy: { date: 'desc' }
      }),
      prisma.attendance.count({ where: whereClause })
    ]);
    
    res.json({ data: records, total, page, limit });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const clockIn = async (req: any, res: Response) => {
  try {
    const { lat, lng } = req.body;
    const empId = req.user.empId;
    
    if (!empId) return res.status(400).json({ message: 'User is not linked to an employee' });
    if (!lat || !lng) return res.status(400).json({ message: 'Location data (lat, lng) is required' });

    try {
      const geoCheck = GeoService.validateLocation(lat, lng);
      if (!geoCheck.isValid) {
        return res.status(403).json({ 
          message: `คุณอยู่นอกพื้นที่ที่อนุญาต (ห่าง ${Math.round(geoCheck.distance)} เมตร จากจุดที่กำหนด)` 
        });
      }
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }

    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString("th-TH");

    // Check if already clocked in today
    const existing = await prisma.attendance.findFirst({
      where: { empId, date: today }
    });

    if (existing) {
      return res.status(400).json({ message: 'Already clocked in today' });
    }

    const record = await prisma.attendance.create({
      data: {
        empId,
        date: today,
        clockIn: time,
        status: "present",
        locationIn: `${lat},${lng}`
      }
    });

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const clockOut = async (req: any, res: Response) => {
  try {
    const { lat, lng } = req.body;
    const empId = req.user.empId;

    if (!empId) return res.status(400).json({ message: 'User is not linked to an employee' });
    if (!lat || !lng) return res.status(400).json({ message: 'Location data (lat, lng) is required' });

    try {
      const geoCheck = GeoService.validateLocation(lat, lng);
      if (!geoCheck.isValid) {
        return res.status(403).json({ 
          message: `คุณอยู่นอกพื้นที่ที่อนุญาต (ห่าง ${Math.round(geoCheck.distance)} เมตร จากจุดที่กำหนด)` 
        });
      }
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }

    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString("th-TH");

    const existing = await prisma.attendance.findFirst({
      where: { empId, date: today }
    });

    if (!existing) {
      return res.status(400).json({ message: 'No clock-in record found for today' });
    }

    const updated = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        clockOut: time,
        locationOut: `${lat},${lng}`
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTodayStatus = async (req: AuthRequest, res: Response) => {
  try {
    const empId = req.user?.empId;
    if (!empId) return res.json({ clockedIn: false, clockIn: null, clockOut: null });
    
    const today = new Date().toISOString().split('T')[0];
    const record = await prisma.attendance.findFirst({
      where: { empId, date: today }
    });
    
    if (record) {
      const createTime = (timeStr: string) => {
        const d = new Date();
        const dateStr = d.toISOString().split('T')[0];
        return `${dateStr}T${timeStr.padStart(8, '0')}Z`;
      };
      
      res.json({ 
        clockedIn: !record.clockOut, 
        clockIn: record.clockIn ? createTime(record.clockIn) : null,
        clockOut: record.clockOut ? createTime(record.clockOut) : null
      });
    } else {
      res.json({ clockedIn: false, clockIn: null, clockOut: null });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCorrections = async (req: AuthRequest, res: Response) => {
  try {
    const scopeWhere = req.user ? await buildEmployeeWhereClause(req.user) : {};
    if (scopeWhere.id === -1) return res.json({ data: [], total: 0, page: 1, limit: 50 });
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const finalWhere = Object.keys(scopeWhere).length > 0 ? { employee: scopeWhere } : {};
    
    const [corrections, total] = await Promise.all([
      prisma.attendanceCorrection.findMany({
        where: finalWhere,
        include: { employee: true },
        skip,
        take: limit,
        orderBy: { date: 'desc' }
      }),
      prisma.attendanceCorrection.count({ where: finalWhere })
    ]);
    
    res.json({ data: corrections, total, page, limit });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCorrection = async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body };
    if (req.user?.empId) {
      data.empId = req.user.empId;
    } else {
      return res.status(403).json({ message: 'User is not linked to an employee' });
    }
    data.status = 'pending_manager';
    
    const correction = await prisma.attendanceCorrection.create({ data });
    
    await prisma.approvalRequest.create({
      data: {
        type: 'CORRECTION',
        referenceId: correction.id,
        requesterId: correction.empId,
        status: 'pending_manager'
      }
    });

    res.status(201).json(correction);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

export const approveCorrection = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await prisma.attendanceCorrection.update({
      where: { id: parseInt(id as string) },
      data: {
        status,
        approver: req.user?.email || 'System'
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'UPDATE',
        module: 'attendance',
        details: `Correction ${id} status updated to ${status}`,
        recordId: id,
        ipAddress: req.ip || ''
      }
    });

    const empUser = await prisma.user.findUnique({ where: { empId: updated.empId } });
    if (empUser) {
      await dispatchNotification(empUser.id, 'อัปเดตคำขอแก้เวลา', `คำขอแก้เวลาของคุณได้รับการ ${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'} แล้ว`, 'email', { email: true, emailTo: empUser.email || undefined });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

export const exportAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const scopeWhere = req.user ? await buildEmployeeWhereClause(req.user) : {};
    if (scopeWhere.id === -1) return res.status(403).json({ message: 'No access' });

    const { startDate, endDate } = req.query;
    const whereClause: any = Object.keys(scopeWhere).length > 0 ? { employee: scopeWhere } : {};
    
    if (startDate && endDate) {
      whereClause.date = { gte: startDate as string, lte: endDate as string };
    }

    const records = await prisma.attendance.findMany({
      where: whereClause,
      include: { employee: true, shift: true },
      orderBy: { date: 'desc' }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance');

    worksheet.columns = [
      { header: 'Employee Code', key: 'empCode', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Clock In', key: 'clockIn', width: 15 },
      { header: 'Clock Out', key: 'clockOut', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Shift', key: 'shift', width: 20 },
    ];

    records.forEach((r: any) => {
      worksheet.addRow({
        empCode: r.employee.empCode,
        name: r.employee.name,
        date: r.date,
        clockIn: r.clockIn || '-',
        clockOut: r.clockOut || '-',
        status: r.status,
        shift: r.shift?.name || '-'
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance_report.xlsx"');
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
