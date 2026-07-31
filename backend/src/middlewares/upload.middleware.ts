import multer from 'multer';
import { Request } from 'express';
import path from 'path';
import fs from 'fs';

// สร้างโฟลเดอร์อัตโนมัติหากยังไม่มี
const uploadDir = path.join(__dirname, '../../uploads/leaves');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'));
  }
};

export const uploadLeaveCert = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // กำหนดขนาดสูงสุด 5MB
  fileFilter: fileFilter
});

const attendanceDir = path.join(__dirname, '../../uploads/attendance');
if (!fs.existsSync(attendanceDir)) {
  fs.mkdirSync(attendanceDir, { recursive: true });
}

const attendanceStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, attendanceDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + '-' + file.originalname)
});

export const uploadAttendancePhoto = multer({
  storage: attendanceStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images are allowed for attendance.'));
  }
});