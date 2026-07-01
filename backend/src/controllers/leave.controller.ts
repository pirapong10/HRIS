import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { buildEmployeeWhereClause } from '../utils/scopeFilter';
import { AuthRequest } from '../middlewares/auth.middleware';

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
