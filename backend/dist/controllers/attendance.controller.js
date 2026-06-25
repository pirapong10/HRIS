"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clockOut = exports.clockIn = exports.getAttendance = void 0;
const prisma_1 = require("../prisma");
const scopeFilter_1 = require("../utils/scopeFilter");
const getAttendance = async (req, res) => {
    try {
        const scopeWhere = req.user ? await (0, scopeFilter_1.buildEmployeeWhereClause)(req.user) : {};
        // We filter attendance records based on the employee scope
        const whereClause = Object.keys(scopeWhere).length > 0 ? { employee: scopeWhere } : {};
        // Extract pagination from query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const [records, total] = await Promise.all([
            prisma_1.prisma.attendance.findMany({
                where: whereClause,
                include: { employee: true, shift: true },
                skip,
                take: limit,
                orderBy: { date: 'desc' }
            }),
            prisma_1.prisma.attendance.count({ where: whereClause })
        ]);
        res.json({ data: records, total, page, limit });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getAttendance = getAttendance;
const clockIn = async (req, res) => {
    try {
        const { lat, lng } = req.body;
        const empId = req.user.empId;
        if (!empId)
            return res.status(400).json({ message: 'User is not linked to an employee' });
        const today = new Date().toISOString().split('T')[0];
        const time = new Date().toLocaleTimeString("th-TH");
        // Check if already clocked in today
        const existing = await prisma_1.prisma.attendance.findFirst({
            where: { empId, date: today }
        });
        if (existing) {
            return res.status(400).json({ message: 'Already clocked in today' });
        }
        const record = await prisma_1.prisma.attendance.create({
            data: {
                empId,
                date: today,
                clockIn: time,
                status: "present",
                locationIn: `${lat},${lng}`
            }
        });
        res.status(201).json(record);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.clockIn = clockIn;
const clockOut = async (req, res) => {
    try {
        const { lat, lng } = req.body;
        const empId = req.user.empId;
        const today = new Date().toISOString().split('T')[0];
        const time = new Date().toLocaleTimeString("th-TH");
        const existing = await prisma_1.prisma.attendance.findFirst({
            where: { empId, date: today }
        });
        if (!existing) {
            return res.status(400).json({ message: 'No clock-in record found for today' });
        }
        const updated = await prisma_1.prisma.attendance.update({
            where: { id: existing.id },
            data: {
                clockOut: time,
                locationOut: `${lat},${lng}`
            }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.clockOut = clockOut;
