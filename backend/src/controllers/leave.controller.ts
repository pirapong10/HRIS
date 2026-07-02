import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { buildEmployeeWhereClause } from '../utils/scopeFilter';
import { AuthRequest } from '../middlewares/auth.middleware';
import ExcelJS from 'exceljs';

export const getLeaves = async (req: AuthRequest, res: Response) => {
  try {
    const scopeWhere = req.user ? await buildEmployeeWhereClause(req.user) : {};
    if (scopeWhere.id === -1) return res.json({ data: [], total: 0, page: 1, limit: 50 });
    
    // Extract pagination from query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const finalWhere = Object.keys(scopeWhere).length > 0 ? { employee: scopeWhere } : {};

    const [leaves, total] = await Promise.all([
      prisma.leave.findMany({
        where: finalWhere,
        include: { employee: true },
        skip,
        take: limit,
        orderBy: { startDate: 'desc' }
      }),
      prisma.leave.count({ where: finalWhere })
    ]);

    res.json({ data: leaves, total, page, limit });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getLeaveById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const leave = await prisma.leave.findUnique({
      where: { id: parseInt(id as string) },
      include: { employee: true }
    });
    if (!leave) return res.status(404).json({ message: 'Leave not found' });
    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createLeave = async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body };
    if (!data.empId && req.user?.empId) {
      data.empId = req.user.empId;
    }
    
    const leave = await prisma.leave.create({ data });
    
    // Also create approval request
    await prisma.approvalRequest.create({
      data: {
        type: 'LEAVE',
        referenceId: leave.id,
        requesterId: leave.empId,
        status: 'pending_manager'
      }
    });

    res.status(201).json(leave);
  } catch (error: any) {
    console.error("Create Leave Error:", error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

export const approveLeave = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body; // status: 'approved' | 'rejected'

    const leave = await prisma.leave.findUnique({ where: { id: parseInt(id as string) } });
    if (!leave) return res.status(404).json({ message: 'Leave not found' });

    const updated = await prisma.leave.update({
      where: { id: leave.id },
      data: {
        status,
        approver: req.user?.email || 'System'
      },
      include: { employee: true }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'UPDATE',
        module: 'attendance',
        details: `Leave ${id} status updated to ${status}`,
        recordId: id,
        ipAddress: req.ip || ''
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

export const exportLeaves = async (req: AuthRequest, res: Response) => {
  try {
    const scopeWhere = req.user ? await buildEmployeeWhereClause(req.user) : {};
    if (scopeWhere.id === -1) return res.status(403).json({ message: 'No access' });

    const { startDate, endDate } = req.query;
    const finalWhere: any = Object.keys(scopeWhere).length > 0 ? { employee: scopeWhere } : {};
    
    if (startDate && endDate) {
      finalWhere.startDate = { gte: startDate as string };
      finalWhere.endDate = { lte: endDate as string };
    }

    const leaves = await prisma.leave.findMany({
      where: finalWhere,
      include: { employee: true },
      orderBy: { startDate: 'desc' }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leaves');

    worksheet.columns = [
      { header: 'Employee Code', key: 'empCode', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Start Date', key: 'startDate', width: 15 },
      { header: 'End Date', key: 'endDate', width: 15 },
      { header: 'Days', key: 'days', width: 10 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Approver', key: 'approver', width: 25 },
    ];

    leaves.forEach((l: any) => {
      worksheet.addRow({
        empCode: l.employee.empCode,
        name: l.employee.name,
        type: l.type,
        startDate: l.startDate,
        endDate: l.endDate,
        days: l.days,
        status: l.status,
        approver: l.approver || '-'
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="leaves_report.xlsx"');
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

