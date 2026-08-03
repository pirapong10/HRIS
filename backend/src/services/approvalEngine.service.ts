import { prisma } from '../prisma';

export interface ApprovalChainEvaluationInput {
  module: 'LEAVE' | 'OT' | 'CORRECTION' | 'HEADCOUNT' | 'EXPENSE';
  empId: number;
  deptId?: number;
  amountOrDays?: number;
}

export interface ResolvedStep {
  stepNumber: number;
  approverType: string;
  assignedEmpId: number;
  actualApproverId?: number;
  isDelegated: boolean;
  delegatedFromEmpId?: number;
}

export class DynamicApprovalEngine {
  /**
   * Resolves the matching ApprovalRule for a request and constructs the dynamic approval chain.
   */
  public static async resolveApprovalChain(input: ApprovalChainEvaluationInput): Promise<ResolvedStep[]> {
    const { module, empId, deptId, amountOrDays = 1 } = input;

    // 1. Fetch employee & manager details
    const employee = await prisma.employee.findUnique({
      where: { id: empId },
      include: { department: true }
    });

    if (!employee) throw new Error(`Employee ID ${empId} not found`);

    const effectiveDeptId = deptId || employee.deptId;

    // 2. Find matching ApprovalRule (ordered by priority desc)
    const matchingRules = await prisma.approvalRule.findMany({
      where: {
        module,
        isActive: true,
        OR: [
          { deptId: effectiveDeptId },
          { deptId: null }
        ]
      },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Filter rules by threshold range if threshold specified
    const matchedRule = matchingRules.find(rule => {
      const minOk = rule.minThreshold === null || rule.minThreshold === undefined || amountOrDays >= rule.minThreshold;
      const maxOk = rule.maxThreshold === null || rule.maxThreshold === undefined || amountOrDays <= rule.maxThreshold;
      return minOk && maxOk;
    });

    // 3. Fallback to Default Direct Manager -> Dept Head chain if no custom rule configured
    if (!matchedRule || matchedRule.steps.length === 0) {
      return this.createDefaultFallbackChain(employee);
    }

    // 4. Resolve each step's approver and check for Delegation (Out of Office)
    const resolvedSteps: ResolvedStep[] = [];

    for (const ruleStep of matchedRule.steps) {
      let targetEmpId: number | null = null;

      switch (ruleStep.approverType) {
        case 'DIRECT_MANAGER':
          targetEmpId = (employee as any).managerId || null;
          // If no direct manager, fallback to Department Head
          if (!targetEmpId && employee.department?.headId) {
            targetEmpId = employee.department.headId;
          }
          break;

        case 'DEPT_HEAD':
          targetEmpId = employee.department?.headId || null;
          break;

        case 'SPECIFIC_USER':
          targetEmpId = ruleStep.specificEmpId || null;
          break;

        case 'ROLE':
          // Resolve first active user with target role
          if (ruleStep.targetRoleId) {
            const userRole = await prisma.userRole.findFirst({
              where: { roleId: ruleStep.targetRoleId },
              include: { user: true }
            });
            if (userRole?.user?.empId) {
              targetEmpId = userRole.user.empId;
            }
          }
          break;

        default:
          targetEmpId = (employee as any).managerId || null;
      }

      // If unresolved, default to department head or admin
      if (!targetEmpId) {
        targetEmpId = employee.department?.headId || 1;
      }

      // Check Active ApprovalDelegate for targetEmpId
      const now = new Date();
      const activeDelegate = await prisma.approvalDelegate.findFirst({
        where: {
          originalEmpId: targetEmpId,
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now }
        }
      });

      if (activeDelegate) {
        resolvedSteps.push({
          stepNumber: ruleStep.stepNumber,
          approverType: ruleStep.approverType,
          assignedEmpId: activeDelegate.delegateEmpId,
          isDelegated: true,
          delegatedFromEmpId: targetEmpId
        });
      } else {
        resolvedSteps.push({
          stepNumber: ruleStep.stepNumber,
          approverType: ruleStep.approverType,
          assignedEmpId: targetEmpId,
          isDelegated: false
        });
      }
    }

    return resolvedSteps;
  }

  /**
   * Default fallback 2-step chain if no rule configured: Direct Manager -> Department Head
   */
  private static createDefaultFallbackChain(employee: any): ResolvedStep[] {
    const managerId = employee.managerId || employee.department?.headId || 1;
    const deptHeadId = employee.department?.headId || managerId;

    const steps: ResolvedStep[] = [
      {
        stepNumber: 1,
        approverType: 'DIRECT_MANAGER',
        assignedEmpId: managerId,
        isDelegated: false
      }
    ];

    if (deptHeadId !== managerId) {
      steps.push({
        stepNumber: 2,
        approverType: 'DEPT_HEAD',
        assignedEmpId: deptHeadId,
        isDelegated: false
      });
    }

    return steps;
  }
}
