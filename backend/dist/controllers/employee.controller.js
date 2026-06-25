"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleOnboardingTask = exports.deleteDoc = exports.addDoc = exports.getEmployeeDetails = exports.deleteEmployee = exports.updateEmployee = exports.createEmployee = exports.getEmployees = void 0;
const prisma_1 = require("../prisma");
const scopeFilter_1 = require("../utils/scopeFilter");
const getEmployees = async (req, res) => {
    try {
        const scopeWhere = req.user ? await (0, scopeFilter_1.buildEmployeeWhereClause)(req.user) : {};
        // Extract pagination from query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const [employees, total] = await Promise.all([
            prisma_1.prisma.employee.findMany({
                where: scopeWhere,
                include: { department: true, position: true, shift: true },
                skip,
                take: limit,
            }),
            prisma_1.prisma.employee.count({ where: scopeWhere })
        ]);
        res.json({ data: employees, total, page, limit });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getEmployees = getEmployees;
const createEmployee = async (req, res) => {
    try {
        const { id, department, position, shift, createdAt, updatedAt, ...data } = req.body;
        const employee = await prisma_1.prisma.employee.create({ data });
        res.status(201).json(employee);
    }
    catch (error) {
        console.error("Create Employee Error:", error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
};
exports.createEmployee = createEmployee;
const updateEmployee = async (req, res) => {
    try {
        const employeeId = Number(req.params.id);
        const { id, department, position, shift, createdAt, updatedAt, ...data } = req.body;
        const employee = await prisma_1.prisma.employee.update({
            where: { id: employeeId },
            data
        });
        res.json(employee);
    }
    catch (error) {
        console.error("Update Employee Error:", error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
};
exports.updateEmployee = updateEmployee;
const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await prisma_1.prisma.employee.update({
            where: { id: Number(id) },
            data: { status: 'inactive' }
        });
        res.json(employee);
    }
    catch (error) {
        console.error("Delete Employee Error:", error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
};
exports.deleteEmployee = deleteEmployee;
const getEmployeeDetails = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const employee = await prisma_1.prisma.employee.findUnique({
            where: { id },
            include: {
                docs: true,
                history: { orderBy: { date: 'desc' } },
                onboarding: true
            }
        });
        if (!employee)
            return res.status(404).json({ message: 'Not found' });
        res.json(employee);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getEmployeeDetails = getEmployeeDetails;
const addDoc = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const data = { ...req.body, empId: id };
        const doc = await prisma_1.prisma.empDoc.create({ data });
        res.json(doc);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.addDoc = addDoc;
const deleteDoc = async (req, res) => {
    try {
        const docId = Number(req.params.docId);
        await prisma_1.prisma.empDoc.delete({ where: { id: docId } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteDoc = deleteDoc;
const toggleOnboardingTask = async (req, res) => {
    try {
        const taskId = Number(req.params.taskId);
        const { isCompleted } = req.body;
        const task = await prisma_1.prisma.onboardingTask.update({
            where: { id: taskId },
            data: { isCompleted }
        });
        res.json(task);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.toggleOnboardingTask = toggleOnboardingTask;
