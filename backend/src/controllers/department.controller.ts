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
    const { name, code, headId, parentId, costCenterId, description, type, countryCode, currency, timezone, exchangeRate } = req.body;
    
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
        costCenterId: costCenterId ? Number(costCenterId) : null,
        countryCode: countryCode || null,
        currency: currency || null,
        timezone: timezone || null,
        exchangeRate: exchangeRate ? parseFloat(exchangeRate) : 1.0
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
    const { name, code, headId, parentId, costCenterId, description, status, type, countryCode, currency, timezone, exchangeRate } = req.body;

    if (!name || !code) return res.status(400).json({ message: 'ชื่อแผนกและรหัสแผนกเป็นข้อมูลบังคับ' });

    // Check code uniqueness excluding current department
    const existing = await prisma.department.findFirst({ where: { code, id: { not: Number(id) } } });
    if (existing) return res.status(400).json({ message: `รหัสแผนก '${code}' นี้มีอยู่ในระบบแล้ว (แผนก: ${existing.name})` });

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
      let depth = 0;
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
      description: description ?? null,
      status: status ?? 'active',
      // Use undefined instead of null for optional relations so they aren't accidentally cleared
      parentId: parentId !== undefined ? (parentId ? Number(parentId) : null) : undefined,
      headId: headId !== undefined ? (headId ? Number(headId) : null) : undefined,
      costCenterId: costCenterId !== undefined ? (costCenterId ? Number(costCenterId) : null) : undefined,
    };
    // Remove undefined keys so Prisma doesn't override with undefined
    Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k]);

    if (type) updateData.type = type;
    if (countryCode !== undefined) updateData.countryCode = countryCode || null;
    if (currency !== undefined) updateData.currency = currency || null;
    if (timezone !== undefined) updateData.timezone = timezone || null;
    if (exchangeRate !== undefined) updateData.exchangeRate = parseFloat(exchangeRate) || 1.0;

    const department = await prisma.department.update({
      where: { id: Number(id) },
      data: updateData
    });

    res.json(department);
  } catch (error: any) {
    console.error('updateDepartment error:', error?.message || error);
    res.status(500).json({ message: 'Server error', detail: error?.message });
  }
};

export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deptId = Number(id);
    
    // Check if it has active employees (Block deletion completely)
    const activeEmployeesCount = await prisma.employee.count({
      where: { deptId, user: { isActive: true } }
    });

    if (activeEmployeesCount > 0) {
      return res.status(400).json({ message: 'ไม่สามารถลบแผนกที่มีพนักงานประจำอยู่ได้' });
    }

    // Check for ANY other relationships (inactive employees, positions, headcount requests, sub-departments)
    const totalEmployees = await prisma.employee.count({ where: { deptId } });
    const totalPositions = await prisma.position.count({ where: { deptId } });
    const totalHeadcounts = await prisma.headcountRequest.count({ where: { deptId } });
    const totalChildren = await prisma.department.count({ where: { parentId: deptId } });

    if (totalEmployees === 0 && totalPositions === 0 && totalHeadcounts === 0 && totalChildren === 0) {
      // Safe to Hard Delete (completely remove and free up the code)
      await prisma.department.delete({ where: { id: deptId } });
      return res.json({ message: 'ลบแผนกออกจากระบบเรียบร้อยแล้ว (Hard Delete)' });
    }

    return res.status(400).json({ message: 'ไม่สามารถลบแผนกนี้ได้ เนื่องจากมีข้อมูลผูกพันในระบบ (พนักงาน, ตำแหน่ง, หรือแผนกย่อย) กรุณาใช้การเปลี่ยนสถานะเป็น Inactive แทน' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
