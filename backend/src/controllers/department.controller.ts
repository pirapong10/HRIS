import { Request, Response } from 'express';
import { prisma } from '../prisma';

export const getDepartments = async (req: Request, res: Response) => {
  try {
    const { flat } = req.query;
    
    const all = await prisma.department.findMany({
      include: {
        head: {
          select: { id: true, name: true, empCode: true }
        },
        costCenter: {
          select: { id: true, name: true, code: true }
        },
        _count: {
          select: { employees: { where: { status: 'active' } } }
        }
      },
      orderBy: { id: 'asc' }
    });

    const formatted = all.map((d: any) => ({
      ...d,
      employeeCount: d._count.employees
    }));

    if (flat === 'true') {
      return res.json(formatted);
    }

    // Build tree in memory
    const map = new Map<number, any>();
    formatted.forEach(d => map.set(d.id, { 
      ...d, 
      children: [] 
    }));

    const roots: any[] = [];
    map.forEach(dept => {
      if (dept.parentId && map.has(dept.parentId)) {
        map.get(dept.parentId).children.push(dept);
      } else {
        roots.push(dept);
      }
    });

    res.json(roots);
  } catch (error) {
    console.error('getDepartments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createDepartment = async (req: Request, res: Response) => {
  try {
    const { name, code, headId, parentId, costCenterId, description, type } = req.body;
    
    if (!name || !code) return res.status(400).json({ message: 'ชื่อแผนกและรหัสแผนกเป็นข้อมูลบังคับ' });

    // Check if code exists
    const existing = await prisma.department.findUnique({ where: { code } });
    if (existing) return res.status(400).json({ message: 'รหัสแผนกนี้มีอยู่ในระบบแล้ว' });

    // One employee can only head one department
    if (headId) {
      const existingHead = await prisma.department.findFirst({ where: { headId: Number(headId), status: 'active' } });
      if (existingHead) return res.status(400).json({ message: 'พนักงานคนนี้เป็นหัวหน้าแผนกอื่นอยู่แล้ว' });
    }

    const department = await prisma.department.create({
      data: {
        name,
        code,
        type: type || 'Department',
        description,
        parentId: parentId ? Number(parentId) : null,
        headId: headId ? Number(headId) : null,
        costCenterId: costCenterId ? Number(costCenterId) : null
      }
    });
    
    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateDepartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, headId, parentId, costCenterId, description, status, type } = req.body;

    if (!name || !code) return res.status(400).json({ message: 'ชื่อแผนกและรหัสแผนกเป็นข้อมูลบังคับ' });

    if (headId) {
      const existingHead = await prisma.department.findFirst({ 
        where: { headId: Number(headId), id: { not: Number(id) }, status: 'active' } 
      });
      if (existingHead) return res.status(400).json({ message: 'พนักงานคนนี้เป็นหัวหน้าแผนกอื่นอยู่แล้ว' });
    }

    if (parentId) {
      if (Number(parentId) === Number(id)) {
        return res.status(400).json({ message: 'แผนกไม่สามารถอยู่ภายใต้ตัวเองได้' });
      }

      let currentParentId = Number(parentId);
      let depth = 0; // prevent infinite loop in case DB is already corrupted
      while (currentParentId && depth < 50) {
        if (currentParentId === Number(id)) {
          return res.status(400).json({ message: 'ไม่สามารถกำหนดแผนกแม่ที่สร้างความสัมพันธ์แบบวงกลมได้ (Circular Reference)' });
        }
        const parentDept = await prisma.department.findUnique({ where: { id: currentParentId }, select: { parentId: true } });
        currentParentId = parentDept?.parentId ? parentDept.parentId : 0;
        depth++;
      }
    }

    const updateData: any = {
      name,
      code,
      description,
      status,
      parentId: parentId ? Number(parentId) : null,
      headId: headId ? Number(headId) : null,
      costCenterId: costCenterId ? Number(costCenterId) : null
    };
    if (type) updateData.type = type;

    const department = await prisma.department.update({
      where: { id: Number(id) },
      data: updateData
    });

    res.json(department);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const activeEmployeesCount = await prisma.employee.count({
      where: { deptId: Number(id), user: { isActive: true } }
    });

    if (activeEmployeesCount > 0) {
      return res.status(400).json({ message: 'ไม่สามารถลบแผนกที่มีพนักงานประจำอยู่ได้' });
    }

    // Soft delete
    const department = await prisma.department.update({
      where: { id: Number(id) },
      data: { status: 'inactive' }
    });

    res.json({ message: 'ลบแผนกเรียบร้อยแล้ว (Soft Delete)', department });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
