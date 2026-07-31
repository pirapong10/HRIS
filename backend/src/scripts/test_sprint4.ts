import { runPayrollEngine } from '../utils/payrollEngine';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  const types = await prisma.employeeType.findMany();
  const fulltimeType = types.find(t => t.code === 'fulltime');
  const contractType = types.find(t => t.code === 'contract');
  const internType = types.find(t => t.code === 'intern');

  const baseVariables = {
    Salary: 30000,
    OTHours: 10,
    LateMinutes: 0,
    LoanDeduction: 0
  };

  console.log("=== 1. Fulltime Employee (Regression check) ===");
  const resFull = await runPayrollEngine(baseVariables, fulltimeType?.id);
  console.log(`Gross: ${resFull.gross}, SSO: ${resFull.computed.SSO}, TAX: ${resFull.computed.TAX}, Net: ${resFull.net}`);

  console.log("\n=== 2. Contractor Employee (Expect SSO=0, TAX=flat rate 3%) ===");
  const resContract = await runPayrollEngine(baseVariables, contractType?.id);
  console.log(`Gross: ${resContract.gross}, SSO: ${resContract.computed.SSO}, TAX: ${resContract.computed.TAX}, Net: ${resContract.net}`);

  console.log("\n=== 3. Intern Employee (Expect SSO=0, TAX=0) ===");
  const resIntern = await runPayrollEngine(baseVariables, internType?.id);
  console.log(`Gross: ${resIntern.gross}, SSO: ${resIntern.computed.SSO}, TAX: ${resIntern.computed.TAX}, Net: ${resIntern.net}`);
}
test();
