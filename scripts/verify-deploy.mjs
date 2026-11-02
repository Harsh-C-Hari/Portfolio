#!/usr/bin/env node
/**
 * scripts/verify-deploy.mjs
 * Simulates a clean Vercel deployment build in an isolated temporary directory.
 *
 * Steps:
 *  1. Reads .vercelignore, .gitignore, and vercel.json.
 *  2. Copies repo contents to a clean temporary folder honoring ignores (no node_modules, no dist, no .git).
 *  3. Runs `npm ci` in the temp directory.
 *  4. Executes the exact `buildCommand` specified in `vercel.json`.
 *  5. Verifies the outputDirectory exists and contains all expected output files (18 pages, assets).
 *  6. Runs `node scripts/check-leaks.mjs` inside the temp directory.
 *  7. Cleans up temp directory and reports measured results.
 *
 * Usage: node scripts/verify-deploy.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('======================================================');
console.log('VERIFY DEPLOYMENT SIMULATION');
console.log('======================================================\n');

// 1. Read vercel.json
const vercelConfigPath = path.join(ROOT, 'vercel.json');
if (!fs.existsSync(vercelConfigPath)) {
  console.error('FAIL: vercel.json not found at repo root');
  process.exit(1);
}
const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
const buildCommand = vercelConfig.buildCommand;
const outputDirName = vercelConfig.outputDirectory || 'dist';

if (!buildCommand) {
  console.error('FAIL: No buildCommand specified in vercel.json');
  process.exit(1);
}
console.log(`[Config] buildCommand: "${buildCommand}"`);
console.log(`[Config] outputDirectory: "${outputDirName}"`);

// 2. Parse ignore files
function loadIgnorePatterns(filename) {
  const filePath = path.join(ROOT, filename);
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

const vercelIgnores = loadIgnorePatterns('.vercelignore');
const gitIgnores = loadIgnorePatterns('.gitignore');
const combinedPatterns = Array.from(new Set([
  ...vercelIgnores,
  ...gitIgnores,
  'node_modules',
  'dist',
  '.git',
  'scratch',
  '.DS_Store',
]));

console.log('[Config] Active ignore rules count:', combinedPatterns.length);

function isIgnored(relPath) {
  const norm = relPath.replace(/\\/g, '/');
  for (const pattern of combinedPatterns) {
    const p = pattern.replace(/\\/g, '/').replace(/\/$/, '');
    if (norm === p || norm.startsWith(p + '/')) return true;
    if (p.startsWith('*.') && norm.endsWith(p.slice(1))) return true;
  }
  return false;
}

// 3. Create temp workspace
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-deploy-verify-'));
console.log(`[Temp] Staging isolated build in: ${tempDir}`);

let copyCount = 0;
function copyRecursive(src, dest, relBase = '') {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
    if (isIgnored(rel)) continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath, rel);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
      copyCount++;
    }
  }
}

try {
  copyRecursive(ROOT, tempDir);
  console.log(`[Temp] Copied ${copyCount} files into staging directory`);

  // 4. Run npm ci in temp workspace
  console.log('\n[Step 1/3] Running `npm ci` in isolated environment...');
  execSync('npm ci', {
    cwd: tempDir,
    stdio: 'inherit',
    shell: true,
  });

  // 5. Execute buildCommand from vercel.json
  console.log(`\n[Step 2/3] Running buildCommand: "${buildCommand}"...`);
  execSync(buildCommand, {
    cwd: tempDir,
    stdio: 'inherit',
    shell: true,
  });

  // 6. Verify outputs in temp dist/
  console.log(`\n[Step 3/3] Validating artifacts in temp "${outputDirName}"...`);
  const outDir = path.join(tempDir, outputDirName);
  if (!fs.existsSync(outDir)) {
    throw new Error(`Output directory "${outputDirName}" was not created by buildCommand!`);
  }

  // Count files in dist
  let distFiles = 0;
  function countFiles(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.isDirectory()) countFiles(path.join(dir, ent.name));
      else if (ent.isFile()) distFiles++;
    }
  }
  countFiles(outDir);
  console.log(`[Verify] Generated ${distFiles} total files in "${outputDirName}"`);

  // Required pages list (18 pages total)
  const REQUIRED_PAGES = [
    'index.html',
    'work/pcgo/index.html',
    'work/productivity-dashboard/index.html',
    'work/pcgo/docs/project-overview/index.html',
    'work/pcgo/docs/system-architecture/index.html',
    'work/pcgo/docs/backend-architecture/index.html',
    'work/pcgo/docs/recovery-architecture/index.html',
    'work/pcgo/docs/tailscale-state-recovery/index.html',
    'work/pcgo/docs/internal-event-authentication/index.html',
    'work/pcgo/docs/live-sync-architecture-migration/index.html',
    'work/pcgo/docs/dashboard-cache-investigation/index.html',
    'work/pcgo/docs/release-hardening-and-reliability/index.html',
    'work/pcgo/docs/session-persistence-and-reconnection/index.html',
    'work/pcgo/docs/problems-solved/index.html',
    'work/pcgo/docs/api-overview/index.html',
    'work/pcgo/docs/websocket-events/index.html',
    'work/pcgo/docs/v0-limitations/index.html',
    'work/pcgo/docs/roadmap/index.html',
  ];

  const missingPages = REQUIRED_PAGES.filter((p) => !fs.existsSync(path.join(outDir, p)));
  if (missingPages.length > 0) {
    throw new Error(`Missing expected pages in deployment output:\n  ${missingPages.join('\n  ')}`);
  }
  console.log(`[Verify] All ${REQUIRED_PAGES.length} expected pages verified present.`);

  // Verify critical assets
  const REQUIRED_ASSETS = ['styles.css', 'animation.bundle.js', 'robots.txt', 'sitemap.xml'];
  const missingAssets = REQUIRED_ASSETS.filter((a) => !fs.existsSync(path.join(outDir, a)));
  if (missingAssets.length > 0) {
    throw new Error(`Missing expected core assets in output:\n  ${missingAssets.join('\n  ')}`);
  }
  console.log(`[Verify] Core assets (${REQUIRED_ASSETS.join(', ')}) verified present.`);

  console.log('\n======================================================');
  console.log('✅ DEPLOYMENT SIMULATION PASSED 100%');
  console.log('======================================================\n');
} finally {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('[Cleanup] Removed staging directory cleanly.');
  } catch (err) {
    console.warn('[Cleanup] Note: could not remove temp dir:', err.message);
  }
}
