import { prisma } from '../prisma';

export async function writeAudit(data: {
  userId?: number;
  action: string;
  module?: string;
  recordId?: string;
  details?: string;
  ipAddress?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        module: data.module,
        recordId: data.recordId,
        details: data.details,
        ipAddress: data.ipAddress
      }
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Deliberately swallowing error to prevent breaking main transaction
  }
}
