"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLeave = exports.getLeaves = void 0;
const prisma_1 = require("../prisma");
const scopeFilter_1 = require("../utils/scopeFilter");
const getLeaves = async (req, res) => {
    try {
        const scopeWhere = req.user ? await (0, scopeFilter_1.buildEmployeeWhereClause)(req.user) : {};
        // Extract pagination from query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const [leaves, total] = await Promise.all([
            prisma_1.prisma.leave.findMany({
                where: Object.keys(scopeWhere).length > 0 ? { employee: scopeWhere } : {},
                include: { employee: true },
                skip,
                take: limit,
                orderBy: { startDate: 'desc' }
            }),
            prisma_1.prisma.leave.count({ where: Object.keys(scopeWhere).length > 0 ? { employee: scopeWhere } : {} })
        ]);
        res.json({ data: leaves, total, page, limit });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getLeaves = getLeaves;
const createLeave = async (req, res) => {
    try {
        const data = { ...req.body };
        if (!data.empId && req.user?.empId) {
            data.empId = req.user.empId;
        }
        const leave = await prisma_1.prisma.leave.create({ data });
        // Also create approval request
        await prisma_1.prisma.approvalRequest.create({
            data: {
                type: 'LEAVE',
                referenceId: leave.id,
                requesterId: leave.empId,
                status: 'pending_manager'
            }
        });
        res.status(201).json(leave);
    }
    catch (error) {
        console.error("Create Leave Error:", error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
};
exports.createLeave = createLeave;
