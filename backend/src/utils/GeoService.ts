export class GeoService {
  private static readonly R = 6371e3; // Earth's radius in meters

  /**
   * Calculates distance between two coordinates in meters using Haversine formula
   */
  static getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dp / 2) * Math.sin(dp / 2) + 
              Math.cos(p1) * Math.cos(p2) * 
              Math.sin(dl / 2) * Math.sin(dl / 2);
              
    return this.R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  /**
   * Validates if a given coordinate is within the allowed radius of the office.
   * Throws an error if outside the radius or if environment variables are missing.
   */
  static validateLocation(lat: number, lng: number): { isValid: boolean, distance: number } {
    const officeLat = process.env.OFFICE_LAT ? parseFloat(process.env.OFFICE_LAT) : null;
    const officeLng = process.env.OFFICE_LNG ? parseFloat(process.env.OFFICE_LNG) : null;
    const allowedRadius = process.env.ALLOWED_RADIUS ? parseFloat(process.env.ALLOWED_RADIUS) : 500;

    if (officeLat === null || officeLng === null) {
      throw new Error("Server configuration error: Geofencing coordinates are not set.");
    }

    const distance = this.getDistance(officeLat, officeLng, lat, lng);

    if (distance > allowedRadius) {
      return { isValid: false, distance };
    }

    return { isValid: true, distance };
  }
}
