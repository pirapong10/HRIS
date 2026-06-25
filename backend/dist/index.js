"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const employee_routes_1 = __importDefault(require("./routes/employee.routes"));
const attendance_routes_1 = __importDefault(require("./routes/attendance.routes"));
const approval_routes_1 = __importDefault(require("./routes/approval.routes"));
const department_routes_1 = __importDefault(require("./routes/department.routes"));
const position_routes_1 = __importDefault(require("./routes/position.routes"));
const costcenter_routes_1 = __importDefault(require("./routes/costcenter.routes"));
const rbac_routes_1 = __importDefault(require("./routes/rbac.routes"));
const payroll_routes_1 = __importDefault(require("./routes/payroll.routes"));
const leave_routes_1 = __importDefault(require("./routes/leave.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/employees', employee_routes_1.default);
app.use('/api/attendance', attendance_routes_1.default);
app.use('/api/approvals', approval_routes_1.default);
app.use('/api/departments', department_routes_1.default);
app.use('/api/positions', position_routes_1.default);
app.use('/api/costcenters', costcenter_routes_1.default);
app.use('/api/rbac', rbac_routes_1.default);
app.use('/api/payroll', payroll_routes_1.default);
app.use('/api/leaves', leave_routes_1.default);
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'HRIS API is running' });
});
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
