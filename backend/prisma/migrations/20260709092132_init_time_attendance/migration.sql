/*
  Warnings:

  - You are about to drop the column `clockIn` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `clockOut` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `locationIn` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `locationOut` on the `Attendance` table. All the data in the column will be lost.
  - Added the required column `checkInLat` to the `Attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `checkInLng` to the `Attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `checkInPhoto` to the `Attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `checkInTime` to the `Attendance` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `date` on the `Attendance` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "clockIn",
DROP COLUMN "clockOut",
DROP COLUMN "locationIn",
DROP COLUMN "locationOut",
ADD COLUMN     "checkInLat" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "checkInLng" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "checkInPhoto" TEXT NOT NULL,
ADD COLUMN     "checkInTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "checkOutPhoto" TEXT,
ADD COLUMN     "checkOutTime" TIMESTAMP(3),
DROP COLUMN "date",
ADD COLUMN     "date" DATE NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'ON_TIME';

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "isFlexible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lateThresholdMins" INTEGER NOT NULL DEFAULT 15;

-- AlterTable
ALTER TABLE "SystemConfig" ALTER COLUMN "companyLat" DROP NOT NULL,
ALTER COLUMN "companyLng" DROP NOT NULL,
ALTER COLUMN "allowedRadiusM" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Attendance_empId_date_idx" ON "Attendance"("empId", "date");
