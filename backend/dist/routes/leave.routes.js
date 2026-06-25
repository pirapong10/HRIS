"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leave_controller_1 = require("../controllers/leave.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.authenticate, (0, auth_middleware_1.requirePermission)('leave:view'), leave_controller_1.getLeaves);
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.requirePermission)('leave:create'), leave_controller_1.createLeave);
exports.default = router;
