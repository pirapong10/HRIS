import { Queue, Worker, Job } from 'bullmq';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379')
};

export const notificationQueue = new Queue('notificationQueue', { connection });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  }
});

const worker = new Worker('notificationQueue', async (job: Job) => {
  if (job.name === 'SEND_EMAIL') {
    const { to, subject, body } = job.data;
    try {
      await transporter.sendMail({
        from: '"HRIS Notifications" <no-reply@hris.local>',
        to,
        subject,
        html: body
      });
      console.log(`Email sent successfully to ${to}`);
    } catch (err) {
      console.error(`Failed to send email to ${to}:`, err);
      throw err; // Trigger retry
    }
  }
}, { connection });

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with error ${err.message}`);
});
