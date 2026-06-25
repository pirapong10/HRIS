"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleUser = exports.createUser = exports.getAuditLogs = exports.setPayrollScope = exports.setDataScope = exports.assignUserRoles = exports.getUsers = exports.getPermissions = exports.updateRolePermissions = exports.getRole = exports.getRoles = void 0;
const prisma_1 = require("../prisma");
// ── List all Roles with permission counts ────────────────────────────
const getRoles = async (req, res) => {
    try {
        const roles = await prisma_1.prisma.role.findMany({
            include: { _count: { select: { permissions: true, userRoles: true } } },
            orderBy: { level: 'desc' }
        });
        res.json(roles);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getRoles = getRoles;
// ── Get single role with full permissions ────────────────────────────
const getRole = async (req, res) => {
    try {
        const { id } = req.params;
        const role = await prisma_1.prisma.role.findUnique({
            where: { id: Number(id) },
            include: { permissions: { include: { permission: true } } }
        });
        if (!role)
            return res.status(404).json({ message: 'Role not found' });
        res.json(role);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getRole = getRole;
// ── Update role permissions ──────────────────────────────────────────
const updateRolePermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const { permissionIds } = req.body; // array of permission IDs
        // Clear and reassign
        await prisma_1.prisma.rolePermission.deleteMany({ where: { roleId: Number(id) } });
        if (permissionIds?.length) {
            await prisma_1.prisma.rolePermission.createMany({
                data: permissionIds.map((pid) => ({ roleId: Number(id), permissionId: pid })),
                skipDuplicates: true
            });
        }
        await prisma_1.prisma.auditLog.create({
            data: { userId: req.user.id, action: 'PERMISSION_CHANGED', module: 'access_control', recordId: String(id), ipAddress: req.ip ? String(req.ip) : null }
        });
        res.json({ message: 'Permissions updated' });
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateRolePermissions = updateRolePermissions;
// ── Get all permissions grouped by module ────────────────────────────
const getPermissions = async (_req, res) => {
    try {
        const perms = await prisma_1.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { action: 'asc' }] });
        // Group by module
        const grouped = {};
        for (const p of perms) {
            if (!grouped[p.module])
                grouped[p.module] = [];
            grouped[p.module].push(p);
        }
        res.json(grouped);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getPermissions = getPermissions;
// ── List all Users with their roles ─────────────────────────────────
const getUsers = async (_req, res) => {
    try {
        const users = await prisma_1.prisma.user.findMany({
            include: {
                userRoles: { include: { role: true } },
                employee: { select: { name: true, empCode: true, department: { select: { name: true } } } },
                dataScope: true,
                payrollScope: true
            },
            orderBy: { id: 'asc' }
        });
        res.json(users.map(u => ({
            id: u.id, email: u.email, isActive: u.isActive,
            roles: u.userRoles.map(ur => ({ id: ur.role.id, code: ur.role.code, name: ur.role.name, deptIds: ur.deptIds })),
            employee: u.employee,
            dataScope: u.dataScope,
            payrollScope: u.payrollScope
        })));
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getUsers = getUsers;
// ── Assign roles to a user ───────────────────────────────────────────
const assignUserRoles = async (req, res) => {
    try {
        const { id } = req.params;
        const { roles } = req.body; // [{ roleId, deptIds? }]
        await prisma_1.prisma.userRole.deleteMany({ where: { userId: Number(id) } });
        if (roles?.length) {
            await prisma_1.prisma.userRole.createMany({
                data: roles.map((r) => ({
                    userId: Number(id),
                    roleId: r.roleId,
                    deptIds: r.deptIds ? JSON.stringify(r.deptIds) : null
                })),
                skipDuplicates: true
            });
        }
        await prisma_1.prisma.auditLog.create({
            data: { userId: req.user.id, action: 'ROLE_ASSIGNED', module: 'access_control', recordId: String(id), ipAddress: req.ip ? String(req.ip) : null }
        });
        res.json({ message: 'Roles assigned successfully' });
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.assignUserRoles = assignUserRoles;
// ── Set DataScope for a user ──────────────────────────────────────────
const setDataScope = async (req, res) => {
    try {
        const { id } = req.params;
        const { departmentIds, costCenterIds, employeeTypes, jobGrades } = req.body;
        const scope = await prisma_1.prisma.dataScope.upsert({
            where: { userId: Number(id) },
            update: {
                departmentIds: departmentIds ? JSON.stringify(departmentIds) : null,
                costCenterIds: costCenterIds ? JSON.stringify(costCenterIds) : null,
                employeeTypes: employeeTypes ? JSON.stringify(employeeTypes) : null,
                jobGrades: jobGrades ? JSON.stringify(jobGrades) : null
            },
            create: {
                userId: Number(id),
                departmentIds: departmentIds ? JSON.stringify(departmentIds) : null,
                costCenterIds: costCenterIds ? JSON.stringify(costCenterIds) : null,
                employeeTypes: employeeTypes ? JSON.stringify(employeeTypes) : null,
                jobGrades: jobGrades ? JSON.stringify(jobGrades) : null
            }
        });
        res.json(scope);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.setDataScope = setDataScope;
// ── Set PayrollScope for a user ───────────────────────────────────────
const setPayrollScope = async (req, res) => {
    try {
        const { id } = req.params;
        const { employeeTypes, grades, departments, costCenters } = req.body;
        const scope = await prisma_1.prisma.payrollScope.upsert({
            where: { userId: Number(id) },
            update: {
                employeeTypes: employeeTypes ? JSON.stringify(employeeTypes) : null,
                grades: grades ? JSON.stringify(grades) : null,
                departments: departments ? JSON.stringify(departments) : null,
                costCenters: costCenters ? JSON.stringify(costCenters) : null
            },
            create: {
                userId: Number(id),
                employeeTypes: employeeTypes ? JSON.stringify(employeeTypes) : null,
                grades: grades ? JSON.stringify(grades) : null,
                departments: departments ? JSON.stringify(departments) : null,
                costCenters: costCenters ? JSON.stringify(costCenters) : null
            }
        });
        res.json(scope);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.setPayrollScope = setPayrollScope;
// ── Get Audit Logs ────────────────────────────────────────────────────
const getAuditLogs = async (req, res) => {
    try {
        const { page = 1, limit = 50, module, action } = req.query;
        const where = {};
        if (module)
            where.module = module;
        if (action)
            where.action = { contains: String(action), mode: 'insensitive' };
        const [logs, total] = await Promise.all([
            prisma_1.prisma.auditLog.findMany({
                where,
                include: { user: { select: { email: true, role: true } } },
                orderBy: { createdAt: 'desc' },
                take: Number(limit),
                skip: (Number(page) - 1) * Number(limit)
            }),
            prisma_1.prisma.auditLog.count({ where })
        ]);
        res.json({ logs, total, page: Number(page), limit: Number(limit) });
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getAuditLogs = getAuditLogs;
// ── Create new user ───────────────────────────────────────────────────
const createUser = async (req, res) => {
    try {
        const bcrypt = require('bcrypt');
        const { email, password, roleIds, empId } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: 'Email and password required' });
        const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existing)
            return res.status(400).json({ message: 'Email already exists' });
        const hashed = await bcrypt.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: { email, password: hashed, role: 'user', empId: empId ? Number(empId) : null }
        });
        if (roleIds?.length) {
            await prisma_1.prisma.userRole.createMany({
                data: roleIds.map((rid) => ({ userId: user.id, roleId: rid })),
                skipDuplicates: true
            });
        }
        await prisma_1.prisma.auditLog.create({
            data: { userId: req.user.id, action: 'USER_CREATED', module: 'access_control', recordId: String(user.id), ipAddress: req.ip ? String(req.ip) : null }
        });
        res.status(201).json({ id: user.id, email: user.email });
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createUser = createUser;
// ── Toggle user active ────────────────────────────────────────────────
const toggleUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma_1.prisma.user.findUnique({ where: { id: Number(id) } });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        const updated = await prisma_1.prisma.user.update({ where: { id: Number(id) }, data: { isActive: !user.isActive } });
        res.json({ isActive: updated.isActive });
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.toggleUser = toggleUser;
