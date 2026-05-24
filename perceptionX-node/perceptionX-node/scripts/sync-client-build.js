const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const sourceDir = path.join(projectRoot, 'client', 'dist');
const targetDir = path.join(projectRoot, 'public', 'react-build');

if (!fs.existsSync(sourceDir)) {
  console.error(`Client build output not found at ${sourceDir}`);
  process.exit(1);
}

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });
fs.cpSync(sourceDir, targetDir, { recursive: true });

console.log(`Copied client build from ${sourceDir} to ${targetDir}`);