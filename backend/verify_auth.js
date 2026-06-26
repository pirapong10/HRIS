const { PrismaClient } = require('@prisma/client');


const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000/api';

async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`);
  const data = await res.json();
  return data.token;
}

async function testD1(adminToken, empToken) {
  console.log("\n--- Testing D1 (GET /employees/:id ownership) ---");
  
  // 1. Find the admin's employee ID (if any) or any other employee ID
  const otherEmp = await prisma.employee.findFirst({ where: { user: { email: 'admin@company.com' } } });
  const otherEmpId = otherEmp ? otherEmp.id : 1; 

  const empRes = await fetch(`${API_URL}/employees/${otherEmpId}`, {
    headers: { 'Authorization': `Bearer ${empToken}` }
  });
  
  if (empRes.status === 403) {
    console.log("✅ D1 Passed: EMPLOYEE correctly blocked from viewing other's record.");
  } else {
    console.log(`❌ D1 Failed: Expected 403, got ${empRes.status}`);
  }
}

async function testB4(empToken) {
  console.log("\n--- Testing B4 (ShiftSwap requirePermission) ---");
  
  // employee role by default shouldn't have shift:approve
  // so testing PUT /shifts/swaps/:id should return 403
  const res = await fetch(`${API_URL}/shifts/swaps/999`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${empToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'approved' })
  });
  
  if (res.status === 403) {
    console.log("✅ B4 Passed: EMPLOYEE correctly blocked from approving shift swaps.");
  } else {
    console.log(`❌ B4 Failed: Expected 403, got ${res.status}`);
  }
}

async function testB3(adminToken) {
  console.log("\n--- Testing B3 (OT Routes presence) ---");
  const res = await fetch(`${API_URL}/ot`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  if (res.status === 200) {
    console.log("✅ B3 Passed: OT routes are accessible.");
  } else {
    console.log(`❌ B3 Failed: Expected 200, got ${res.status}`);
  }
}

async function main() {
  try {
    const adminToken = await login('admin@company.com', 'admin123');
    const empToken = await login('emp@company.com', 'emp123');
    
    await testD1(adminToken, empToken);
    await testB4(empToken);
    await testB3(adminToken);
    
  } catch (error) {
    console.error("Test execution failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
