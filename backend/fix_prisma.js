const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const prismaDir = path.join(__dirname, 'node_modules', '.prisma');
const clientDir = path.join(__dirname, 'node_modules', '@prisma', 'client');

try {
  console.log('Attempting to delete locked directories...');
  if (fs.existsSync(prismaDir)) {
    fs.rmSync(prismaDir, { recursive: true, force: true });
    console.log('Deleted .prisma');
  }
  if (fs.existsSync(clientDir)) {
    fs.rmSync(clientDir, { recursive: true, force: true });
    console.log('Deleted @prisma/client');
  }
  
  console.log('Re-running prisma generate...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('SUCCESS!');
} catch (e) {
  console.error('Error:', e.message);
}
