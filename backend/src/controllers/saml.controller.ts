import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-hris-key';

/* 
 * =========================================================================
 * SAML 2.0 / SSO INTEGRATION ARCHITECTURE (Priority 4)
 * =========================================================================
 * To fully activate SAML:
 * 1. npm install passport passport-saml express-session
 * 2. Configure the passport strategy with your IdP (Okta, Azure AD, Google).
 * 3. Uncomment and attach the routes below.
 */

// export const samlLogin = passport.authenticate('saml', { failureRedirect: '/login', failureFlash: true });

// export const samlCallback = async (req: Request, res: Response) => {
//   try {
//     // Passport will attach the authenticated user profile to req.user
//     const samlUser = req.user as any; 
//     const email = samlUser.email || samlUser.nameID;
//
//     if (!email) return res.redirect('/login?error=SAML_NoEmail');
//
//     const user = await prisma.user.findUnique({ where: { email } });
//     if (!user || !user.isActive) return res.redirect('/login?error=Unauthorized');
//
//     // (Optional) load RBAC permissions here...
//     
//     // Generate standard HRIS JWT
//     const token = jwt.sign({ id: user.id, email: user.email, empId: user.empId }, JWT_SECRET, { expiresIn: '1d' });
//
//     // Redirect back to frontend with token in URL or cookie
//     res.redirect(`http://localhost:5173/sso-success?token=${token}`);
//   } catch (err) {
//     res.redirect('/login?error=SSO_Failed');
//   }
// };
