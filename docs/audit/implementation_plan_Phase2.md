# Implementation Plan: Phase 2 (Token & Audit Hardening)

## 1. P2-1 · Add `jti` to JWT Payload
**Current State:** The JWTs generated during login (`auth.controller.ts`) currently lack a unique identifier (JWT ID).
**Action Plan:**
1. Install `uuid` if not already present.
2. Import `v4` from `uuid` in `src/controllers/auth.controller.ts`.
3. In the `login` function, add `jti: uuidv4()` to the `tokenPayload` object.
4. Update the `JWTPayload` interface inside `src/middlewares/auth.middleware.ts` to include `jti: string`.

## 2. P2-2 · Create `writeAudit()` Helper
**Current State:** Audit logs are currently being written directly via `prisma.auditLog.create` scattered across files.
**Action Plan:**
1. Create `src/utils/audit.ts`.
2. Export an async `writeAudit(params)` helper function wrapping the Prisma call.
3. Wrap it in a `try...catch` block. If it fails, it will only log to the console and cleanly swallow the error to guarantee it never crashes the primary business logic request.

## 3. P2-3 · Add Audit Log to Employee CRUD
**Action Plan:**
1. Open `src/controllers/employee.controller.ts`.
2. Import `writeAudit` from `../utils/audit`.
3. Locate the Employee creation endpoint and add `writeAudit({ action: 'CREATE', module: 'employee', details: ... })`.
4. Locate the Employee update endpoint and add `writeAudit({ action: 'UPDATE', ... })`.
5. Locate the Employee deletion endpoint and add `writeAudit({ action: 'DELETE', ... })`.

## 4. P2-4 · Add Audit Log to Payroll Actions
**Action Plan:**
1. Open `src/controllers/payroll.controller.ts`.
2. Import `writeAudit` from `../utils/audit`.
3. Inside `runPayroll` (after successful `upsert`), call `writeAudit` (action: 'CREATE').
4. Inside the payroll approval endpoint (if it exists) or wherever status mutations happen, call `writeAudit` (action: 'UPDATE').
5. Inside `exportBankFile`, call `writeAudit` (action: 'UPDATE', details: 'exported bank file').

## 5. P2-5 · Refactor Token Blacklist to use `jti`
**Current State:** A token blacklist exists but relies on storing the full JWT string (`token`).
**Action Plan:**
1. Update `schema.prisma`: Modify the `TokenBlacklist` model to replace the `token String @unique` column with `jti String @unique`. Include `expiresAt DateTime`.
2. Run Prisma migration / push to update the database schema.
3. In `auth.controller.ts` (logout) and user toggle functions, extract the `jti` from the token and blacklist it via `jti` instead of the full token string.
4. Update `auth.middleware.ts`: Extract `decoded.jti` and verify it against `prisma.tokenBlacklist.findUnique({ where: { jti } })`.

## Review Check
Upon completion, Phase 2 will achieve a highly secure, traceable architecture where tokens can be pinpoint-revoked and every domain mutation is systematically logged without risk of cascading failures.
