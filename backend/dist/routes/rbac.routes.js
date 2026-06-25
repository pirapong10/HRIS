"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_controller_1 = require("../controllers/rbac.controller");
const router = (0, express_1.Router)();
// All RBAC routes require authentication
router.use(auth_middleware_1.authenticate);
// ── Roles ────────────────────────────────────────────────────────────
router.get('/roles', (0, auth_middleware_1.requirePermission)('access_control:view'), rbac_controller_1.getRoles);
router.get('/roles/:id', (0, auth_middleware_1.requirePermission)('access_control:view'), rbac_controller_1.getRole);
router.put('/roles/:id/permissions', (0, auth_middleware_1.requireRole)(['SUPER_ADMIN', 'SYSTEM_ADMIN']), rbac_controller_1.updateRolePermissions);
// ── Permissions ───────────────────────────────────────────────────────
router.get('/permissions', (0, auth_middleware_1.requirePermission)('access_control:view'), rbac_controller_1.getPermissions);
// ── Users ─────────────────────────────────────────────────────────────
router.get('/users', (0, auth_middleware_1.requirePermission)('access_control:view'), rbac_controller_1.getUsers);
router.post('/users', (0, auth_middleware_1.requireRole)(['SUPER_ADMIN', 'SYSTEM_ADMIN']), rbac_controller_1.createUser);
router.put('/users/:id/roles', (0, auth_middleware_1.requireRole)(['SUPER_ADMIN', 'SYSTEM_ADMIN', 'HR_DIRECTOR']), rbac_controller_1.assignUserRoles);
router.put('/users/:id/toggle', (0, auth_middleware_1.requireRole)(['SUPER_ADMIN', 'SYSTEM_ADMIN']), rbac_controller_1.toggleUser);
// ── Data & Payroll Scope ──────────────────────────────────────────────
router.put('/users/:id/data-scope', (0, auth_middleware_1.requireRole)(['SUPER_ADMIN', 'HR_DIRECTOR']), rbac_controller_1.setDataScope);
router.put('/users/:id/payroll-scope', (0, auth_middleware_1.requireRole)(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'HR_DIRECTOR']), rbac_controller_1.setPayrollScope);
// ── Audit Logs ────────────────────────────────────────────────────────
router.get('/audit-logs', (0, auth_middleware_1.requirePermission)('audit_logs:view'), rbac_controller_1.getAuditLogs);
exports.default = router;
