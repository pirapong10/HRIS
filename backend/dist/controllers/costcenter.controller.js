"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCostCenter = exports.getCostCenters = void 0;
const prisma_1 = require("../prisma");
const getCostCenters = async (req, res) => {
    try {
        const costCenters = await prisma_1.prisma.costCenter.findMany();
        res.json(costCenters);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getCostCenters = getCostCenters;
const createCostCenter = async (req, res) => {
    try {
        const { name, code, budget, fiscalYear } = req.body;
        const existing = await prisma_1.prisma.costCenter.findUnique({ where: { code } });
        if (existing)
            return res.status(400).json({ message: 'รหัส Cost Center นี้มีอยู่ในระบบแล้ว' });
        const costCenter = await prisma_1.prisma.costCenter.create({
            data: {
                name,
                code,
                fiscalYear,
                budget: budget ? Number(budget) : 0
            }
        });
        res.status(201).json(costCenter);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createCostCenter = createCostCenter;
