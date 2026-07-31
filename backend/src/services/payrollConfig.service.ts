import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export class PayrollConfigService {
  async getMappings(employeeType?: string) {
    const where = employeeType ? { employeeType } : {};
    return await prisma.employeeTypePayrollMapping.findMany({
      where,
      include: {
        payrollComponent: true
      }
    });
  }

  async updateMapping(employeeType: string, componentIds: number[], userId: number, userIp: string, userRoles: any) {
    return await prisma.$transaction(async (tx) => {
      // Get existing components to log previous state
      const existing = await tx.employeeTypePayrollMapping.findMany({
        where: { employeeType }
      });
      const previousState = existing.map(e => e.payrollComponentId);

      // Delete existing mappings
      await tx.employeeTypePayrollMapping.deleteMany({
        where: { employeeType }
      });

      // Insert new mappings
      if (componentIds.length > 0) {
        const data = componentIds.map(id => ({
          employeeType,
          payrollComponentId: id
        }));
        await tx.employeeTypePayrollMapping.createMany({
          data
        });
      }

      const newState = componentIds;

      // Log to EnterpriseAuditLog
      const logData = {
        action: 'UPDATE_EMPLOYEE_TYPE_PAYROLL_MAPPING',
        module: 'payroll_config',
        recordId: employeeType,
        previousState,
        newState,
      };

      const hashContent = JSON.stringify(logData) + Date.now().toString();
      const cryptographicHash = crypto.createHash('sha256').update(hashContent).digest('hex');

      await tx.enterpriseAuditLog.create({
        data: {
          actorId: userId,
          actorRoles: userRoles || {},
          actorIp: userIp || 'unknown',
          module: logData.module,
          action: logData.action,
          recordId: logData.recordId,
          previousState: JSON.parse(JSON.stringify(logData.previousState)),
          newState: JSON.parse(JSON.stringify(logData.newState)),
          cryptographicHash
        }
      });

      return { success: true };
    });
  }
}
