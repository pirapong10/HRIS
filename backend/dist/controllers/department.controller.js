"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDepartment = exports.updateDepartment = exports.createDepartment = exports.getDepartments = void 0;
const prisma_1 = require("../prisma");
const getDepartments = async (req, res) => {
    try {
        const departments = await prisma_1.prisma.department.findMany({
            include: {
                head: true,
                costCenter: true,
                _count: {
                    select: {
                        employees: { where: { status: 'active' } }
                    }
                }
            }
        });
        const formatted = departments.map((d) => ({
            ...d,
            employeeCount: d._count.employees
        }));
        res.json(formatted);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getDepartments = getDepartments;
const createDepartment = async (req, res) => {
    try {
        const { name, code, headId, parentId, costCenterId, description, type } = req.body;
        if (!name || !code)
            return res.status(400).json({ message: 'ชื่อแผนกและรหัสแผนกเป็นข้อมูลบังคับ' });
        // Check if code exists
        const existing = await prisma_1.prisma.department.findUnique({ where: { code } });
        if (existing)
            return res.status(400).json({ message: 'รหัสแผนกนี้มีอยู่ในระบบแล้ว' });
        // One employee can only head one department
        if (headId) {
            const existingHead = await prisma_1.prisma.department.findFirst({ where: { headId: Number(headId), status: 'active' } });
            if (existingHead)
                return res.status(400).json({ message: 'พนักงานคนนี้เป็นหัวหน้าแผนกอื่นอยู่แล้ว' });
        }
        const department = await prisma_1.prisma.department.create({
            data: {
                name,
                code,
                type: type || 'Department',
                description,
                parentId: parentId ? Number(parentId) : null,
                headId: headId ? Number(headId) : null,
                costCenterId: costCenterId ? Number(costCenterId) : null
            }
        });
        res.status(201).json(department);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createDepartment = createDepartment;
const updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, headId, parentId, costCenterId, description, status, type } = req.body;
        if (!name || !code)
            return res.status(400).json({ message: 'ชื่อแผนกและรหัสแผนกเป็นข้อมูลบังคับ' });
        if (headId) {
            const existingHead = await prisma_1.prisma.department.findFirst({
                where: { headId: Number(headId), id: { not: Number(id) }, status: 'active' }
            });
            if (existingHead)
                return res.status(400).json({ message: 'พนักงานคนนี้เป็นหัวหน้าแผนกอื่นอยู่แล้ว' });
        }
        const updateData = {
            name,
            code,
            description,
            status,
            parentId: parentId ? Number(parentId) : null,
            headId: headId ? Number(headId) : null,
            costCenterId: costCenterId ? Number(costCenterId) : null
        };
        if (type)
            updateData.type = type;
        const department = await prisma_1.prisma.department.update({
            where: { id: Number(id) },
            data: updateData
        });
        res.json(department);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateDepartment = updateDepartment;
const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const activeEmployeesCount = await prisma_1.prisma.employee.count({
            where: { deptId: Number(id), user: { isActive: true } }
        });
        if (activeEmployeesCount > 0) {
            return res.status(400).json({ message: 'ไม่สามารถลบแผนกที่มีพนักงานประจำอยู่ได้' });
        }
        // Soft delete
        const department = await prisma_1.prisma.department.update({
            where: { id: Number(id) },
            data: { status: 'inactive' }
        });
        res.json({ message: 'ลบแผนกเรียบร้อยแล้ว (Soft Delete)', department });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteDepartment = deleteDepartment;
