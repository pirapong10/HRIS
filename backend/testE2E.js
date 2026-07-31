const util = require('util');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTests() {
  try {
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@company.com', password: 'admin123' })
    }).then(r => r.json());
    
    const token = loginRes.token;
    const headers = { Authorization: `Bearer ${token}` };

    console.log('--- Test A: Tree API ---');
    const treeRes = await fetch('http://localhost:3000/api/departments', { headers }).then(r => r.json());
    if (Array.isArray(treeRes)) {
      console.log(util.inspect(treeRes.map(d => ({ id: d.id, name: d.name, type: d.type, children: d.children ? d.children.length : 0 })), { depth: null }));
    } else {
      console.log("Tree API returned:", treeRes);
    }

    console.log('\n--- Test B: Subtree scope expansion ---');
    const regN = await prisma.department.findFirst({ where: { code: 'REG-N' } });
    const testHash = 'test123';
    let testUser = await prisma.user.findUnique({ where: { email: 'test@test.com' } });
    if (!testUser) {
      const bcrypt = require('bcrypt');
      const hashed = await bcrypt.hash(testHash, 10);
      testUser = await prisma.user.create({ data: { email: 'test@test.com', password: hashed } });
    }
    const empRole = await prisma.role.findFirst({ where: { code: 'EMPLOYEE' } });
    await prisma.userRole.deleteMany({ where: { userId: testUser.id } });
    await prisma.userRole.create({ data: { userId: testUser.id, roleId: empRole.id } });
    
    await prisma.dataScope.upsert({
      where: { userId: testUser.id },
      update: { departmentIds: JSON.stringify([regN.id]) },
      create: { userId: testUser.id, departmentIds: JSON.stringify([regN.id]) }
    });

    const testLogin = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'test123' })
    }).then(r => r.json());
    const testHeaders = { Authorization: `Bearer ${testLogin.token}` };

    const empRes = await fetch('http://localhost:3000/api/employees', { headers: testHeaders }).then(r => r.json());
    console.log('Employees seen by REG-N scope:', empRes.data.map(e => e.name));

    const adminUser = await prisma.user.findUnique({ where: { email: 'admin@company.com' } });
    const cnx = await prisma.department.findFirst({ where: { code: 'CNX' } });
    const group = await prisma.authGroup.create({
      data: {
        name: 'CNX Branch Access',
        scopeDeptIds: JSON.stringify([cnx.id]),
        members: { create: { userId: testUser.id, assignedBy: adminUser.id } }
      }
    });
    
    await prisma.dataScope.delete({ where: { userId: testUser.id } });
    
    const empResC = await fetch('http://localhost:3000/api/employees', { headers: testHeaders }).then(r => r.json());
    console.log('Employees seen by CNX AuthGroup scope:', empResC.data.map(e => e.name));
    
    await prisma.authGroupMember.deleteMany({ where: { groupId: group.id } });
    await prisma.authGroup.delete({ where: { id: group.id } });

    console.log('\n--- Test D: Flat array still works ---');
    const flatRes = await fetch('http://localhost:3000/api/departments?flat=true', { headers }).then(r => r.json());
    console.log('Flat array length:', flatRes.length);
    console.log('First 3 flat items:', flatRes.slice(0,3).map(d => d.name));

    console.log('\n--- Test E: Circular reference safety ---');
    const hq = await prisma.department.findFirst({ where: { code: 'HQ' } });
    await prisma.department.update({ where: { id: hq.id }, data: { parentId: regN.id } });
    const start = Date.now();
    await fetch('http://localhost:3000/api/employees', { headers: testHeaders }).then(r => r.json());
    console.log('Circular ref test completed in', Date.now() - start, 'ms');
    await prisma.department.update({ where: { id: hq.id }, data: { parentId: null } });
    console.log('Reverted circular ref');

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
runTests();
