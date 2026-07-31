const { execSync } = require('child_process');
const fs = require('fs');

function run(cmd, cwd) {
    try {
        return execSync(cmd, { cwd: cwd, stdio: 'pipe' }).toString().trim();
    } catch (e) {
        return (e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '');
    }
}

console.log('--- 1. npx prisma migrate status ---');
console.log(run('npx prisma migrate status', 'd:/Project/HRIS/backend'));

console.log('\n--- 2. git log --oneline -6 (backend repo) ---');
console.log(run('git log --oneline -6', 'd:/Project/HRIS/backend'));

console.log('\n--- 3. git log --oneline -4 (hris/ repo) ---');
console.log(run('git log --oneline -4', 'd:/Project/HRIS/hris'));

console.log('\n--- 4. Confirm SystemConfig model exists ---');
const schema = fs.readFileSync('d:/Project/HRIS/backend/prisma/schema.prisma', 'utf8').split(/\r?\n/);
let foundSys = false;
for (let i = 0; i < schema.length; i++) {
    if (schema[i].includes('model SystemConfig')) {
        for (let j = 0; j <= 10 && i + j < schema.length; j++) console.log(schema[i+j]);
        foundSys = true;
        break;
    }
}
if(!foundSys) console.log("Not found");

console.log('\n--- 5. Show clockIn format from real DB ---');
const dbScript = `const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); p.attendance.findFirst({where:{clockIn:{not:null}},select:{clockIn:true,date:true}}).then(r=>console.log(r)).catch(console.error).finally(()=>process.exit(0))`;
console.log(run(`node -e "${dbScript}"`, 'd:/Project/HRIS/backend'));

console.log('\n--- 6. Confirm new fields exist in schema ---');
for (let i = 0; i < schema.length; i++) {
    if (schema[i].match(/lateMinutes|grossLocal|netLocal|exchangeRate/)) {
        console.log(`${i+1}:${schema[i]}`);
    }
}

console.log('\n--- 7. Show the actual LateMinutes calculation block in clockIn ---');
const att = fs.readFileSync('d:/Project/HRIS/backend/src/controllers/attendance.controller.ts', 'utf8').split(/\r?\n/);
for (let i = 0; i < att.length; i++) {
    if (att[i].match(/lateMinutes|gracePeriod|lateThreshold/)) {
        let count = 0;
        for (let j = 0; j <= 20 && i + j < att.length; j++) {
            console.log(att[i+j]);
            count++;
            if (count >= 30) break;
        }
        break;
    }
}

console.log('\n--- 8. npx tsc --noEmit (backend) ---');
console.log(run('npx tsc --noEmit', 'd:/Project/HRIS/backend') || 'Expected: exit 0 (No output means success)');
