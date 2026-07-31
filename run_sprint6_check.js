const fs = require('fs');

function runGrepA(file, regexStr, linesAfter) {
    if (!fs.existsSync(file)) return "File not found: " + file;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    const regex = new RegExp(regexStr);
    let out = [];
    for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
            for (let j = 0; j <= linesAfter && i + j < lines.length; j++) {
                out.push(lines[i+j]);
            }
            break;
        }
    }
    return out.join('\n');
}

function runGrepN(file, regexStr, headLines) {
    if (!fs.existsSync(file)) return "File not found: " + file;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    const regex = new RegExp(regexStr);
    let out = [];
    for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
            out.push(`${i+1}:${lines[i]}`);
            if (headLines && out.length >= headLines) break;
        }
    }
    return out.join('\n');
}

function runCat(file) {
    if (!fs.existsSync(file)) return "cat: " + file + ": No such file or directory";
    return fs.readFileSync(file, 'utf8');
}

console.log('--- 1. grep -A 15 "model Leave " backend/prisma/schema.prisma ---');
console.log(runGrepA('d:/Project/HRIS/backend/prisma/schema.prisma', 'model Leave ', 15));

console.log('\n--- 2. grep -n "leaveBalance\\|LeaveBalance\\|leaveQuota\\|annualLeave" backend/prisma/schema.prisma ---');
console.log(runGrepN('d:/Project/HRIS/backend/prisma/schema.prisma', 'leaveBalance|LeaveBalance|leaveQuota|annualLeave'));

console.log('\n--- 3. grep -n "Holiday\\|holiday\\|publicHoliday" backend/prisma/schema.prisma ---');
console.log(runGrepN('d:/Project/HRIS/backend/prisma/schema.prisma', 'Holiday|holiday|publicHoliday'));

console.log('\n--- 4. cat backend/src/controllers/dashboard.controller.ts ---');
console.log(runCat('d:/Project/HRIS/backend/src/controllers/dashboard.controller.ts'));

console.log('\n--- 5. grep -n "geofence\\|haversine\\|distance\\|OFFICE_LAT\\|allowedRadius" backend/src/controllers/attendance.controller.ts | head -15 ---');
console.log(runGrepN('d:/Project/HRIS/backend/src/controllers/attendance.controller.ts', 'geofence|haversine|distance|OFFICE_LAT|allowedRadius', 15));

console.log('\n--- 6. grep -n "dashboard\\|Dashboard" hris/src/pages/Dashboard.jsx | head -20 ---');
console.log(runGrepN('d:/Project/HRIS/hris/src/pages/Dashboard.jsx', 'dashboard|Dashboard', 20));
