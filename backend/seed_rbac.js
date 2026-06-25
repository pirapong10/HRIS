/**
 * seed_rbac.js
 * Seeds: Roles, Permissions, RolePermissions, and assigns Super Admin role to admin user.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Permission Matrix ───────────────────────────────────────────────
// modules × actions
const MODULES = ['dashboard','organization','employee','attendance','leave','shift','payroll','reports','settings','access_control','audit_logs'];
const ACTIONS = ['view','create','edit','delete','approve','export'];

// ── Role Definitions ────────────────────────────────────────────────
const ROLES = [
  { code: 'SUPER_ADMIN',      name: 'Super Admin',       level: 100, description: 'Full system access' },
  { code: 'SYSTEM_ADMIN',     name: 'System Admin',      level: 90,  description: 'Technical & user management, no payroll' },
  { code: 'HR_DIRECTOR',      name: 'HR Director',       level: 80,  description: 'All HR data, payroll summary, headcount approval' },
  { code: 'HR_MANAGER',       name: 'HR Manager',        level: 70,  description: 'Employee & attendance management for assigned depts' },
  { code: 'PAYROLL_MANAGER',  name: 'Payroll Manager',   level: 60,  description: 'Run & approve payroll, export bank files' },
  { code: 'PAYROLL_OFFICER',  name: 'Payroll Officer',   level: 50,  description: 'Calculate & process payroll for assigned scope' },
  { code: 'DEPT_MANAGER',     name: 'Department Manager',level: 40,  description: 'Own dept: approve leave, OT, attendance' },
  { code: 'EMPLOYEE',         name: 'Employee',          level: 10,  description: 'Self-service: own profile, leave/OT request' },
];

// ── Permission grants per role ───────────────────────────────────────
// Format: 'module:action' | 'module:*' (all actions) | '*:*' (everything)
const ROLE_PERMISSIONS = {
  SUPER_ADMIN: ['*:*'],

  SYSTEM_ADMIN: [
    'dashboard:view',
    'organization:view','organization:create','organization:edit','organization:delete',
    'employee:view','employee:create','employee:edit','employee:delete',
    'attendance:view','attendance:create','attendance:edit',
    'leave:view','leave:create','leave:edit','leave:approve',
    'shift:view','shift:create','shift:edit','shift:delete',
    'reports:view','reports:export',
    'settings:view','settings:create','settings:edit','settings:delete',
    'access_control:view','access_control:create','access_control:edit','access_control:delete',
    'audit_logs:view','audit_logs:export',
  ],

  HR_DIRECTOR: [
    'dashboard:view',
    'organization:view','organization:create','organization:edit','organization:approve',
    'employee:view','employee:create','employee:edit',
    'attendance:view','attendance:approve',
    'leave:view','leave:approve',
    'shift:view',
    'payroll:view','payroll:export','payroll:approve',
    'reports:view','reports:export',
    'access_control:view',
    'audit_logs:view',
  ],

  HR_MANAGER: [
    'dashboard:view',
    'organization:view','organization:create','organization:edit',
    'employee:view','employee:create','employee:edit','employee:delete',
    'attendance:view','attendance:create','attendance:edit','attendance:approve',
    'leave:view','leave:create','leave:approve',
    'shift:view','shift:create','shift:edit',
    'reports:view',
  ],

  PAYROLL_MANAGER: [
    'dashboard:view',
    'employee:view',
    'payroll:view','payroll:create','payroll:edit','payroll:approve','payroll:export',
    'reports:view','reports:export',
  ],

  PAYROLL_OFFICER: [
    'dashboard:view',
    'employee:view',
    'payroll:view','payroll:create','payroll:edit',
    'reports:view',
  ],

  DEPT_MANAGER: [
    'dashboard:view',
    'employee:view',
    'attendance:view','attendance:approve',
    'leave:view','leave:approve',
    'shift:view',
  ],

  EMPLOYEE: [
    'dashboard:view',
    'employee:view', // own only - enforced by data scope
    'attendance:view',
    'leave:view','leave:create',
    'payroll:view', // own payslip only
  ],
};

async function main() {
  console.log('🔐 Seeding RBAC...\n');

  // 1. Create all permissions
  console.log('📋 Creating Permissions...');
  const permMap = {}; // code → Permission

  for (const module of MODULES) {
    for (const action of ACTIONS) {
      const code = `${module}:${action}`;
      const perm = await prisma.permission.upsert({
        where: { code },
        update: {},
        create: { module, action, code, description: `${action} ${module}` }
      });
      permMap[code] = perm;
    }
  }
  console.log(`  ✔ ${Object.keys(permMap).length} permissions`);

  // 2. Create roles
  console.log('\n👑 Creating Roles...');
  const roleMap = {}; // code → Role
  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, level: r.level, description: r.description },
      create: r
    });
    roleMap[r.code] = role;
    console.log(`  ✔ ${r.name} (level ${r.level})`);
  }

  // 3. Assign permissions to roles
  console.log('\n🔗 Assigning Permissions to Roles...');
  for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = roleMap[roleCode];

    // Resolve '*:*' or 'module:*'
    let resolved = [];
    for (const code of permCodes) {
      if (code === '*:*') {
        resolved = Object.keys(permMap);
        break;
      } else if (code.endsWith(':*')) {
        const mod = code.replace(':*', '');
        resolved.push(...Object.keys(permMap).filter(k => k.startsWith(mod + ':')));
      } else {
        if (permMap[code]) resolved.push(code);
      }
    }

    // Remove existing then re-insert
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const rows = resolved.map(code => ({ roleId: role.id, permissionId: permMap[code].id }));
    await prisma.rolePermission.createMany({ data: rows, skipDuplicates: true });
    console.log(`  ✔ ${roleCode}: ${rows.length} permissions`);
  }

  // 4. Assign SUPER_ADMIN role to admin user
  console.log('\n👤 Assigning Super Admin role to admin user...');
  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (adminUser) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: roleMap['SUPER_ADMIN'].id } },
      update: {},
      create: { userId: adminUser.id, roleId: roleMap['SUPER_ADMIN'].id }
    });
    // Also update legacy role field
    await prisma.user.update({ where: { id: adminUser.id }, data: { role: 'admin' } });
    console.log(`  ✔ admin (${adminUser.email}) → SUPER_ADMIN`);
  } else {
    console.log('  ⚠ No admin user found. Create one first.');
  }

  console.log('\n─────────────────────────────────────');
  console.log('✅ RBAC Seed Complete!');
  console.log(`  Permissions : ${Object.keys(permMap).length}`);
  console.log(`  Roles       : ${ROLES.length}`);
  console.log('─────────────────────────────────────');
}

main()
  .catch(e => { console.error('❌ Seed failed:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
