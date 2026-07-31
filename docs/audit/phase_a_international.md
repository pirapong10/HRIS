# Phase A — International Infrastructure ✅ Complete

## Summary of Changes

### 1. Prisma Schema ([schema.prisma](file:///d:/Project/HRIS/backend/prisma/schema.prisma))

**Department model** — 3 new fields + Country type:
```diff
-  type String @default("Department") // Supported: Company | Region | Branch | ...
+  type String @default("Department") // Supported: Country | Company | Region | Branch | ...
+  countryCode   String?  // ISO 3166-1 alpha-2
+  currency      String?  // ISO 4217
+  timezone      String?  // IANA timezone
```

**Employee model** — 2 new fields:
```diff
+  workCountry String?  // country where employee works
+  taxCountry  String?  // country for tax/SSO calculation
```

### 2. Backend Controller ([department.controller.ts](file:///d:/Project/HRIS/backend/src/controllers/department.controller.ts))

- `createDepartment()` — accepts & persists `countryCode`, `currency`, `timezone`
- `updateDepartment()` — same, with `undefined` check for partial updates
- **Employee controller** — no changes needed (already uses `...data` spread)

### 3. Frontend ([Organization.jsx](file:///d:/Project/HRIS/hris/src/pages/Organization.jsx))

- `ORG_LEVEL_CONFIG` — added `Country` with 🌐 globe icon + red (#dc2626) theme
- Type dropdown — "Country (ประเทศ)" added as first option
- **Conditional i18n fields** — 3 input fields (Country Code, Currency, Timezone) auto-appear when type is `Country`, `Company`, or `Branch`
- Form state/reset/edit — all include the new fields

### 4. Seed Data ([seed.ts](file:///d:/Project/HRIS/backend/prisma/seed.ts))

New hierarchy with `Country` root:
```
🌐 Thailand (Country) [TH / THB / Asia/Bangkok]  ← NEW
  └── 🏢 สำนักงานใหญ่ (Company) [TH / THB / Asia/Bangkok]
        ├── 🌍 ภาคกลาง (Region)
        │     └── 🏪 สาขากรุงเทพ (Branch) [TH / THB / Asia/Bangkok]
        │           ├── HR กรุงเทพ (Department)
        │           └── IT กรุงเทพ (Department)
        ├── 🌍 ภาคเหนือ (Region)
        │     ├── 🏪 สาขาเชียงใหม่ (Branch) [TH / THB / Asia/Bangkok]
        │     └── 🏪 สาขาลำปาง (Branch) [TH / THB / Asia/Bangkok]
        └── 🏛️ ฝ่ายสนับสนุน HQ (Division)
```

### 5. expandToSubtree() — No Changes Needed ✅

Already operates on `parentId` chains without checking `type`. A `Country` node is just another department node in the tree.

---

## Verification

| Check | Status |
|-------|--------|
| Schema push to DB | ✅ `prisma db push` succeeded |
| Prisma client regenerated | ✅ v5.11.0 |
| Backend compiles & runs | ✅ port 3000 |
| Frontend compiles & runs | ✅ port 5173 |
| Country in type dropdown | ✅ Verified in browser |
| i18n fields appear for Country/Company/Branch | ✅ Verified in browser |
| expandToSubtree supports Country | ✅ No code change needed |

---

## To Apply New Seed Data

> [!IMPORTANT]
> The existing DB still has the old hierarchy (HQ as root). To see the new `Thailand` Country node, re-seed:
> ```bash
> cd backend && npx ts-node prisma/seed.ts
> ```
> ⚠️ This will **reset all data** (employees, users, etc.)

---

## Ready for Phase B

Phase A provides the foundation for:
- **Phase B** — Payroll Engine can now query `countryCode` / `currency` to determine tax strategy
- **Phase C** — Compliance tracking can leverage `workCountry` / `taxCountry` on Employee
