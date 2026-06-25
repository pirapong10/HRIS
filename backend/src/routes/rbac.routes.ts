import { Router } from 'express';
import { authenticate, requirePermission, requireRole } from '../middlewares/auth.middleware';
import {
  getRoles, getRole, updateRolePermissions,
  getPermissions,
  getUsers, assignUserRoles, createUser, toggleUser,
  setDataScope, setPayrollScope,
  getAuditLogs
} from '../controllers/rbac.controller';

const router = Router();

// All RBAC routes require authentication
router.use(authenticate);

// ── Roles ────────────────────────────────────────────────────────────
router.get('/roles', requirePermission('access_control:view'), getRoles);
router.get('/roles/:id', requirePermission('access_control:view'), getRole);
router.put('/roles/:id/permissions', requireRole(['SUPER_ADMIN', 'SYSTEM_ADMIN']), updateRolePermissions);

// ── Permissions ───────────────────────────────────────────────────────
router.get('/permissions', requirePermission('access_control:view'), getPermissions);

// ── Users ─────────────────────────────────────────────────────────────
router.get('/users', requirePermission('access_control:view'), getUsers);
router.post('/users', requireRole(['SUPER_ADMIN', 'SYSTEM_ADMIN']), createUser);
router.put('/users/:id/roles', requireRole(['SUPER_ADMIN', 'SYSTEM_ADMIN', 'HR_DIRECTOR']), assignUserRoles);
router.put('/users/:id/toggle', requireRole(['SUPER_ADMIN', 'SYSTEM_ADMIN']), toggleUser);

// ── Data & Payroll Scope ──────────────────────────────────────────────
router.put('/users/:id/data-scope', requireRole(['SUPER_ADMIN', 'HR_DIRECTOR']), setDataScope);
router.put('/users/:id/payroll-scope', requireRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'HR_DIRECTOR']), setPayrollScope);

// ── Audit Logs ────────────────────────────────────────────────────────
router.get('/audit-logs', requirePermission('audit_logs:view'), getAuditLogs);

export default router;
