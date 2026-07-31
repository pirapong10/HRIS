import { prisma } from '../prisma';
import crypto from 'crypto';

export class AttendanceService {
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const rad = Math.PI / 180;
    const phi1 = lat1 * rad;
    const phi2 = lat2 * rad;
    const deltaPhi = (lat2 - lat1) * rad;
    const deltaLambda = (lon2 - lon1) * rad;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  static async recordCheckIn(
    employeeId: number,
    lat: number,
    lng: number,
    photoPath: string,
    actorId: number,
    actorRoles: any,
    actorIp: string
  ) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { shift: true }
    });

    if (!employee) throw new Error('Employee not found');

    const config = await prisma.systemConfig.findFirst();
    if (!config) throw new Error('System configuration not found');

    if (config.companyLat != null && config.companyLng != null && config.allowedRadiusM != null) {
      const distance = this.calculateDistance(lat, lng, config.companyLat, config.companyLng);
      if (distance > config.allowedRadiusM) {
        throw new Error('OUT_OF_ZONE');
      }
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const existing = await prisma.attendance.findFirst({
      where: { empId: employeeId, date: today }
    });
    if (existing) {
      throw new Error('Already checked in today');
    }

    let status = 'ON_TIME';
    let lateMinutes = 0;
    const now = new Date();

    if (employee.shift && !employee.shift.isFlexible) {
      const shiftStart = employee.shift.startTime; // e.g. "09:00"
      if (shiftStart) {
        const [sh, sm] = shiftStart.split(':').map(Number);
        const shiftStartMins = sh * 60 + sm;
        const currentMins = now.getHours() * 60 + now.getMinutes();

        const threshold = employee.shift.lateThresholdMins || 15;
        if (currentMins > shiftStartMins + threshold) {
          status = 'LATE';
          lateMinutes = currentMins - shiftStartMins;
        }
      }
    }

    return await prisma.$transaction(async (tx) => {
      const attendance = await tx.attendance.create({
        data: {
          empId: employeeId,
          date: today,
          checkInTime: now,
          checkInLat: lat,
          checkInLng: lng,
          checkInPhoto: photoPath,
          status,
          shiftId: employee.shiftId,
          lateMinutes
        }
      });

      const hash = crypto.createHash('sha256').update(JSON.stringify(attendance) + Date.now().toString()).digest('hex');

      await tx.enterpriseAuditLog.create({
        data: {
          actorId,
          actorRoles: actorRoles || [],
          actorIp: actorIp || 'unknown',
          module: 'attendance',
          action: 'CHECK_IN',
          recordId: String(attendance.id),
          previousState: null as any,
          newState: attendance as any,
          cryptographicHash: hash
        }
      });

      return attendance;
    });
  }
}
