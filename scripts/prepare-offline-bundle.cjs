const { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const rootDir = process.cwd();
const releaseDir = join(rootDir, 'release');
const exePath = join(releaseDir, 'react-gui-tool-server.exe');
const distPath = join(rootDir, 'dist');
const bundleDir = join(releaseDir, 'offline-bundle');
const bundleDistDir = join(bundleDir, 'dist');
const bundleExePath = join(bundleDir, 'react-gui-tool-server.exe');
const launcherPath = join(bundleDir, 'start-server.bat');

if (!existsSync(exePath)) {
  console.error(`EXE not found: ${exePath}`);
  console.error('Run "npm run build:exe" first.');
  process.exit(1);
}

if (!existsSync(distPath)) {
  console.error(`dist not found: ${distPath}`);
  console.error('Run "npm run build" first.');
  process.exit(1);
}

rmSync(bundleDir, { recursive: true, force: true });
mkdirSync(bundleDir, { recursive: true });

copyFileSync(exePath, bundleExePath);
cpSync(distPath, bundleDistDir, { recursive: true });

writeFileSync(
  launcherPath,
  '@echo off\r\n' +
    'cd /d "%~dp0"\r\n' +
    'react-gui-tool-server.exe\r\n',
);

console.log(`Offline bundle created: ${bundleDir}`);
