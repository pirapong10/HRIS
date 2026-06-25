import { Response } from 'express';
import { prisma } from '../prisma';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { AuthRequest } from '../middlewares/auth.middleware';

export const generateMfa = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const secret = speakeasy.generateSecret({
      name: `HRIS (${req.user?.email || 'User'})`
    });

    await prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret.base32 }
    });

    if (secret.otpauth_url) {
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
      res.json({ secret: secret.base32, qrCodeUrl });
    } else {
      res.json({ secret: secret.base32 });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error generating MFA' });
  }
};

export const verifyAndEnableMfa = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const { token } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) {
      return res.status(400).json({ message: 'MFA is not set up' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token
    });

    if (verified) {
      await prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: true }
      });
      res.json({ message: 'MFA enabled successfully' });
    } else {
      res.status(400).json({ message: 'Invalid token' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error verifying MFA' });
  }
};

export const disableMfa = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    await prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null }
    });
    res.json({ message: 'MFA disabled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error disabling MFA' });
  }
};
