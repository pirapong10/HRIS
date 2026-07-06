import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { writeAudit } from '../utils/audit';

export const getShifts = async (req: AuthRequest, res: Response) => {
  try {
    const shifts = await prisma.shift.findMany({
      include: {
        _count: { select: { employees: true } }
      },
      orderBy: { name: 'asc' }
    });
    // Parse days JSON string for each shift
    const result = shifts.map(s => ({
      ...s,
      days: typeof s.days === 'string' ? JSON.parse(s.days) : s.days,
      employeeCount: s._count.employees
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createShift = async (req: AuthRequest, res: Response) => {
  try {
    const { name, startTime, endTime, breakMins, days, otRate, otRateHoliday, color } = req.body;
    if (!name || !startTime || !endTime) {
      return res.status(400).json({ message: 'name, startTime, endTime are required' });
    }
    const shift = await prisma.shift.create({
      data: {
        name,
        startTime,
        endTime,
        breakMins: Number(breakMins) || 60,
        days: Array.isArray(days) ? JSON.stringify(days) : days,
        otRate: Number(otRate) || 1.5,
        otRateHoliday: Number(otRateHoliday) || 3.0,
        color: color || '#3B82F6'
      }
    });
    await writeAudit({
      userId: req.user!.id, action: 'CREATE', module: 'settings',
      recordId: String(shift.id), details: `Created shift: ${shift.name}`,
      ipAddress: req.ip
    });
    res.status(201).json({
      ...shift,
      days: typeof shift.days === 'string' ? JSON.parse(shift.days) : shift.days
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateShift = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, startTime, endTime, breakMins, days, otRate, otRateHoliday, color } = req.body;
    const shift = await prisma.shift.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(breakMins !== undefined && { breakMins: Number(breakMins) }),
        ...(days !== undefined && { days: Array.isArray(days) ? JSON.stringify(days) : days }),
        ...(otRate !== undefined && { otRate: Number(otRate) }),
        ...(otRateHoliday !== undefined && { otRateHoliday: Number(otRateHoliday) }),
        ...(color && { color })
      }
    });
    await writeAudit({
      userId: req.user!.id, action: 'UPDATE', module: 'settings',
      recordId: String(id), details: `Updated shift: ${shift.name}`,
      ipAddress: req.ip
    });
    res.json({
      ...shift,
      days: typeof shift.days === 'string' ? JSON.parse(shift.days) : shift.days
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteShift = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    // Check if any employees are assigned to this shift
    const empCount = await prisma.employee.count({ where: { shiftId: Number(id) } });
    if (empCount > 0) {
      return res.status(400).json({ 
        message: `ไม่สามารถลบกะได้ มีพนักงาน ${empCount} คนที่ใช้กะนี้อยู่` 
      });
    }
    await prisma.shift.delete({ where: { id: Number(id) } });
    await writeAudit({
      userId: req.user!.id, action: 'DELETE', module: 'settings',
      recordId: String(id), details: `Deleted shift id: ${id}`,
      ipAddress: req.ip
    });
    res.json({ message: 'ลบกะสำเร็จ' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getShiftSwaps = async (req: AuthRequest, res: Response) => {
  try {
    // Apply scope: HR sees all, EMPLOYEE sees only own swaps
    const where: any = {};
    if (req.user && req.user.level <= 10) {
      where.OR = [
        { reqEmpId: req.user.empId },
        { targetEmpId: req.user.empId }
      ];
    }
    
    const swaps = await prisma.shiftSwap.findMany({
      where,
      include: {
        reqEmployee: {
          select: { id: true, name: true, empCode: true, deptId: true,
            department: { select: { name: true } } }
        },
        targetEmployee: {
          select: { id: true, name: true, empCode: true, deptId: true,
            department: { select: { name: true } } }
        }
      },
      orderBy: { id: 'desc' }
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
