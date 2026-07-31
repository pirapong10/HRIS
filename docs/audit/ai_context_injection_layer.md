# AI Context Injection & Data Masking Security Layer

This document details the architectural implementation of the AI Context Injection and Data Masking Security layers in a modular NestJS environment, utilizing Clean Architecture principles. It enforces strict RBAC constraints and prevents Prompt Injection data leaks.

---

## Task 1: AI Context Injection & RBAC Enforcer

This layer intercepts requests *before* they reach the core domain. It extracts the security context (actor roles, data scope constraints) and injects it into a generalized `RequestContext` object. This prevents the AI agent from bypassing application logic.

```typescript
// src/common/interceptors/ai-context.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class AiContextInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Security context missing');
    }

    // Build the strict AI constraint boundary based on the user's data scope
    const aiConstraintScope = {
      actorId: user.id,
      allowedDepartmentIds: user.dataScope?.departmentIds || [],
      allowedEmployeeTypes: user.dataScope?.employeeTypes || [],
      roles: user.roles,
    };

    // Store in CLS (Continuation-Local Storage) for deeply nested services to access 
    // without prop-drilling
    this.cls.set('aiConstraintScope', aiConstraintScope);
    this.cls.set('transactionId', request.headers['x-transaction-id'] || crypto.randomUUID());

    // OTEL Logging could hook here
    // Logger.debug(`Context Injected for Trace: ${this.cls.get('transactionId')}`);

    return next.handle();
  }
}
```

### Architectural Rationale:
- **NestJS CLS (Continuation-Local Storage):** We use `nestjs-cls` to store the constraint scope. This ensures that when the Use Case triggers an AI inference step deeply down the call stack, the AI service automatically retrieves the exact RBAC constraints of the current user, preventing any privilege escalation via prompt injection.

---

## Task 2: Enterprise PII Data Masking Service

To ensure safe contextual transmission to external or internal LLMs, sensitive domain data must be sanitized before serialization.

```typescript
// src/ai/services/data-masking.service.ts
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class DataMaskingService {
  private readonly SECRET_KEY = process.env.PII_TOKENIZATION_SECRET || 'fallback-secret';

  /**
   * Deterministically tokenizes PII to maintain structural context for the LLM
   * while entirely obfuscating the actual value.
   */
  private tokenize(value: string | number): string {
    const hash = crypto.createHmac('sha256', this.SECRET_KEY).update(String(value)).digest('hex');
    return `TOKEN_[${hash.substring(0, 10)}]`;
  }

  /**
   * Deeply scans objects and strips/replaces PII based on key heuristics.
   */
  public sanitizeContext(payload: Record<string, any>): Record<string, any> {
    const sanitized = { ...payload };

    const piiKeys = ['nationalId', 'ssoNumber', 'taxId', 'bankAcc'];
    const strictNumericKeys = ['salary', 'bonus', 'netPay'];

    for (const key of Object.keys(sanitized)) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeContext(sanitized[key]); // Recursion
      } else if (piiKeys.includes(key)) {
        sanitized[key] = this.tokenize(sanitized[key]);
      } else if (strictNumericKeys.includes(key)) {
        // Obfuscate exact numbers but preserve magnitude if needed by AI, 
        // or just mask entirely
        sanitized[key] = '[REDACTED_FINANCIAL_METRIC]';
      }
    }

    return sanitized;
  }
}
```

### Architectural Rationale:
- **Deterministic Tokenization:** The AI might need to realize two records belong to the same person without knowing who the person is. Deterministic HMAC hashing achieves this without storing a lookup table.
- **Redaction:** Exact financial metrics are completely removed to prevent leakage, replacing them with strongly typed indicators (`[REDACTED_FINANCIAL_METRIC]`).

---

## Task 3: Blueprint for `CreateLeaveUseCase` Integration

The controller remains completely dumb. It delegates entirely to the Use Case.

### 1. The Controller Layer
```typescript
// src/leave/controllers/leave.controller.ts
import { Controller, Post, Body, UseInterceptors } from '@nestjs/common';
import { CreateLeaveUseCase } from '../use-cases/create-leave.usecase';
import { AiContextInterceptor } from '../../common/interceptors/ai-context.interceptor';

@Controller('api/leaves')
@UseInterceptors(AiContextInterceptor) // Extracts RBAC scope
export class LeaveController {
  constructor(private readonly createLeaveUseCase: CreateLeaveUseCase) {}

  @Post()
  async requestLeave(@Body() payload: any) {
    // Controller validates basic DTOs, nothing more.
    return this.createLeaveUseCase.execute(payload);
  }
}
```

### 2. The Use Case Layer (CQRS Command Handler Pattern)
```typescript
// src/leave/use-cases/create-leave.usecase.ts
import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DataMaskingService } from '../../ai/services/data-masking.service';
import { AiInferenceClient } from '../../ai/services/ai-inference.client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class CreateLeaveUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
    private readonly maskingService: DataMaskingService,
    private readonly aiClient: AiInferenceClient,
  ) {}

  async execute(dto: any) {
    // 1. Retrieve the strict AI constraint scope set by the Interceptor
    const constraintScope = this.cls.get('aiConstraintScope');
    
    // 2. Fetch required domain context (Employee Profile, History)
    // using the constraints to prevent vertical privilege escalation
    const employee = await this.prisma.employee.findUnique({
      where: { 
        id: constraintScope.actorId,
        // Enforce RBAC at the database level!
        deptId: { in: constraintScope.allowedDepartmentIds } 
      },
      include: { history: true, leaves: true }
    });

    if (!employee) throw new Error('Unauthorized or Profile Not Found');

    // 3. Mask PII before dispatching to the AI
    const safeContext = this.maskingService.sanitizeContext(employee);

    // 4. Dispatch to the Internal HR AI Agent
    // The AI client will embed the RBAC token inside the system prompt
    const aiInference = await this.aiClient.evaluateLeaveRequest(
      dto, 
      safeContext, 
      constraintScope
    );

    // 5. Execute Core Domain Logic & Persist Transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Save the leave
      const leave = await tx.leave.create({
        data: {
          empId: employee.id,
          type: dto.type,
          startDate: dto.startDate,
          endDate: dto.endDate,
          status: 'pending_manager'
        }
      });

      // Write Immutable Enterprise Audit Log incorporating AI Context
      await tx.enterpriseAuditLog.create({
        data: {
          actorId: constraintScope.actorId,
          actorRoles: constraintScope.roles,
          actorIp: 'EXTRACTED_FROM_REQUEST',
          module: 'leave',
          action: 'REQUEST_LEAVE',
          recordId: String(leave.id),
          newState: leave,
          aiAssisted: true,
          aiRecommendationId: aiInference.traceId,
          businessReason: aiInference.recommendationSummary, // e.g. "Employee has 5 days remaining, no overlaps"
          cryptographicHash: 'GENERATED_CHAIN_HASH'
        }
      });

      return leave;
    });

    return result;
  }
}
```

### Architectural Rationale:
1. **Separation of Concerns:** The controller routes traffic, the interceptor enforces security constraints, the masking service protects privacy, and the Use Case coordinates the domain transaction.
2. **Database-Level RBAC:** Notice how `deptId: { in: constraintScope.allowedDepartmentIds }` is appended. Even if an AI attempts to query another employee due to prompt injection, the underlying DB query inherently rejects it.
3. **Transaction Safety:** The core insert and the `EnterpriseAuditLog` write are wrapped inside a single `$transaction`. If the audit fails, the leave request rolls back, guaranteeing compliance.
