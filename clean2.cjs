const fs = require('fs');
const lines = fs.readFileSync('hris/src/App.jsx', 'utf8').split('\n');

function getComp(prefix) {
  const start = lines.findIndex(l => l.startsWith(prefix));
  if (start === -1) return null;
  let open = 0, started = false;
  for (let i = start; i < lines.length; i++) {
    for (let c of lines[i]) {
      if (c === '{') open++;
      if (c === '}') open--;
    }
    if (!started && open > 0) started = true;
    if (started && open === 0) return [start, i];
  }
  return null;
}

const ranges = [
  getComp('const LoginPage ='),
  getComp('const NotificationCenter =')
].filter(x => x);

// Additional things to remove:
// from `// DESIGN TOKENS` down to `// HELPERS` inclusive
// basically lines 14 to 450
const startToRemove = lines.findIndex(l => l.includes('DESIGN TOKENS')) - 1;
const endToRemove = lines.findIndex(l => l.includes('function generatePayslipHTML')) - 2;

let newLines = [];
for (let i = 0; i < lines.length; i++) {
  let skip = false;
  if (i >= startToRemove && i <= endToRemove) skip = true;
  
  for (let r of ranges) {
    if (i >= r[0] && i <= r[1]) {
      skip = true;
      break;
    }
  }
  
  // also skip PDF PAYSLIP GENERATOR
  if (lines[i].includes('PDF PAYSLIP GENERATOR')) {
    let pdfEnd = lines.findIndex((l, idx) => idx > i && l.includes('export function previewPayslip'));
    // we just want to remove the whole generatePayslipHTML, downloadPayslip, previewPayslip functions
  }

  if (!skip) newLines.push(lines[i]);
}

let code = newLines.join('\n');
fs.writeFileSync('hris/src/App.jsx.cleaned', code);
console.log('Done');
