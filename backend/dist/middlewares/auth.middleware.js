"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireLevel = exports.requireRole = exports.requirePermission = exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../prisma");
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-hris-key';
// ── Authenticate JWT ─────────────────────────────────────────────────
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const isBlacklisted = await prisma_1.prisma.tokenBlacklist.findUnique({
            where: { token }
        });
        if (isBlacklisted) {
            return res.status(401).json({ message: 'Unauthorized: Token is revoked' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch {
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
};
exports.authenticate = authenticate;
// ── Legacy role guard (kept for backward compat) ────────────────────
const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};
exports.authorize = authorize;
// ── Permission Guard ─────────────────────────────────────────────────
// Usage: requirePermission('employee:create')
const requirePermission = (permCode) => {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const perms = req.user.permissions || [];
        if (perms.includes(permCode) || req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'hr_admin')
            return next();
        return res.status(403).json({
            message: `Forbidden: requires permission '${permCode}'`,
            required: permCode
        });
    };
};
exports.requirePermission = requirePermission;
// ── Role Guard ───────────────────────────────────────────────────────
// Usage: requireRole(['SUPER_ADMIN', 'HR_DIRECTOR'])
const requireRole = (roleCodes) => {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const userRoles = req.user.roles || [];
        if (userRoles.some(r => roleCodes.includes(r)))
            return next();
        return res.status(403).json({ message: `Forbidden: requires role ${roleCodes.join(' or ')}` });
    };
};
exports.requireRole = requireRole;
// ── Min Level Guard ──────────────────────────────────────────────────
// Usage: requireLevel(60) — must have role level ≥ 60
const requireLevel = (minLevel) => {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        if ((req.user.level || 0) >= minLevel)
            return next();
        return res.status(403).json({ message: `Forbidden: insufficient access level` });
    };
};
exports.requireLevel = requireLevel;
