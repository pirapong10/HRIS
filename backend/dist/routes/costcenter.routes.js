"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const costcenter_controller_1 = require("../controllers/costcenter.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.authenticate, (0, auth_middleware_1.requirePermission)('organization:view'), costcenter_controller_1.getCostCenters);
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.requirePermission)('organization:create'), costcenter_controller_1.createCostCenter);
exports.default = router;
