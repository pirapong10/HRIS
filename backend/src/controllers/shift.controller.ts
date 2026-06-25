import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getShiftSwaps = async (req: AuthRequest, res: Response) => {
  try {
    const swaps = await prisma.shiftSwap.findMany({
      include: { reqEmployee: true, targetEmployee: true }
    });
    res.json(swaps);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createShiftSwap = async (req: AuthRequest, res: Response) => {
  try {
    const { targetEmpId, date, reason } = req.body;
    const reqEmpId = req.user?.empId;

    if (!reqEmpId) return res.status(400).json({ message: 'User not linked to an employee' });

    const swap = await prisma.shiftSwap.create({
      data: {
        reqEmpId,
        targetEmpId: Number(targetEmpId),
        date,
        reason,
        status: 'pending'
      }
    });

    res.status(201).json(swap);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateShiftSwapStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    const swap = await prisma.shiftSwap.update({
      where: { id: Number(id) },
      data: { status }
    });

    // If approved, swap shifts in employee record (or leave as logic for now)
    if (status === 'approved') {
      const s = await prisma.shiftSwap.findUnique({ where: { id: Number(id) } });
      if (s) {
        const reqEmp = await prisma.employee.findUnique({ where: { id: s.reqEmpId } });
        const targetEmp = await prisma.employee.findUnique({ where: { id: s.targetEmpId } });
        if (reqEmp && targetEmp) {
          // simple shift exchange logic
          await prisma.employee.update({ where: { id: s.reqEmpId }, data: { shiftId: targetEmp.shiftId } });
          await prisma.employee.update({ where: { id: s.targetEmpId }, data: { shiftId: reqEmp.shiftId } });
        }
      }
    }

    res.json(swap);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
