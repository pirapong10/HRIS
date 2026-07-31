import { Request, Response } from 'express';
import { LeaveService } from '../services/leave.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../prisma';

export const getMyLeaves = async (req: AuthRequest, res: Response) => {
  try {
    const empId = req.user?.empId;
    if (!empId) return res.status(400).json({ message: 'User is not linked to an employee profile' });

    const leaves = await prisma.leave.findMany({
      where: { empId },
      orderBy: { startDate: 'desc' }
    });
    res.json(leaves);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching leaves', details: error.message });
  }
};

export const createLeave = async (req: AuthRequest, res: Response) => {
  try {
    const empId = req.user?.empId;
    if (!empId) return res.status(400).json({ message: 'User is not linked to an employee profile' });

    const { type, startDate, endDate, days, reason } = req.body;
    const medicalCertPath = (req as any).file ? `/uploads/leaves/${(req as any).file.filename}` : undefined;

    if (!type || !startDate || !endDate || !days) {
      return res.status(400).json({ message: 'Missing required leave fields' });
    }

    const leave = await LeaveService.createLeaveRequest(
      empId,
      { type, startDate, endDate, days: parseFloat(days), reason, medicalCertPath },
      req.user!.id,
      req.user!.roles, // Assuming roles are on req.user or parse appropriately
      req.ip || 'unknown'
    );

    res.status(201).json(leave);
  } catch (error: any) {
    console.error('Create Leave Error:', error);
    res.status(400).json({ message: error.message });
  }
};

export const getPendingApprovals = async (req: AuthRequest, res: Response) => {
  try {
    // In a real system, you might filter by department head, but here we return all pending for authorized users
    const pendingReqs = await prisma.approvalRequest.findMany({
      where: { type: 'LEAVE', status: 'pending_manager' },
      include: {
        requester: true,
      },
      orderBy: { createdAt: 'asc' }
    });

    // Also fetch the leave details for each request
    const leaveIds = pendingReqs.map(r => r.referenceId);
    const leaves = await prisma.leave.findMany({
      where: { id: { in: leaveIds } }
    });

    const results = pendingReqs.map(req => ({
      ...req,
      leaveDetails: leaves.find(l => l.id === req.referenceId)
    }));

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching approvals', details: error.message });
  }
};

export const approveLeave = async (req: AuthRequest, res: Response) => {
  try {
    const approvalRequestId = parseInt(String(req.params.id), 10);
    if (isNaN(approvalRequestId)) return res.status(400).json({ message: 'Invalid ID' });

    const { action, comment } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return res.status(400).json({ message: 'Action must be APPROVED or REJECTED' });
    }

    const updatedLeave = await LeaveService.processLeaveApproval(
      approvalRequestId,
      req.user!.id,
      action as 'APPROVED' | 'REJECTED',
      comment,
      req.user!.roles,
      req.ip || 'unknown'
    );

    res.json({ message: `Leave ${action.toLowerCase()} successfully`, data: updatedLeave });
  } catch (error: any) {
    console.error('Approve Leave Error:', error);
    res.status(400).json({ message: error.message });
  }
};

export const getMyLeaveBalance = async (req: AuthRequest, res: Response) => {
  try {
    const empId = req.user?.empId;
    if (!empId) return res.status(400).json({ message: 'User is not linked to an employee profile' });

    const year = new Date().getFullYear();

    const balances = await prisma.leaveBalance.findMany({
      where: { employeeId: empId, year },
    });

    if (balances.length === 0) {
      const employee = await prisma.employee.findUnique({
        where: { id: empId },
        include: { employeeType: true },
      });

      if (employee && employee.employeeType && employee.employeeType.leaveEligible) {
        const entitled = employee.employeeType.annualLeave || 6;
        const newBalance = await prisma.leaveBalance.create({
          data: {
            employeeId: empId,
            year,
            leaveType: 'annual',
            entitled,
            used: 0,
            pending: 0,
            remaining: entitled
          }
        });
        return res.json([newBalance]);
      }
    }

    res.json(balances);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching leave balance', details: error.message });
  }
};
