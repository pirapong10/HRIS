"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payroll_controller_1 = require("../controllers/payroll.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Run payroll (calculates tax, net, etc. for authorized scope)
// Requires PAYROLL_MANAGER or PAYROLL_OFFICER, and 'payroll:create'
router.post('/run', (0, auth_middleware_1.requirePermission)('payroll:create'), payroll_controller_1.runPayroll);
// Get historical payroll
router.get('/', (0, auth_middleware_1.requirePermission)('payroll:view'), payroll_controller_1.getPayroll);
exports.default = router;
