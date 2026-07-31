# Implementation Plan: Phase 4 (Long-term Refactor)

## 1. P4-1 · Frontend Component Splitting (`App.jsx`)
**Current Assessment:** Although the task dictates that `App.jsx` is a ~3,541-line monolith, an audit reveals that **the extraction into `src/pages/*` is technically already complete in the codebase** (currently ~200 lines). The router and layout structure are modularized.
**Action Plan:** 
1. I will conduct a final review of `App.jsx` to ensure all legacy code (such as `UserMgmt`) and deprecated auth variables are completely removed as required by TD-10 and TD-11.
2. No major architectural split is needed, we just need to finalize the cleanup.

## 2. P4-2 · Server-side Pagination
**Current Assessment:** `employee.controller.ts` currently has `page` and `limit` logic implemented. 
**Action Plan:**
1. Verify `attendance.controller.ts` and `rbac.controller.ts` (Audit Logs) correctly implement `page`, `limit`, `take`, and `skip`.
2. Update the React frontend lists (`Employee.jsx`, `Attendance.jsx`, `AuditLogModule.jsx`) to actually pass `?page=X&limit=Y` parameters and utilize the returned `total` count for bottom-of-page pagination controls.

## 3. P4-3 · Refresh Token Mechanism
**Current Assessment:** The backend currently issues a single, long-lived (1 day) JWT. This is poor practice.
**Action Plan:**
1. **Schema Update:** Add `RefreshToken` model to `schema.prisma` (with `token`, `userId`, `expiresAt`, `isRevoked`).
2. **Auth Controller:** Modify `login` to generate:
   - Access Token (expires in 15m).
   - Refresh Token (expires in 7d).
3. **Cookie Injection:** Send the Refresh Token back to the client as a secure `httpOnly` cookie.
4. **Endpoint:** Create `POST /api/auth/refresh` to validate the `httpOnly` cookie, check against the database for revocation, and return a fresh Access Token.
5. **Frontend Interceptor:** Add an Axios interceptor to automatically catch 401 Unauthorized errors, call the `/refresh` endpoint, and retry the failed request seamlessly.

## 4. P4-4 · Permission Caching (Redis)
**Current Assessment:** `requirePermission` middleware queries the database (via `loadUserPermissions`) on every single protected API hit. This is a massive bottleneck.
**Action Plan:**
1. **Infrastructure:** Introduce `redis` client to the backend project.
2. **Middleware:** In `auth.middleware.ts`, attempt to read `permissions:user:${id}` from Redis. If missing, fetch from Prisma and cache it with a 1-hour TTL.
3. **Invalidation:** Modify `updateRolePermissions` and `assignUserRoles` in `rbac.controller.ts` to actively trigger `redis.del(\`permissions:user:${id}\`)` so that caches are cleared instantaneously when an admin alters a user's rights.
