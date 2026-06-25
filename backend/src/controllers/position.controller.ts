import { Request, Response } from 'express';
import { prisma } from '../prisma';

export const getPositions = async (req: Request, res: Response) => {
  try {
    const positions = await prisma.position.findMany({
      include: {
        _count: { select: { employees: true } },
        department: { select: { name: true } }
      }
    });

    const formatted = positions.map((p: any) => ({
      ...p,
      employeeCount: p._count.employees
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createPosition = async (req: Request, res: Response) => {
  try {
    const { name, code, deptId, level, salary, description, grade, salaryMin, salaryMax, approvedHeadcount } = req.body;
    
    const existing = await prisma.position.findUnique({ where: { code } });
    if (existing) return res.status(400).json({ message: 'รหัสตำแหน่งนี้มีอยู่ในระบบแล้ว' });

    if (deptId) {
      const deptExists = await prisma.department.findUnique({ where: { id: Number(deptId) } });
      if (!deptExists || deptExists.status === 'inactive') return res.status(400).json({ message: 'แผนกสังกัดไม่ถูกต้องหรือถูกลบไปแล้ว' });
    }

    const position = await prisma.position.create({
      data: {
        name,
        code,
        description,
        level,
        grade,
        salaryMin: salaryMin ? Number(salaryMin) : null,
        salaryMax: salaryMax ? Number(salaryMax) : null,
        approvedHeadcount: approvedHeadcount ? Number(approvedHeadcount) : 1,
        status: req.body.status || 'active',
        salary: salary ? Number(salary) : 0,
        deptId: deptId ? Number(deptId) : null
      }
    });
    
    res.status(201).json(position);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updatePosition = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, deptId, level, salary, status, description, grade, salaryMin, salaryMax, approvedHeadcount } = req.body;

    if (!name || !code) return res.status(400).json({ message: 'ชื่อตำแหน่งและรหัสตำแหน่งเป็นข้อมูลบังคับ' });

    // Check code uniqueness excluding current position
    const existing = await prisma.position.findFirst({ where: { code, id: { not: Number(id) } } });
    if (existing) return res.status(400).json({ message: 'รหัสตำแหน่งนี้มีอยู่ในระบบแล้ว' });

    if (deptId) {
      const deptExists = await prisma.department.findUnique({ where: { id: Number(deptId) } });
      if (!deptExists || deptExists.status === 'inactive') return res.status(400).json({ message: 'แผนกสังกัดไม่ถูกต้องหรือถูกลบไปแล้ว' });
    }

    const position = await prisma.position.update({
      where: { id: Number(id) },
      data: {
        name,
        code,
        description,
        level,
        grade,
        salaryMin: salaryMin ? Number(salaryMin) : null,
        salaryMax: salaryMax ? Number(salaryMax) : null,
        approvedHeadcount: approvedHeadcount ? Number(approvedHeadcount) : 1,
        status,
        salary: salary ? Number(salary) : 0,
        deptId: deptId ? Number(deptId) : null
      }
    });

    res.json(position);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deletePosition = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check for active employees
    const activeEmployeesCount = await prisma.employee.count({
      where: { posId: Number(id), user: { isActive: true } }
    });

    if (activeEmployeesCount > 0) {
      return res.status(400).json({ message: 'ไม่สามารถลบตำแหน่งที่มีพนักงานทำงานอยู่ได้' });
    }

    const positionToUpdate = await prisma.position.findUnique({ where: { id: Number(id) } });
    const position = await prisma.position.update({
      where: { id: Number(id) },
      data: { 
        status: 'inactive', 
        code: `${positionToUpdate?.code}_deleted_${Date.now()}` 
      }
    });

    res.json({ message: 'ลบตำแหน่งเรียบร้อยแล้ว (Soft Delete)', position });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
