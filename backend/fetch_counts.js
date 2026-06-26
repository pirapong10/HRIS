

async function getCount(email, password) {
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  const empRes = await fetch("http://localhost:3000/api/employees", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const empData = await empRes.json();
  console.log(`${email} sees ${empData.data ? empData.data.length : empData.length} employees`);
}

async function main() {
  await getCount('admin@company.com', 'password123');
  await getCount('hr@company.com', 'password123');
  await getCount('emp@company.com', 'password123');
}

main().catch(console.error);
