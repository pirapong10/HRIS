import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getApprovalRules = async (req: AuthRequest, res: Response) => {
  try {
    const rules = await prisma.approvalRule.findMany({
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' }
        }
      },
      orderBy: { priority: 'desc' }
    });
    res.json({ data: rules });
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching approval rules', error: err.message });
  }
};

export const createApprovalRule = async (req: AuthRequest, res: Response) => {
  try {
    const { module, name, deptId, minThreshold, maxThreshold, priority, steps } = req.body;
    if (!module || !name) {
      return res.status(400).json({ message: 'Module and rule name are required' });
    }

    const rule = await prisma.approvalRule.create({
      data: {
        module,
        name,
        deptId: deptId ? Number(deptId) : null,
        minThreshold: minThreshold !== undefined ? Number(minThreshold) : null,
        maxThreshold: maxThreshold !== undefined ? Number(maxThreshold) : null,
        priority: priority ? Number(priority) : 1,
        steps: {
          create: (steps || []).map((s: any, idx: number) => ({
            stepNumber: s.stepNumber || idx + 1,
            approverType: s.approverType || 'DIRECT_MANAGER',
            targetRoleId: s.targetRoleId ? Number(s.targetRoleId) : null,
            specificEmpId: s.specificEmpId ? Number(s.specificEmpId) : null,
            autoApproveMins: s.autoApproveMins ? Number(s.autoApproveMins) : null
          }))
        }
      },
      include: { steps: true }
    });

    res.status(201).json({ message: 'สร้างกฎสายการอนุมัติสำเร็จ', data: rule });
  } catch (err: any) {
    res.status(500).json({ message: 'Error creating approval rule', error: err.message });
  }
};

export const updateApprovalRule = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, isActive, priority, steps } = req.body;

    // Delete existing steps and recreate if new steps provided
    if (steps && Array.isArray(steps)) {
      await prisma.approvalRuleStep.deleteMany({
        where: { approvalRuleId: Number(id) }
      });
    }

    const updated = await prisma.approvalRule.update({
      where: { id: Number(id) },
      data: {
        name,
        isActive,
        priority: priority ? Number(priority) : undefined,
        ...(steps && Array.isArray(steps) ? {
          steps: {
            create: steps.map((s: any, idx: number) => ({
              stepNumber: s.stepNumber || idx + 1,
              approverType: s.approverType || 'DIRECT_MANAGER',
              targetRoleId: s.targetRoleId ? Number(s.targetRoleId) : null,
              specificEmpId: s.specificEmpId ? Number(s.specificEmpId) : null,
              autoApproveMins: s.autoApproveMins ? Number(s.autoApproveMins) : null
            }))
          }
        } : {})
      },
      include: { steps: true }
    });

    res.json({ message: 'อัปเดตกฎสายการอนุมัติสำเร็จ', data: updated });
  } catch (err: any) {
    res.status(500).json({ message: 'Error updating approval rule', error: err.message });
  }
};

export const deleteApprovalRule = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.approvalRule.delete({ where: { id: Number(id) } });
    res.json({ message: 'ลบกฎสายการอนุมัติสำเร็จ' });
  } catch (err: any) {
    res.status(500).json({ message: 'Error deleting approval rule', error: err.message });
  }
};

// ─── Approval Delegate Endpoints ─────────────────────────────────────

export const getDelegates = async (req: AuthRequest, res: Response) => {
  try {
    const delegates = await prisma.approvalDelegate.findMany({
      orderBy: { startDate: 'desc' }
    });
    res.json({ data: delegates });
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching delegates', error: err.message });
  }
};

export const createDelegate = async (req: AuthRequest, res: Response) => {
  try {
    const { originalEmpId, delegateEmpId, startDate, endDate, reason } = req.body;

    const delegate = await prisma.approvalDelegate.create({
      data: {
        originalEmpId: Number(originalEmpId),
        delegateEmpId: Number(delegateEmpId),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason
      }
    });

    res.status(201).json({ message: 'ตั้งค่าผู้อนุมัติแทนสำเร็จ', data: delegate });
  } catch (err: any) {
    res.status(500).json({ message: 'Error creating delegate setting', error: err.message });
  }
};
