const fs = require('fs');

function runGrepA(file, regex, A) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let output = [];
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      for (let j = 0; j <= A && i + j < lines.length; j++) {
        output.push(lines[i + j]);
      }
      break;
    }
  }
  console.log(output.join('\n'));
}

function runGrepN(file, regex, head) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      console.log(`${i + 1}:${lines[i]}`);
      count++;
      if (count >= head) break;
    }
  }
}

console.log('--- 1 ---');
runGrepA('backend/prisma/schema.prisma', /model Attendance /, 20);
console.log('--- 2 ---');
runGrepA('backend/prisma/schema.prisma', /model Shift /, 10);
console.log('--- 3 ---');
runGrepN('backend/src/controllers/attendance.controller.ts', /clockIn|clockOut|lateMinutes|LateMinutes/, 20);
console.log('--- 4 ---');
runGrepA('backend/prisma/schema.prisma', /model PayrollRunDetail /, 10);
console.log('--- 5 ---');
runGrepN('backend/prisma/schema.prisma', /currency|Currency|exchangeRate/, 10);
console.log('--- 7 ---');
runGrepN('hris/src/App.jsx', /ErrorBoundary|error.*boundary/i, 10);
