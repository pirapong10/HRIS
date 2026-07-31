import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- 1. Fetching Components ---');
  // Assume login admin
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@company.com', password: 'admin123' })
  });
  const { token } = await loginRes.json();
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const getRes = await fetch('http://localhost:3000/api/payroll-components', { headers });
  let components = await getRes.json();
  console.log(`✅ Loaded ${components.length} components (expected 8)`);

  console.log('\n--- 2. Create HOUSING Component & Test Formula ---');
  const test1Res = await fetch('http://localhost:3000/api/payroll-components/test', {
    method: 'POST', headers,
    body: JSON.stringify({ formula: 'Salary*0.1', dummyVars: { Salary: 30000 } })
  });
  const test1 = await test1Res.json();
  console.log(`✅ Test HOUSING Formula (Salary*0.1 with Salary=30000): valid=${test1.valid}, result=${test1.result}`);

  const createRes = await fetch('http://localhost:3000/api/payroll-components', {
    method: 'POST', headers,
    body: JSON.stringify({
      code: 'HOUSING', name: 'ค่าที่พัก', type: 'earning', calcMethod: 'formula',
      formula: 'Salary*0.1', functionName: '', isTaxable: true, isSSOBase: false, sortOrder: 2.5, isActive: true
    })
  });
  const housingComp = await createRes.json();
  console.log(`✅ Created Component: ${housingComp.code} (ID: ${housingComp.id})`);

  console.log('\n--- 3. Edit BONUS Component ---');
  const bonus = components.find((c: any) => c.code === 'BONUS');
  const test2Res = await fetch('http://localhost:3000/api/payroll-components/test', {
    method: 'POST', headers,
    body: JSON.stringify({ formula: 'Salary * 0.5', dummyVars: { Salary: 30000 } })
  });
  const test2 = await test2Res.json();
  console.log(`✅ Test Edit BONUS (Salary * 0.5 with Salary=30000): valid=${test2.valid}, result=${test2.result}`);
  
  const editRes = await fetch(`http://localhost:3000/api/payroll-components/${bonus.id}`, {
    method: 'PUT', headers,
    body: JSON.stringify({ ...bonus, formula: 'Salary * 0.5' })
  });
  const editedBonus = await editRes.json();
  console.log(`✅ Edited BONUS Formula: ${editedBonus.formula}`);

  console.log('\n--- 4. Delete HOUSING Component ---');
  const delRes = await fetch(`http://localhost:3000/api/payroll-components/${housingComp.id}`, {
    method: 'DELETE', headers
  });
  console.log(`✅ Deleted HOUSING Component (Status: ${delRes.status})`);

  console.log('\n--- 5. Test Invalid Syntax ---');
  const test3Res = await fetch('http://localhost:3000/api/payroll-components/test', {
    method: 'POST', headers,
    body: JSON.stringify({ formula: 'Salary ***', dummyVars: { Salary: 30000 } })
  });
  const test3 = await test3Res.json();
  console.log(`❌ Test Invalid Formula (Salary ***): valid=${test3.valid}, error="${test3.error}"`);

  console.log('\n--- 6. Verify Soft Delete in DB ---');
  const dbHousing = await prisma.payrollComponent.findUnique({ where: { code: 'HOUSING' } });
  console.log(`SELECT code, "isActive" FROM "PayrollComponent" WHERE code='HOUSING';`);
  console.log(`Result: code=${dbHousing?.code}, isActive=${dbHousing?.isActive}`);
}

main().catch(console.error);
