"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.getMe = exports.login = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../prisma");
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-hris-key';
// Helper: load full permissions for a user
async function loadUserPermissions(userId) {
    const userRoles = await prisma_1.prisma.userRole.findMany({
        where: { userId },
        include: {
            role: {
                include: {
                    permissions: { include: { permission: true } }
                }
            }
        }
    });
    const permSet = new Set();
    const roles = [];
    let maxLevel = 0;
    let deptIds = [];
    for (const ur of userRoles) {
        roles.push(ur.role.code);
        if (ur.role.level > maxLevel)
            maxLevel = ur.role.level;
        if (ur.deptIds) {
            try {
                deptIds = [...deptIds, ...JSON.parse(ur.deptIds)];
            }
            catch { }
        }
        for (const rp of ur.role.permissions) {
            permSet.add(rp.permission.code);
        }
    }
    return {
        roles,
        permissions: Array.from(permSet),
        level: maxLevel,
        deptIds: [...new Set(deptIds)]
    };
}
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is suspended' });
        }
        const isMatch = await bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            await prisma_1.prisma.auditLog.create({
                data: { action: 'LOGIN_FAILED', details: `Failed login for: ${email}`, ipAddress: req.ip ? String(req.ip) : null }
            });
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Load RBAC permissions
        const rbac = await loadUserPermissions(user.id);
        await prisma_1.prisma.auditLog.create({
            data: { userId: user.id, action: 'LOGIN_SUCCESS', module: 'auth', ipAddress: req.ip ? String(req.ip) : null }
        });
        const tokenPayload = {
            id: user.id,
            email: user.email,
            role: user.role, // legacy
            roles: rbac.roles,
            permissions: rbac.permissions,
            level: rbac.level,
            deptIds: rbac.deptIds,
            empId: user.empId
        };
        const token = jsonwebtoken_1.default.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                roles: rbac.roles,
                permissions: rbac.permissions,
                level: rbac.level,
                deptIds: rbac.deptIds,
                empId: user.empId
            }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, email: true, role: true, empId: true, isActive: true }
        });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        // Return fresh permissions
        const rbac = await loadUserPermissions(user.id);
        res.json({ ...user, roles: rbac.roles, permissions: rbac.permissions, level: rbac.level, deptIds: rbac.deptIds });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getMe = getMe;
const logout = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jsonwebtoken_1.default.decode(token);
            if (decoded && decoded.exp) {
                await prisma_1.prisma.tokenBlacklist.create({
                    data: {
                        token,
                        expiresAt: new Date(decoded.exp * 1000)
                    }
                });
            }
        }
        await prisma_1.prisma.auditLog.create({
            data: { userId: req.user?.id, action: 'LOGOUT', module: 'auth', ipAddress: req.ip ? String(req.ip) : null }
        });
        res.json({ message: 'Logged out successfully' });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.json({ message: 'Logged out' });
    }
};
exports.logout = logout;
