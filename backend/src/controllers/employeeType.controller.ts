import { Request, Response } from 'express';
import { prisma } from '../prisma';

export const getEmployeeTypes = async (req: Request, res: Response) => {
  try {
    const types = await prisma.employeeType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { employees: { where: { status: 'active' } } }
        }
      }
    });
    res.json(types);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching employee types', error: err.message });
  }
};

export const createEmployeeType = async (req: Request, res: Response) => {
  try {
    const {
      code, name, color, isActive, sortOrder,
      ssoEnabled, ssoRate, ssoCap, ssoEmployerRate,
      taxMethod, taxFlatRate,
      otEligible, leaveEligible, annualLeave, includeInPayroll
    } = req.body;

    const parsedData = {
      code: String(code || ''),
      name: String(name || ''),
      color: String(color || '#3B82F6'),
      isActive: Boolean(isActive ?? true),
      sortOrder: parseInt(sortOrder, 10) || 0,
      ssoEnabled: Boolean(ssoEnabled ?? true),
      ssoRate: parseFloat(ssoRate) || 0,
      ssoCap: parseFloat(ssoCap) || 0,
      ssoEmployerRate: parseFloat(ssoEmployerRate) || 0,
      taxMethod: String(taxMethod || 'progressive'),
      taxFlatRate: taxFlatRate ? parseFloat(taxFlatRate) : null,
      otEligible: Boolean(otEligible ?? true),
      leaveEligible: Boolean(leaveEligible ?? true),
      annualLeave: parseInt(annualLeave, 10) || 0,
      includeInPayroll: Boolean(includeInPayroll ?? true)
    };

    const newType = await prisma.employeeType.create({ data: parsedData });
    res.status(201).json(newType);
  } catch (err: any) {
    console.error('Create Error:', err);
    if (err.code === 'P2002') return res.status(400).json({ message: 'Employee Type code already exists' });
    res.status(500).json({ message: 'Error creating employee type', error: err.message });
  }
};

export const updateEmployeeType = async (req: Request, res: Response) => {
  try {
    const employeeTypeId = parseInt(String(req.params.id), 10);
    if (isNaN(employeeTypeId)) return res.status(400).json({ message: 'Invalid ID' });

    // Check if type exists
    const existing = await prisma.employeeType.findUnique({ where: { id: employeeTypeId } });
    if (!existing) return res.status(404).json({ message: 'Employee Type not found' });

    const {
      code, name, color, isActive, sortOrder,
      ssoEnabled, ssoRate, ssoCap, ssoEmployerRate,
      taxMethod, taxFlatRate,
      otEligible, leaveEligible, annualLeave, includeInPayroll
    } = req.body;

    const parsedData = {
      code: code !== undefined ? String(code) : existing.code,
      name: name !== undefined ? String(name) : existing.name,
      color: color !== undefined ? String(color) : existing.color,
      isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      sortOrder: sortOrder !== undefined ? parseInt(sortOrder, 10) : existing.sortOrder,
      ssoEnabled: ssoEnabled !== undefined ? Boolean(ssoEnabled) : existing.ssoEnabled,
      ssoRate: ssoRate !== undefined ? parseFloat(ssoRate) : existing.ssoRate,
      ssoCap: ssoCap !== undefined ? parseFloat(ssoCap) : existing.ssoCap,
      ssoEmployerRate: ssoEmployerRate !== undefined ? parseFloat(ssoEmployerRate) : existing.ssoEmployerRate,
      taxMethod: taxMethod !== undefined ? String(taxMethod) : existing.taxMethod,
      taxFlatRate: taxFlatRate !== undefined && taxFlatRate !== null ? parseFloat(taxFlatRate) : existing.taxFlatRate,
      otEligible: otEligible !== undefined ? Boolean(otEligible) : existing.otEligible,
      leaveEligible: leaveEligible !== undefined ? Boolean(leaveEligible) : existing.leaveEligible,
      annualLeave: annualLeave !== undefined ? parseInt(annualLeave, 10) : existing.annualLeave,
      includeInPayroll: includeInPayroll !== undefined ? Boolean(includeInPayroll) : existing.includeInPayroll
    };

    const updated = await prisma.employeeType.update({
      where: { id: employeeTypeId },
      data: parsedData
    });
    res.json(updated);
  } catch (err: any) {
    console.error('Update Error:', err);
    res.status(500).json({ message: 'Error updating employee type', error: err.message });
  }
};

export const deleteEmployeeType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if any active employees are assigned
    const count = await prisma.employee.count({
      where: { employeeTypeId: Number(id), status: 'active' }
    });

    if (count > 0) {
      return res.status(400).json({ message: `Cannot delete Employee Type: ${count} employees are currently assigned to it` });
    }

    const deleted = await prisma.employeeType.update({
      where: { id: Number(id) },
      data: { isActive: false }
    });
    res.json({ message: 'Employee type deactivated successfully', data: deleted });
  } catch (err: any) {
    res.status(500).json({ message: 'Error deleting employee type', error: err.message });
  }
};
