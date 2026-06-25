import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';

const prisma = new PrismaClient();

export const getSystemConfig = async (req: Request, res: Response) => {
  try {
    let config = await prisma.systemConfig.findFirst();
    if (!config) {
      config = await prisma.systemConfig.create({
        data: {
          companyLat: 13.7563,
          companyLng: 100.5018,
          allowedRadiusM: 50,
          lateThresholdMins: 15
        }
      });
    }
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateSystemConfig = async (req: Request, res: Response) => {
  try {
    const { companyLat, companyLng, allowedRadiusM, lateThresholdMins } = req.body;
    let config = await prisma.systemConfig.findFirst();
    
    if (config) {
      config = await prisma.systemConfig.update({
        where: { id: config.id },
        data: {
          companyLat: companyLat !== undefined ? parseFloat(companyLat) : config.companyLat,
          companyLng: companyLng !== undefined ? parseFloat(companyLng) : config.companyLng,
          allowedRadiusM: allowedRadiusM !== undefined ? parseInt(allowedRadiusM) : config.allowedRadiusM,
          lateThresholdMins: lateThresholdMins !== undefined ? parseInt(lateThresholdMins) : config.lateThresholdMins
        }
      });
    } else {
      config = await prisma.systemConfig.create({
        data: {
          companyLat: companyLat !== undefined ? parseFloat(companyLat) : 13.7563,
          companyLng: companyLng !== undefined ? parseFloat(companyLng) : 100.5018,
          allowedRadiusM: allowedRadiusM !== undefined ? parseInt(allowedRadiusM) : 50,
          lateThresholdMins: lateThresholdMins !== undefined ? parseInt(lateThresholdMins) : 15
        }
      });
    }

    if ((req as AuthRequest).user) {
      await prisma.auditLog.create({
        data: {
          userId: (req as AuthRequest).user?.id,
          action: 'SETTINGS_UPDATED',
          module: 'system',
          recordId: config ? String(config.id) : null,
          details: 'Updated global geofencing / time settings',
          ipAddress: req.ip ? String(req.ip) : null
        }
      });
    }

    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
