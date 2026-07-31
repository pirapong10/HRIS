import { prisma } from '../prisma';
import crypto from 'crypto';
import { LeaveLedgerService } from './leave-ledger.service';

export class LeaveService {
  /**
   * Calculates actual working days between two dates.
   * Excludes Saturdays, Sundays, and Public Holidays.
   */
  static async calculateActualLeaveDays(startDate: string, endDate: string): Promise<number> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Zero out times to ensure pure date comparisons
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);

    if (start > end) {
      throw new Error('Start date must be before or equal to end date.');
    }

    // Query holidays within the range
    const holidays = await prisma.publicHoliday.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    const holidayDateStrings = new Set(holidays.map(h => h.date.toISOString().split('T')[0]));

    let actualDays = 0;
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getUTCDay();
      const dateString = current.toISOString().split('T')[0];
      
      // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidayDateStrings.has(dateString);

      if (!isWeekend && !isHoliday) {
        actualDays++;
      }

      current.setUTCDate(current.getUTCDate() + 1);
    }

    return actualDays;
  }

  static async createLeaveRequest(
    empId: number,
    payload: { type: string; startDate: string; endDate: string; days?: number; reason?: string; medicalCertPath?: string },
    actorId: number,
    actorRoles: any,
    actorIp: string
  ) {
    const employee = await prisma.employee.findUnique({
      where: { id: empId },
      include: { employeeType: true },
    });

    if (!employee) throw new Error('Employee not found');

    const empType = employee.employeeType;
    if (!empType || !empType.leaveEligible) {
      throw new Error('This employee type is not eligible for leaves.');
    }

    // Prevent overlapping leave requests
    const overlapping = await prisma.leave.findFirst({
      where: {
        empId,
        status: { notIn: ['rejected', 'cancelled'] },
        AND: [
          { startDate: { lte: payload.endDate } },
          { endDate: { gte: payload.startDate } }
        ]
      }
    });

    if (overlapping) {
      throw new Error('Leave request dates overlap with an existing request.');
    }

    // Calculate actual leave days dynamically
    const calculatedDays = await this.calculateActualLeaveDays(payload.startDate, payload.endDate);
    if (calculatedDays <= 0) {
      throw new Error('Calculated leave days is 0. Does the date range only include weekends or holidays?');
    }

    const year = new Date(payload.startDate).getFullYear();
    
    // Fallback entitlements if not annual
    const entitled = payload.type === 'annual' ? (empType.annualLeave || 0) : 30;

    // Ensure the LeaveBalance record exists
    const balance = await prisma.leaveBalance.upsert({
      where: {
        employeeId_year_leaveType: { employeeId: empId, year, leaveType: payload.type }
      },
      create: {
        employeeId: empId,
        year,
        leaveType: payload.type,
        entitled,
        used: 0,
        pending: 0,
        remaining: entitled
      },
      update: {}
    });

    if (balance.remaining < calculatedDays) {
      throw new Error(`Insufficient leave balance. Remaining: ${balance.remaining}, Requested: ${calculatedDays}`);
    }

    // Process creation via Transaction
    return await prisma.$transaction(async (tx) => {
      const leave = await tx.leave.create({
        data: {
          empId,
          type: payload.type,
          startDate: payload.startDate,
          endDate: payload.endDate,
          days: calculatedDays,
          reason: payload.reason,
          medicalCertPath: payload.medicalCertPath,
          status: 'pending_manager'
        }
      });

      const policy = await tx.leavePolicy.findUnique({ where: { leaveType: payload.type } });
      if (policy) {
        await LeaveLedgerService.recordPending({
          tx,
          empId,
          leavePolicyId: policy.id,
          year,
          days: calculatedDays,
          leaveId: leave.id,
          leaveType: payload.type
        });
      }

      const updatedBalance = await tx.leaveBalance.update({
        where: { id: balance.id },
        data: {
          remaining: { decrement: calculatedDays },
          pending: { increment: calculatedDays }
        }
      });

      const approvalReq = await tx.approvalRequest.create({
        data: {
          type: 'LEAVE',
          referenceId: leave.id,
          requesterId: empId,
          status: 'pending_manager',
          currentStep: 1
        }
      });

      const newState = { leave, updatedBalance, approvalReq };
      const hash = crypto.createHash('sha256').update(JSON.stringify(newState) + Date.now().toString()).digest('hex');

      await tx.enterpriseAuditLog.create({
        data: {
          actorId,
          actorRoles: actorRoles || [],
          actorIp: actorIp || 'unknown',
          module: 'leave',
          action: 'CREATE_LEAVE_REQUEST',
          recordId: String(leave.id),
          previousState: null as any,
          newState: newState as any,
          cryptographicHash: hash
        }
      });

      return leave;
    });
  }

  static async processLeaveApproval(
    approvalRequestId: number,
    approverUserId: number,
    action: 'APPROVED' | 'REJECTED',
    comment: string | undefined,
    actorRoles: any,
    actorIp: string
  ) {
    const approvalReq = await prisma.approvalRequest.findUnique({
      where: { id: approvalRequestId }
    });

    if (!approvalReq) throw new Error('Approval request not found');
    if (approvalReq.type !== 'LEAVE') throw new Error('Invalid approval type');
    if (approvalReq.status !== 'pending_manager') throw new Error('Request is not pending');

    const leave = await prisma.leave.findUnique({
      where: { id: approvalReq.referenceId }
    });

    if (!leave) throw new Error('Leave record not found');

    const newStatus = action === 'APPROVED' ? 'approved' : 'rejected';

    const approverUser = await prisma.user.findUnique({
      where: { id: approverUserId },
      include: { employee: true }
    });
    const approverName = approverUser?.employee?.name || approverUser?.email || 'System';
    const year = new Date(leave.startDate).getFullYear();

    return await prisma.$transaction(async (tx) => {
      // 1. Update ApprovalRequest
      const updatedApproval = await tx.approvalRequest.update({
        where: { id: approvalRequestId },
        data: { status: newStatus }
      });

      // 2. Update Leave Request
      const updatedLeave = await tx.leave.update({
        where: { id: leave.id },
        data: { 
          status: newStatus,
          approver: approverName 
        }
      });

      // 3. Update LeaveBalance Quotas
      const balanceUpdateData = action === 'APPROVED'
        ? { pending: { decrement: leave.days }, used: { increment: leave.days } }
        : { pending: { decrement: leave.days }, remaining: { increment: leave.days } };

      const updatedBalance = await tx.leaveBalance.update({
        where: {
          employeeId_year_leaveType: {
            employeeId: leave.empId,
            year,
            leaveType: leave.type
          }
        },
        data: balanceUpdateData
      });

      const policy = await tx.leavePolicy.findUnique({ where: { leaveType: leave.type } });
      if (policy) {
        await LeaveLedgerService.resolvePending({
          tx,
          empId: leave.empId,
          leavePolicyId: policy.id,
          year,
          days: leave.days,
          leaveId: leave.id,
          leaveType: leave.type,
          action
        });
      }

      // 4. Create Approval Log History
      await tx.approvalLog.create({
        data: {
          approvalRequestId,
          approverId: approverUserId,
          action,
          comment
        }
      });

      // 5. Enterprise Audit Trail
      const previousState = { approvalReq, leave };
      const newState = { updatedApproval, updatedLeave, updatedBalance };
      const hash = crypto.createHash('sha256')
        .update(JSON.stringify(previousState) + JSON.stringify(newState) + Date.now().toString())
        .digest('hex');

      await tx.enterpriseAuditLog.create({
        data: {
          actorId: approverUserId,
          actorRoles: actorRoles || [],
          actorIp: actorIp || 'unknown',
          module: 'leave_approval',
          action: `LEAVE_${action}`,
          recordId: String(leave.id),
          previousState: previousState as any,
          newState: newState as any,
          cryptographicHash: hash
        }
      });

      return updatedLeave;
    });
  }
}
