import { prisma } from '../prisma';

interface AuditParams {
  userId?: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'PERMISSION_CHANGED' | 'ROLE_ASSIGNED' | 'USER_CREATED';
  module: 'auth' | 'employee' | 'organization' | 'attendance' | 'payroll' | 'access_control' | 'settings' | 'shift';
  recordId?: string;
  details: string;
  ipAddress?: string;
}

export const writeAudit = async (params: AuditParams): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || 0, // 0 for system/unauthenticated
        action: params.action,
        module: params.module,
        details: params.details,
        ipAddress: params.ipAddress
      }
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Deliberately swallowing error to prevent breaking main transaction
  }
};
