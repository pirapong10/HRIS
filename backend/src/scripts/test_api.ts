async function testAPI() {
  try {
    // 1. Login
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@company.com', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Got token:', token.substring(0, 10) + '...');

    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // 2. Valid formula
    console.log('\n--- Valid Formula Test ---');
    const validRes = await fetch('http://localhost:3000/api/payroll-components/test', {
      method: 'POST',
      headers,
      body: JSON.stringify({ formula: "MIN(Salary*0.05, 750)", dummyVars: { Salary: 30000 } })
    });
    console.log(await validRes.json());

    // 3. Invalid formula
    console.log('\n--- Invalid Formula Test ---');
    const invalidRes = await fetch('http://localhost:3000/api/payroll-components/test', {
      method: 'POST',
      headers,
      body: JSON.stringify({ formula: "Salary***0.05", dummyVars: { Salary: 30000 } })
    });
    console.log(await invalidRes.json());
  } catch (err: any) {
    console.error('Test failed:', err.message);
  }
}

testAPI();
