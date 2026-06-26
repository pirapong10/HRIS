import { Router } from 'express';
import { getAuthGroups, createAuthGroup, getAuthGroupDetails, updateAuthGroup, deleteAuthGroup, addMembers, removeMember, getMembers } from '../controllers/authGroup.controller';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('access_control:view'), getAuthGroups);
router.post('/', requirePermission('access_control:create'), createAuthGroup);
router.get('/:id', requirePermission('access_control:view'), getAuthGroupDetails);
router.put('/:id', requirePermission('access_control:edit'), updateAuthGroup);
router.delete('/:id', requirePermission('access_control:delete'), deleteAuthGroup);

router.post('/:id/members', requirePermission('access_control:edit'), addMembers);
router.delete('/:id/members/:userId', requirePermission('access_control:edit'), removeMember);
router.get('/:id/members', requirePermission('access_control:view'), getMembers);

export default router;
