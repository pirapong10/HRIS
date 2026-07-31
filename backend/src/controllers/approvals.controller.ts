import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { LeaveService } from '../services/leave.service';
import crypto from 'crypto';

export const getPendingApprovals = async (req: Request, res: Response) => {
  try {
    const approvals = await prisma.approvalRequest.findMany({
      where: { status: 'pending_manager' },
      include: { requester: true }
    });

    const enriched = await Promise.all(approvals.map(async (a) => {
      let details: any = {};
      
      if (a.type === 'LEAVE') {
        const leave = await prisma.leave.findUnique({ where: { id: a.referenceId } });
        if (leave) {
          details = {
            leaveType: leave.type,
            startDate: leave.startDate,
            endDate: leave.endDate,
            days: leave.days
          };
        }
      } else if (a.type === 'OT') {
        const ot = await prisma.oT.findUnique({ where: { id: a.referenceId } });
        if (ot) {
          details = {
            hours: ot.requestedHours,
            date: ot.date
          };
        }
      } else if (a.type === 'CORRECTION') {
        const correction = await prisma.attendanceCorrection.findUnique({ where: { id: a.referenceId } });
        if (correction) {
          details = {
            date: correction.date,
            requestedTime: correction.correctIn || correction.correctOut
          };
        }
      }

      return {
        id: a.id,
        type: a.type,
        status: a.status,
        requesterName: a.requester.name,
        requesterId: a.requesterId,
        createdAt: a.createdAt,
        ...details
      };
    }));

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

export const updateApprovalStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body; // 'approved' or 'rejected'
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be "approved" or "rejected".' });
    }

    if (status === 'rejected' && (!comment || comment.trim() === '')) {
      return res.status(400).json({ message: 'Rejection requires a mandatory reason.' });
    }

    const approvalId = parseInt(id as string, 10);
    const approval = await prisma.approvalRequest.findUnique({ where: { id: approvalId } });
    
    if (!approval) return res.status(404).json({ message: 'Approval request not found' });
    if (approval.status !== 'pending_manager') return res.status(400).json({ message: 'Request is not pending.' });

    const user = (req as any).user;
    const actorId = user?.id || 1;
    const actorRoles = user?.roles || [];
    const actorIp = String(req.ip || req.socket?.remoteAddress || 'unknown');

    if (approval.type === 'LEAVE') {
      const action = status === 'approved' ? 'APPROVED' : 'REJECTED';
      await LeaveService.processLeaveApproval(
        approvalId,
        actorId,
        action,
        comment,
        actorRoles,
        actorIp
      );
    } else {
      // Process non-LEAVE types like OT
      await prisma.$transaction(async (tx) => {
        // 1. Update ApprovalRequest status
        await tx.approvalRequest.update({
          where: { id: approvalId },
          data: { status }
        });

        // 2. Log to ApprovalLog
        await tx.approvalLog.create({
          data: {
            approvalRequestId: approvalId,
            action: status.toUpperCase(),
            approverId: actorId,
            comment: comment || null
          }
        });

        const approverUser = await tx.user.findUnique({
          where: { id: actorId },
          include: { employee: true }
        });
        const approverName = approverUser?.employee?.name || approverUser?.email || 'System';

        // 3. Update related model
        if (approval.type === 'OT') {
          await tx.oT.update({
            where: { id: approval.referenceId },
            data: { status, approver: approverName }
          });
        } else if (approval.type === 'CORRECTION') {
          await tx.attendanceCorrection.update({
            where: { id: approval.referenceId },
            data: { status, approver: approverName }
          });
        }

        // 4. Create Audit Log
        const logState = { status, comment };
        const hash = crypto.createHash('sha256').update(JSON.stringify(logState) + Date.now().toString()).digest('hex');

        await tx.enterpriseAuditLog.create({
          data: {
            actorId,
            actorRoles,
            actorIp,
            module: 'approvals',
            action: `APPROVAL_${status.toUpperCase()}`,
            recordId: String(approval.referenceId),
            previousState: { status: approval.status },
            newState: logState,
            businessReason: comment || null,
            cryptographicHash: hash
          }
        });
      });
    }

    res.json({ message: 'Success' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};
