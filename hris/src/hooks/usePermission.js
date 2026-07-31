import { useAuth } from '../context/AuthContext';

export const usePermission = () => {
  const { hasPerm } = useAuth();
  
  return {
    canViewOrg: hasPerm('organization:view'),
    canEditOrg: hasPerm('organization:edit'),
    canViewEmp: hasPerm('employee:view'),
    canEditEmp: hasPerm('employee:edit'),
    canApproveAtt: hasPerm('attendance:approve'),
    canApproveLeave: hasPerm('leave:approve'),
    canRunPayroll: hasPerm('payroll:create'),
    hasPerm
  };
};
