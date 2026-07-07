import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { writeAudit } from '../utils/audit';

const HC_INCLUDE = {
  department:  { select: { id: true, name: true } },
  position:    { select: { id: true, name: true } },
  requestedBy: { select: { id: true, email: true, employee: { select: { name: true } } } },
  approvedBy:  { select: { id: true, email: true, employee: { select: { name: true } } } },
};

// GET /api/headcount
export const getHeadcounts = async (req: AuthRequest, res: Response) => {
  try {
    const { level, id: userId, deptIds } = req.user!;

    let where: any = {};
    if (level <= 10) {
      // EMPLOYEE — own requests only
      where.requestedById = userId;
    } else if (level < 80) {
      // DEPT_MANAGER / HR_MANAGER — own + dept scope
      const scopeDepts = Array.isArray(deptIds) && deptIds.length > 0 ? deptIds : [];
      where = scopeDepts.length > 0
        ? { OR: [{ requestedById: userId }, { deptId: { in: scopeDepts } }] }
        : { requestedById: userId };
    }
    // HR_DIRECTOR (80+) — no filter, sees all

    const headcounts = await prisma.headcountRequest.findMany({
      where,
      include: HC_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    res.json(headcounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/headcount/:id
export const getHeadcountById = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    const hc = await prisma.headcountRequest.findUnique({
      where: { id },
      include: HC_INCLUDE,
    });
    if (!hc) return res.status(404).json({ message: 'Not found' });
    res.json(hc);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/headcount
export const createHeadcount = async (req: AuthRequest, res: Response) => {
  try {
    const { deptId, posId, quantity, reason, date, priority } = req.body;
    if (!deptId || !posId || !quantity || !reason || !date) {
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    const hc = await prisma.headcountRequest.create({
      data: {
        deptId:        parseInt(deptId),
        posId:         parseInt(posId),
        quantity:      parseInt(quantity),
        reason,
        date,
        priority:      priority || 'normal',
        status:        'pending_manager',
        requestedById: req.user!.id,
      },
      include: HC_INCLUDE,
    });

    await writeAudit({
      userId:   req.user!.id,
      action:   'CREATE',
      module:   'headcount',
      recordId: String(hc.id),
      details:  `Created headcount request: posId=${posId} qty=${quantity} priority=${priority || 'normal'}`,
    });

    res.status(201).json(hc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/headcount/:id/approve
export const approveHeadcount = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    const { status, approverNote } = req.body;

    if (!['approved', 'rejected', 'pending_hr'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Use: approved | rejected | pending_hr' });
    }

    const hc = await prisma.headcountRequest.findUnique({ where: { id } });
    if (!hc) return res.status(404).json({ message: 'Not found' });
    if (hc.status === 'approved' || hc.status === 'rejected') {
      return res.status(400).json({ message: 'คำขอนี้ได้รับการตัดสินใจแล้ว' });
    }

    const updated = await prisma.headcountRequest.update({
      where: { id },
      data: {
        status,
        approverNote: (approverNote as string) || null,
        approvedById: req.user!.id,
      },
      include: HC_INCLUDE,
    });

    await writeAudit({
      userId:   req.user!.id,
      action:   'APPROVE',
      module:   'headcount',
      recordId: String(id),
      details:  `Status → ${status as string}. Note: ${(approverNote as string) || ''}`,
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/headcount/:id
export const deleteHeadcount = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    const { level, id: userId } = req.user!;

    const hc = await prisma.headcountRequest.findUnique({ where: { id } });
    if (!hc) return res.status(404).json({ message: 'Not found' });

    if (hc.status !== 'pending_manager') {
      return res.status(400).json({ message: 'ลบได้เฉพาะคำขอที่สถานะ pending_manager เท่านั้น' });
    }
    if (hc.requestedById !== userId && level < 80) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบคำขอนี้' });
    }

    await prisma.headcountRequest.delete({ where: { id } });

    await writeAudit({
      userId,
      action:   'DELETE',
      module:   'headcount',
      recordId: String(id),
      details:  `Deleted headcount request id=${id}`,
    });

    res.json({ message: 'ลบคำขอสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
