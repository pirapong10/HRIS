import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { validateFormula } from '../utils/payrollEngine';
import { writeAudit } from '../utils/audit';

/** GET /api/payroll-components */
export const listComponents = async (req: AuthRequest, res: Response) => {
  try {
    const components = await prisma.payrollComponent.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    res.json(components);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', details: err.message });
  }
};

/** POST /api/payroll-components */
export const createComponent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const { code, name, type, calcMethod, formula, functionName, isTaxable, isSSOBase, sortOrder } = req.body;

    if (!code || !name || !type || !calcMethod) {
      return res.status(400).json({ message: 'code, name, type, calcMethod are required' });
    }
    if (calcMethod === 'formula' && !formula) {
      return res.status(400).json({ message: 'formula is required when calcMethod is "formula"' });
    }
    if (calcMethod === 'function' && !functionName) {
      return res.status(400).json({ message: 'functionName is required when calcMethod is "function"' });
    }

    const component = await prisma.payrollComponent.create({
      data: { code, name, type, calcMethod, formula, functionName, isTaxable, isSSOBase, sortOrder },
    });

    await writeAudit({
      userId: req.user.id,
      action: 'CREATE',
      module: 'settings',
      recordId: String(component.id),
      details: `Created payroll component: ${component.code} (${component.name})`,
      ipAddress: req.ip ? String(req.ip) : undefined,
    });

    res.status(201).json(component);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: `Component code "${req.body.code}" already exists` });
    }
    res.status(500).json({ message: 'Server error', details: err.message });
  }
};

/** PUT /api/payroll-components/:id */
export const updateComponent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const id = Number(req.params.id);

    const { code, name, type, calcMethod, formula, functionName, isTaxable, isSSOBase, sortOrder, isActive } = req.body;

    const component = await prisma.payrollComponent.update({
      where: { id },
      data: { code, name, type, calcMethod, formula, functionName, isTaxable, isSSOBase, sortOrder, isActive },
    });

    await writeAudit({
      userId: req.user.id,
      action: 'UPDATE',
      module: 'settings',
      recordId: String(id),
      details: `Updated payroll component: ${component.code}`,
      ipAddress: req.ip ? String(req.ip) : undefined,
    });

    res.json(component);
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Component not found' });
    res.status(500).json({ message: 'Server error', details: err.message });
  }
};

/** DELETE /api/payroll-components/:id  (soft delete: isActive=false) */
export const deleteComponent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const id = Number(req.params.id);

    const component = await prisma.payrollComponent.update({
      where: { id },
      data: { isActive: false },
    });

    await writeAudit({
      userId: req.user.id,
      action: 'DELETE',
      module: 'settings',
      recordId: String(id),
      details: `Soft-deleted payroll component: ${component.code}`,
      ipAddress: req.ip ? String(req.ip) : undefined,
    });

    res.json({ message: 'Component deactivated', id });
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Component not found' });
    res.status(500).json({ message: 'Server error', details: err.message });
  }
};

/** POST /api/payroll-components/test  — pure formula validation, no DB write */
export const testFormula = async (req: AuthRequest, res: Response) => {
  try {
    const { formula, dummyVars } = req.body;
    if (!formula) return res.status(400).json({ message: 'formula is required' });
    if (!dummyVars || typeof dummyVars !== 'object') {
      return res.status(400).json({ message: 'dummyVars must be an object of { varName: number }' });
    }
    const result = validateFormula(formula, dummyVars as Record<string, number>);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', details: err.message });
  }
};
