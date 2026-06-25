import { Request, Response } from 'express';
import { prisma } from '../prisma';

export const getRequests = async (req: Request, res: Response) => {
  try {
    const reqs = await prisma.approvalRequest.findMany({
      include: { requester: true }
    });
    res.json(reqs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createRequest = async (req: any, res: Response) => {
  try {
    const { type, referenceId } = req.body;
    const empId = req.user.empId;

    if (!empId) return res.status(400).json({ message: 'User is not linked to an employee' });

    const request = await prisma.approvalRequest.create({
      data: {
        type,
        referenceId,
        requesterId: empId,
        status: 'pending_manager'
      }
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const APPROVAL_RULES: any = {
  LEAVE: [
    { step: 1, requiredRole: 'DEPT_MANAGER',  requiredPermission: 'leave:approve' },
    { step: 2, requiredRole: 'HR_MANAGER',    requiredPermission: 'leave:approve' },
  ],
  OT: [
    { step: 1, requiredRole: 'DEPT_MANAGER',  requiredPermission: 'attendance:approve' },
    { step: 2, requiredRole: 'HR_MANAGER',    requiredPermission: 'attendance:approve' },
  ],
  PAYROLL: [
    { step: 1, requiredRole: 'PAYROLL_MANAGER', requiredPermission: 'payroll:approve' },
    { step: 2, requiredRole: 'HR_DIRECTOR',     requiredPermission: 'payroll:approve' },
  ],
  HEADCOUNT: [
    { step: 1, requiredRole: 'HR_MANAGER',   requiredPermission: 'organization:approve' },
    { step: 2, requiredRole: 'HR_DIRECTOR',  requiredPermission: 'organization:approve' },
  ],
};

export const approveRequest = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { action, comment } = req.body; // action: APPROVED or REJECTED
    const approver = req.user;

    const request = await prisma.approvalRequest.findUnique({ 
      where: { id: Number(id) },
      include: { requester: true }
    });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    // Validate OT Cap if action is APPROVED and type is OT
    if (request.type === 'OT' && action === 'APPROVED') {
      const ot = await prisma.oT.findUnique({ where: { id: request.referenceId }});
      if (ot) {
        const d = new Date(ot.date);
        const dayOfWeek = d.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() + diffToMonday);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const startStr = weekStart.toISOString().split('T')[0];
        const endStr = weekEnd.toISOString().split('T')[0];

        const existingOts = await prisma.oT.findMany({
          where: {
            empId: ot.empId,
            status: 'approved',
            date: { gte: startStr, lte: endStr },
            id: { not: ot.id }
          }
        });

        const total = existingOts.reduce((sum, o) => sum + o.requestedHours, 0) + ot.requestedHours;
        if (total > 36) {
          return res.status(400).json({ message: `Cannot approve: OT exceeds 36 hours/week legal limit (would be ${total} hours)` });
        }
      }
    }

    // RBAC Validation
    const rules = APPROVAL_RULES[request.type];
    if (rules) {
      const currentRule = rules.find((r: any) => r.step === request.currentStep);
      if (currentRule && !approver.roles.includes('SUPER_ADMIN')) {
        if (!approver.roles.includes(currentRule.requiredRole)) {
          return res.status(403).json({ message: `Step ${request.currentStep} requires role: ${currentRule.requiredRole}` });
        }
        if (!approver.permissions.includes(currentRule.requiredPermission)) {
          return res.status(403).json({ message: `Missing permission: ${currentRule.requiredPermission}` });
        }
        if (currentRule.requiredRole === 'DEPT_MANAGER') {
          const requestDeptId = request.requester.deptId;
          if (!requestDeptId || !(approver.deptIds || []).includes(requestDeptId)) {
            return res.status(403).json({ message: 'Not your department' });
          }
        }
      }
    }

    // Update status based on action
    const status = action === 'APPROVED' ? 'approved' : 'rejected';

    const updated = await prisma.$transaction(async (tx) => {
      const updatedReq = await tx.approvalRequest.update({
        where: { id: Number(id) },
        data: { status }
      });

      if (request.type === 'OT') {
        await tx.oT.update({
          where: { id: request.referenceId },
          data: { status }
        });
      }

      // Create log
      await tx.approvalLog.create({
        data: {
          approvalRequestId: Number(id),
          approverId: approver.id,
          action,
          comment
        }
      });
      
      return updatedReq;
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
