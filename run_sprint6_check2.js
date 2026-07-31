const fs = require('fs');
const path = require('path');

// 1.
const schemaLines = fs.readFileSync('d:/Project/HRIS/backend/prisma/schema.prisma', 'utf8').split(/\r?\n/);
console.log('--- 1. grep -B 5 -A 5 "isHoliday" backend/prisma/schema.prisma ---');
for (let i = 0; i < schemaLines.length; i++) {
    if (schemaLines[i].includes('isHoliday')) {
        let start = Math.max(0, i - 5);
        let end = Math.min(schemaLines.length - 1, i + 5);
        for (let j = start; j <= end; j++) {
            console.log(schemaLines[j]);
        }
        break;
    }
}

// 2.
console.log('\n--- 2. grep -n "haversine\\|Haversine\\|geoCheck\\|getDistance\\|distance" backend/src/controllers/attendance.controller.ts | head -20 ---');
const attLines = fs.readFileSync('d:/Project/HRIS/backend/src/controllers/attendance.controller.ts', 'utf8').split(/\r?\n/);
let count2 = 0;
for (let i = 0; i < attLines.length; i++) {
    if (attLines[i].match(/haversine|Haversine|geoCheck|getDistance|distance/)) {
        console.log(`${i+1}:${attLines[i]}`);
        count2++;
        if (count2 >= 20) break;
    }
}

// 3.
console.log('\n--- 3. grep -n "getDistance\\|haversine\\|distance" backend/src/utils/*.ts 2>/dev/null || echo "not found in utils" ---');
const utilsDir = 'd:/Project/HRIS/backend/src/utils';
const files = fs.readdirSync(utilsDir).filter(f => f.endsWith('.ts'));
let foundAny = false;
for (const file of files) {
    const lines = fs.readFileSync(path.join(utilsDir, file), 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/getDistance|haversine|distance/)) {
            console.log(`backend/src/utils/${file}:${i+1}:${lines[i]}`);
            foundAny = true;
        }
    }
}
if (!foundAny) console.log("not found in utils");

// 4.
console.log('\n--- 4. cat hris/src/pages/Dashboard.jsx | head -100 ---');
const dashLines = fs.readFileSync('d:/Project/HRIS/hris/src/pages/Dashboard.jsx', 'utf8').split(/\r?\n/);
for (let i = 0; i < 100 && i < dashLines.length; i++) {
    console.log(dashLines[i]);
}
