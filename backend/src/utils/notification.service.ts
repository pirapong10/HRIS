import { prisma } from '../prisma';
import { notificationQueue } from '../queues/notification.queue';
import { io } from '../index';

export const dispatchNotification = async (
  userId: number,
  title: string,
  message: string,
  type: string,
  options: { email?: boolean, emailTo?: string } = {}
) => {
  try {
    // 1. Save to DB
    const notif = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        isRead: false
      }
    });

    // 2. Emit Socket Event
    if (io) {
      io.to(`user_${userId}`).emit('new_notification', notif);
    }

    // 3. Dispatch Email Job
    if (options.email && options.emailTo) {
      await notificationQueue.add('SEND_EMAIL', {
        to: options.emailTo,
        subject: title,
        body: `<p>${message}</p>`
      });
    }

    return notif;
  } catch (error) {
    console.error('Error dispatching notification:', error);
  }
};
