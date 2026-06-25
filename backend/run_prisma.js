const { execSync } = require('child_process');
try {
  console.log('Running prisma db push...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  console.log('Running prisma generate...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('Done!');
} catch(e) {
  console.error(e.message);
}
