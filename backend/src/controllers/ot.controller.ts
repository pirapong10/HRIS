import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { buildEmployeeWhereClause } from '../utils/scopeFilter';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getOTs = async (req: AuthRequest, res: Response) => {
  try {
    const scopeWhere = req.user ? await buildEmployeeWhereClause(req.user) : {};
    if (scopeWhere.id === -1) return res.json({ data: [], total: 0, page: 1, limit: 50 });
    
    // Extract pagination from query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const finalWhere = Object.keys(scopeWhere).length > 0 ? { employee: scopeWhere } : {};

    const [ots, total] = await Promise.all([
      prisma.oT.findMany({
        where: finalWhere,
        include: { employee: true, shift: true },
        skip,
        take: limit,
        orderBy: { date: 'desc' }
      }),
      prisma.oT.count({ where: finalWhere })
    ]);

    res.json({ data: ots, total, page, limit });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getOTById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const ot = await prisma.oT.findUnique({
      where: { id: parseInt(id as string) },
      include: { employee: true, shift: true }
    });
    if (!ot) return res.status(404).json({ message: 'OT not found' });
    res.json(ot);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createOT = async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body };
    if (!data.empId && req.user?.empId) {
      data.empId = req.user.empId;
    }
    if (!data.empId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }
    
    // requestedHours needs to be float
    if (data.requestedHours) data.requestedHours = parseFloat(data.requestedHours);
    if (data.shiftId) data.shiftId = parseInt(data.shiftId);

    if (!data.date || !data.requestedHours || data.requestedHours <= 0) {
      return res.status(400).json({ message: 'Date and valid requestedHours are required' });
    }

    // Thai Labor Law Check: Weekly OT limit 36 hours
    const otDate = new Date(data.date);
    const dayOfWeek = otDate.getUTCDay(); // 0 = Sun, 1 = Mon...
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfWeek = new Date(otDate);
    startOfWeek.setUTCDate(otDate.getUTCDate() + diffToMon);
    startOfWeek.setUTCHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
    endOfWeek.setUTCHours(23, 59, 59, 999);

    const existingOTs = await prisma.oT.findMany({
      where: {
        empId: data.empId,
        status: { notIn: ['rejected', 'cancelled'] },
        date: {
          gte: startOfWeek.toISOString().split('T')[0],
          lte: endOfWeek.toISOString().split('T')[0]
        }
      }
    });

    const currentWeeklyHours = existingOTs.reduce((sum, o) => sum + o.requestedHours, 0);
    const MAX_WEEKLY_OT = 36;

    if (currentWeeklyHours + data.requestedHours > MAX_WEEKLY_OT) {
      return res.status(400).json({
        message: `ไม่สามารถยื่นขอ OT ได้: เกินเพดานตามกฎหมายแรงงานไทย (36 ชม./สัปดาห์). สัปดาห์นี้ขอไปแล้ว ${currentWeeklyHours} ชม.`
      });
    }

    const ot = await prisma.oT.create({ data });
    
    // Also create approval request
    await prisma.approvalRequest.create({
      data: {
        type: 'OT',
        referenceId: ot.id,
        requesterId: ot.empId,
        status: 'pending_manager'
      }
    });

    res.status(201).json(ot);
  } catch (error: any) {
    console.error("Create OT Error:", error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

export const updateOTStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const ot = await prisma.oT.update({
      where: { id: Number(id) },
      data: { 
        status,
        approver: req.user?.email || 'Unknown'
      }
    });
    res.json(ot);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
