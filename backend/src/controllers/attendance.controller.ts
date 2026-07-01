import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { buildEmployeeWhereClause } from '../utils/scopeFilter';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const scopeWhere = req.user ? await buildEmployeeWhereClause(req.user) : {};
    if (scopeWhere.id === -1) return res.json({ data: [], total: 0, page: 1, limit: 50 });
    
    // We filter attendance records based on the employee scope
    const whereClause: any = Object.keys(scopeWhere).length > 0 ? { employee: scopeWhere } : {};

    // Extract pagination from query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    
    if (search) {
      whereClause.employee = {
        ...whereClause.employee,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { empCode: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where: whereClause,
        include: { employee: true, shift: true },
        skip,
        take: limit,
        orderBy: { date: 'desc' }
      }),
      prisma.attendance.count({ where: whereClause })
    ]);
    
    res.json({ data: records, total, page, limit });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Haversine formula to calculate distance in meters
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // meters
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
};

export const clockIn = async (req: any, res: Response) => {
  try {
    const { lat, lng } = req.body;
    const empId = req.user.empId;
    
    if (!empId) return res.status(400).json({ message: 'User is not linked to an employee' });
    if (!lat || !lng) return res.status(400).json({ message: 'Location data (lat, lng) is required' });

    // Fetch dynamic system geofencing configuration
    const config = await prisma.systemConfig.findFirst();

    if (config) {
      const OFFICE_LAT = config.companyLat || 13.7563;
      const OFFICE_LNG = config.companyLng || 100.5018;
      const ALLOWED_RADIUS = config.allowedRadiusM || 500;

      const dist = getDistance(OFFICE_LAT, OFFICE_LNG, lat, lng);
      
      if (dist > ALLOWED_RADIUS) {
        return res.status(400).json({ 
          message: `คุณอยู่นอกพื้นที่ที่อนุญาต (ห่าง ${Math.round(dist)} เมตร จากจุดที่กำหนด)` 
        });
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString("th-TH");

    // Check if already clocked in today
    const existing = await prisma.attendance.findFirst({
      where: { empId, date: today }
    });

    if (existing) {
      return res.status(400).json({ message: 'Already clocked in today' });
    }

    const record = await prisma.attendance.create({
      data: {
        empId,
        date: today,
        clockIn: time,
        status: "present",
        locationIn: `${lat},${lng}`
      }
    });

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const clockOut = async (req: any, res: Response) => {
  try {
    const { lat, lng } = req.body;
    const empId = req.user.empId;

    if (!empId) return res.status(400).json({ message: 'User is not linked to an employee' });
    if (!lat || !lng) return res.status(400).json({ message: 'Location data (lat, lng) is required' });

    // Fetch dynamic system geofencing configuration
    const config = await prisma.systemConfig.findFirst();

    if (config) {
      const OFFICE_LAT = config.companyLat || 13.7563;
      const OFFICE_LNG = config.companyLng || 100.5018;
      const ALLOWED_RADIUS = config.allowedRadiusM || 500;

      const dist = getDistance(OFFICE_LAT, OFFICE_LNG, lat, lng);
      
      if (dist > ALLOWED_RADIUS) {
        return res.status(400).json({ 
          message: `คุณอยู่นอกพื้นที่ที่อนุญาต (ห่าง ${Math.round(dist)} เมตร จากจุดที่กำหนด)` 
        });
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString("th-TH");

    const existing = await prisma.attendance.findFirst({
      where: { empId, date: today }
    });

    if (!existing) {
      return res.status(400).json({ message: 'No clock-in record found for today' });
    }

    const updated = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        clockOut: time,
        locationOut: `${lat},${lng}`
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
