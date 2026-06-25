import { Request, Response } from 'express';
import { prisma } from '../prisma';

export const getCostCenters = async (req: Request, res: Response) => {
  try {
    const costCenters = await prisma.costCenter.findMany();
    res.json(costCenters);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCostCenter = async (req: Request, res: Response) => {
  try {
    const { name, code, budget, fiscalYear } = req.body;
    
    const existing = await prisma.costCenter.findUnique({ where: { code } });
    if (existing) return res.status(400).json({ message: 'รหัส Cost Center นี้มีอยู่ในระบบแล้ว' });

    const costCenter = await prisma.costCenter.create({
      data: {
        name,
        code,
        fiscalYear,
        budget: budget ? Number(budget) : 0
      }
    });
    
    res.status(201).json(costCenter);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
