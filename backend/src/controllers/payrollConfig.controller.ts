import { Request, Response } from 'express';
import { PayrollConfigService } from '../services/payrollConfig.service';

const payrollConfigService = new PayrollConfigService();

export const getMappings = async (req: Request, res: Response) => {
  try {
    const employeeType = req.query.employeeType as string;
    const mappings = await payrollConfigService.getMappings(employeeType);
    res.json(mappings);
  } catch (error: any) {
    console.error('Error fetching mappings:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const updateMapping = async (req: Request, res: Response) => {
  try {
    const { employeeType, componentIds } = req.body;
    
    if (!employeeType || !Array.isArray(componentIds)) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    const userId = (req as any).user?.id || 1; // Fallback or read from auth middleware
    const userIp = req.ip || req.connection.remoteAddress || 'unknown';
    const userRoles = (req as any).user?.roles || [];

    await payrollConfigService.updateMapping(employeeType, componentIds, userId, userIp, userRoles);
    
    res.json({ message: 'Mappings updated successfully' });
  } catch (error: any) {
    console.error('Error updating mappings:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
