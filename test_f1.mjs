import fs from 'fs';

async function main() {
  // Login to get token
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@company.com", password: "admin123" })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  if (!token) {
    console.log("Failed to login", loginData);
    return;
  }

  // Create Employee
  const createRes = await fetch("http://localhost:3000/api/employees", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      name: "Test Employee",
      deptId: 29,
      posId: 36,
      shiftId: 10,
      salary: 25000,
      type: "fulltime",
      hireDate: "2026-01-01"
    })
  });
  
  const createdData = await createRes.json();
  const match = JSON.stringify(createdData).match(/"empCode":"[^"]*"/);
  console.log(match ? match[0] : JSON.stringify(createdData));
}

main().catch(console.error);
