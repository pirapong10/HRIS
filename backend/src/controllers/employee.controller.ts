import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { buildEmployeeWhereClause } from '../utils/scopeFilter';
import { AuthRequest } from '../middlewares/auth.middleware';
import { writeAudit } from '../utils/audit';

export const getEmployees = async (req: AuthRequest, res: Response) => {
  try {
    const scopeWhere = req.user ? await buildEmployeeWhereClause(req.user) : {};
    
    // Extract pagination from query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;

    // If scopeWhere is { id: -1 } (DENIED), return empty result immediately
    if (scopeWhere && scopeWhere.id === -1) {
      return res.json({ data: [], total: 0, page, limit });
    }

    // Process filter parameters
    const deptId = req.query.deptId ? Number(req.query.deptId) : undefined;
    const type = req.query.type as string;
    const status = req.query.status as string; // undefined, '', 'active', 'inactive'

    const statusFilter = status !== undefined && status !== '' ? status : (status === undefined ? 'active' : undefined);

    // Merge safely — don't overwrite top-level scopeWhere keys
    const finalWhere: any = {
      ...scopeWhere,
      ...(statusFilter ? { status: statusFilter } : {}),
    };

    if (search) {
      finalWhere.AND = [
        ...(finalWhere.AND || []),
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { empCode: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        }
      ];
    }

    if (deptId) {
      if (finalWhere.deptId && finalWhere.deptId.in) {
        const scopeDepts = finalWhere.deptId.in as number[];
        if (scopeDepts.includes(deptId)) {
          finalWhere.deptId = deptId;
        }
      } else if (!finalWhere.deptId) {
        finalWhere.deptId = deptId;
      }
    }

    if (type) {
      if (finalWhere.type && finalWhere.type.in) {
        const scopeTypes = finalWhere.type.in as string[];
        if (scopeTypes.includes(type)) {
          finalWhere.type = type;
        }
      } else if (!finalWhere.type) {
        finalWhere.type = type;
      }
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where: finalWhere,
        include: { department: true, position: true, shift: true },
        skip,
        take: limit,
      }),
      prisma.employee.count({ where: finalWhere })
    ]);

    res.json({ data: employees, total, page, limit });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { id, department, position, shift, createdAt, updatedAt, empCode, ...data } = req.body;
    
    const last = await prisma.employee.findFirst({
      orderBy: { empCode: 'desc' },
      select: { empCode: true }
    });
    const nextNum = last?.empCode ? parseInt(last.empCode.replace('EMP', '')) + 1 : 1;
    const generatedEmpCode = `EMP${String(nextNum).padStart(3, '0')}`;
    
    const employee = await prisma.employee.create({ data: { ...data, empCode: generatedEmpCode } });
    
    if (req.user) {
      await writeAudit({
        userId: req.user.id,
        action: 'CREATE',
        module: 'employee',
        recordId: String(employee.id),
        details: `Created employee ${employee.name}`,
        ipAddress: req.ip ? String(req.ip) : undefined
      });
    }

    res.status(201).json(employee);
  } catch (error: any) {
    console.error("Create Employee Error:", error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};
export const updateEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = Number(req.params.id);
    const { id, department, position, shift, createdAt, updatedAt, ...data } = req.body;

    const current = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { salary: true, posId: true, deptId: true, name: true }
    });

    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data
    });

    // Track salary change
    if (current && data.salary !== undefined && Number(data.salary) !== current.salary) {
      await prisma.empHistory.create({
        data: {
          empId: employeeId,
          date: new Date().toISOString().split('T')[0],
          type: 'salary',
          oldVal: String(current.salary),
          newVal: String(data.salary),
          remark: `Updated by user ${req.user?.id || 'System'}`
        }
      });
    }

    // Track position change
    if (current && data.posId !== undefined && (data.posId === null ? null : Number(data.posId)) !== current.posId) {
      await prisma.empHistory.create({
        data: {
          empId: employeeId,
          date: new Date().toISOString().split('T')[0],
          type: 'position',
          oldVal: String(current.posId || ''),
          newVal: String(data.posId || ''),
          remark: `Updated by user ${req.user?.id || 'System'}`
        }
      });
    }

    // Track department change
    if (current && data.deptId !== undefined && (data.deptId === null ? null : Number(data.deptId)) !== current.deptId) {
      await prisma.empHistory.create({
        data: {
          empId: employeeId,
          date: new Date().toISOString().split('T')[0],
          type: 'department',
          oldVal: String(current.deptId || ''),
          newVal: String(data.deptId || ''),
          remark: `Updated by user ${req.user?.id || 'System'}`
        }
      });
    }

    if (req.user) {
      await writeAudit({
        userId: req.user.id,
        action: 'UPDATE',
        module: 'employee',
        recordId: String(employee.id),
        details: `Updated employee ${employee.name}`,
        ipAddress: req.ip ? String(req.ip) : undefined
      });
    }

    res.json(employee);
  } catch (error: any) {
    console.error("Update Employee Error:", error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

export const deleteEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const employee = await prisma.employee.update({
      where: { id: Number(id) },
      data: { status: 'inactive' }
    });

    if (req.user) {
      await writeAudit({
        userId: req.user.id,
        action: 'DELETE',
        module: 'employee',
        recordId: String(employee.id),
        details: `Deactivated employee ${employee.name}`,
        ipAddress: req.ip ? String(req.ip) : undefined
      });
    }

    res.json(employee);
  } catch (error: any) {
    console.error("Delete Employee Error:", error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

export const getEmployeeDetails = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);

    // Layer 4 — Record Ownership: EMPLOYEE can only view their own record
    if (req.user && req.user.level <= 10 && req.user.empId !== id) {
      return res.status(403).json({ message: 'Forbidden: Not your record' });
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        docs: true,
        history: { orderBy: { date: 'desc' } },
        onboarding: true
      }
    });
    if (!employee) return res.status(404).json({ message: 'Not found' });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};


export const addDoc = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const data = { ...req.body, empId: id };
    const doc = await prisma.empDoc.create({ data });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteDoc = async (req: Request, res: Response) => {
  try {
    const docId = Number(req.params.docId);
    await prisma.empDoc.delete({ where: { id: docId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const toggleOnboardingTask = async (req: Request, res: Response) => {
  try {
    const taskId = Number(req.params.taskId);
    const { isCompleted } = req.body;
    const task = await prisma.onboardingTask.update({
      where: { id: taskId },
      data: { isCompleted }
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
