const { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = resolve(__dirname, '..');
const distDir = join(rootDir, 'dist');
const releaseDir = join(rootDir, 'release');
const bundleDir = join(releaseDir, 'offline-bundle');
const zipPath = join(releaseDir, 'react-gui-tool-offline-windows.zip');

if (!existsSync(join(distDir, 'index.html'))) {
  console.error('dist/index.html not found. Run "pnpm build" first.');
  process.exit(1);
}
rmSync(bundleDir, { recursive: true, force: true });
mkdirSync(join(bundleDir, 'scripts'), { recursive: true });
cpSync(distDir, join(bundleDir, 'dist'), { recursive: true });
copyFileSync(join(rootDir, 'start-server.bat'), join(bundleDir, 'start-server.bat'));
copyFileSync(join(rootDir, 'scripts', 'serve-dist.ps1'), join(bundleDir, 'scripts', 'serve-dist.ps1'));
writeFileSync(join(bundleDir, 'README-OFFLINE.txt'), [
  'React GUI Tool - Windows offline version', '',
  '1. Extract all files from this ZIP.',
  '2. Double-click start-server.bat.',
  '3. Open the shown http://127.0.0.1:port/ URL in Chrome or Edge.',
  '4. Press Ctrl+C in the command window to stop.', '',
  'No Node.js, npm, pnpm, Python, or Internet connection is needed to run.',
  'The Windows PowerShell server listens on 127.0.0.1 only.',
  'A serial device, suitable driver, and browser port permission are still needed.',
].join('\r\n') + '\r\n', 'utf8');

rmSync(zipPath, { force: true });
let command, args, cwd;
if (process.platform === 'win32') {
  command = 'powershell.exe';
  args = [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
    join(rootDir, 'scripts', 'zip-offline.ps1'), bundleDir, zipPath,
  ];
  cwd = rootDir;
} else {
  command = 'zip';
  args = ['-q', '-r', zipPath, '.'];
  cwd = bundleDir;
}
const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
if (result.error || result.status !== 0 || !existsSync(zipPath)) {
  console.error('Failed to create offline ZIP.', result.error ?? result.status);
  process.exit(1);
}
console.log('Offline bundle directory: ' + bundleDir);
console.log('Offline ZIP: ' + zipPath);
