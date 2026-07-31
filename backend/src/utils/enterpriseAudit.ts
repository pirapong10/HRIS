import { prisma } from '../prisma';
import crypto from 'crypto';

interface AuditPayload {
  userId: number;
  roles: string[];
  ipAddress?: string;
  module: string;
  action: string;
  recordId: string;
  previousState?: any;
  newState?: any;
  aiAssisted?: boolean;
  aiRecommendationId?: string;
  businessReason?: string;
}

export const writeEnterpriseAudit = async (payload: AuditPayload) => {
  try {
    // Stringify JSON payloads securely to prepare for hashing
    const prevStateStr = payload.previousState ? JSON.stringify(payload.previousState) : '{}';
    const newStateStr = payload.newState ? JSON.stringify(payload.newState) : '{}';

    // Fetch the last audit log to chain the hash (Blockchain-like immutability)
    const lastLog = await prisma.enterpriseAuditLog.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { cryptographicHash: true }
    });

    const previousHash = lastLog?.cryptographicHash || 'GENESIS_HASH';

    // Compute SHA-256 Hash
    const hashPayload = `${previousHash}|${payload.userId}|${payload.action}|${payload.recordId}|${prevStateStr}|${newStateStr}|${Date.now()}`;
    const cryptographicHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

    const log = await prisma.enterpriseAuditLog.create({
      data: {
        actorId: payload.userId,
        actorRoles: payload.roles,
        actorIp: payload.ipAddress || 'UNKNOWN',
        module: payload.module,
        action: payload.action,
        recordId: payload.recordId,
        previousState: payload.previousState || null,
        newState: payload.newState || null,
        aiAssisted: payload.aiAssisted || false,
        aiRecommendationId: payload.aiRecommendationId || null,
        businessReason: payload.businessReason || null,
        cryptographicHash
      }
    });

    return log;
  } catch (error) {
    console.error('Failed to write Enterprise Audit Log:', error);
    // Do not throw to prevent breaking main business transactions
  }
};
