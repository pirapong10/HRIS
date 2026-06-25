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

    const finalWhere: any = { ...scopeWhere };
    if (search) {
      finalWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { empCode: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
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
    const { id, department, position, shift, createdAt, updatedAt, ...data } = req.body;
    const employee = await prisma.employee.create({ data });
    
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
    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data
    });

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

export const getEmployeeDetails = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
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
