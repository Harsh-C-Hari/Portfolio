#!/usr/bin/env node
/**
 * scripts/check-leaks.mjs
 * Security gate: scans dist/ to ensure zero sensitive data, internal AI instructions,
 * source markdown, or privacy leaks are published.
 *
 * Fails if dist/ contains any:
 *   - .privacy-denylist entries (from root .privacy-denylist if present)
 *   - "C:/Users" or "C:\Users"
 *   - ".gemini"
 *   - "antigravity"
 *   - "_handoff"
 *   - "Do NOT mention"
 *   - "Harsh will"
 *   - "TODO"
 *   - "FIXME"
 *   - "CONFIRM_WITH"
 *   - "<!--" (any unstripped HTML comments)
 *   - Any email address other than harshchari808@gmail.com
 *   - Any UUID pattern
 *   - Any non-loopback IPv4 address
 *   - Disallowed file types (.md, .mjs, .py, .json, etc.)
 *
 * Usage: node scripts/check-leaks.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const ALLOWED_EMAILS = new Set([
  'harshchari808@gmail.com',
  'jack@greensock.com', // GreenSock library copyright header in bundled animation bundle
]);

// Whitelisted file extensions permitted in dist/
const ALLOWED_EXTENSIONS = new Set([
  '.html',
  '.css',
  '.js',
  '.webp',
  '.jpg',
  '.jpeg',
  '.png',
  '.ico',
  '.svg',
  '.pdf',
  '.txt',
  '.xml',
  '.webmanifest',
  '.woff2',
]);

// Explicit forbidden string patterns in text files
const FORBIDDEN_STRINGS = [
  'C:/Users',
  'C:\\Users',
  '.gemini',
  'antigravity',
  '_handoff',
  'Do NOT mention',
  'Harsh will',
  'TODO',
  'FIXME',
  'CONFIRM_WITH',
  '<!--',
];

const UUID_REGEX = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g;
const EMAIL_REGEX = /\b[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\b/g;
const IPV4_REGEX = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;

function isLoopbackIP(ip) {
  return ip === '127.0.0.1' || ip === '0.0.0.0';
}

function loadDenylist() {
  const denylistPath = path.join(ROOT, '.privacy-denylist');
  if (!fs.existsSync(denylistPath)) return [];
  const content = fs.readFileSync(denylistPath, 'utf8');
  return content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));
}

function collectFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

export function checkLeaks() {
  if (!fs.existsSync(DIST)) {
    console.error(`✗ check-leaks: dist/ directory not found. Run 'npm run build' first.`);
    process.exit(1);
  }

  const files = collectFiles(DIST);
  if (files.length === 0) {
    console.error(`✗ check-leaks: dist/ is empty.`);
    process.exit(1);
  }

  const denylist = loadDenylist();
  const violations = [];

  for (const filePath of files) {
    const relPath = path.relative(DIST, filePath).replace(/\\/g, '/');
    const ext = path.extname(filePath).toLowerCase();

    // 1. File extension validation
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      violations.push({
        file: relPath,
        reason: `Disallowed file type (${ext}). Only static public web formats are permitted in dist/.`,
      });
      continue;
    }

    // Only inspect text files for secret and comment patterns
    if (['.html', '.css', '.js', '.txt', '.xml'].includes(ext)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split(/\r?\n/);

      // Check forbidden strings
      for (const str of FORBIDDEN_STRINGS) {
        if (content.includes(str)) {
          const lineNum = lines.findIndex(l => l.includes(str)) + 1;
          violations.push({
            file: relPath,
            line: lineNum,
            reason: `Found forbidden token: "${str}"`,
          });
        }
      }

      // Check custom denylist entries
      for (const entry of denylist) {
        if (content.includes(entry)) {
          const lineNum = lines.findIndex(l => l.includes(entry)) + 1;
          violations.push({
            file: relPath,
            line: lineNum,
            reason: `Matched .privacy-denylist entry: "${entry}"`,
          });
        }
      }

      // Check UUIDs
      let uuidMatch;
      UUID_REGEX.lastIndex = 0;
      while ((uuidMatch = UUID_REGEX.exec(content)) !== null) {
        violations.push({
          file: relPath,
          reason: `Found UUID: "${uuidMatch[0]}"`,
        });
      }

      // Check Email addresses (only ALLOWED_EMAILS permitted)
      let emailMatch;
      EMAIL_REGEX.lastIndex = 0;
      while ((emailMatch = EMAIL_REGEX.exec(content)) !== null) {
        const email = emailMatch[0].toLowerCase();
        if (!ALLOWED_EMAILS.has(email)) {
          violations.push({
            file: relPath,
            reason: `Found non-whitelisted email: "${email}"`,
          });
        }
      }

      // Check IPv4 addresses (excluding loopback)
      let ipMatch;
      IPV4_REGEX.lastIndex = 0;
      while ((ipMatch = IPV4_REGEX.exec(content)) !== null) {
        const ip = ipMatch[0];
        if (!isLoopbackIP(ip)) {
          violations.push({
            file: relPath,
            reason: `Found non-loopback IPv4 address: "${ip}"`,
          });
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error(`\n✗ check-leaks: FAILED with ${violations.length} leak violation(s) in dist/:\n`);
    for (const v of violations) {
      console.error(`  [${v.file}${v.line ? `:${v.line}` : ''}] ${v.reason}`);
    }
    console.error('');
    process.exit(1);
  }

  console.log(`✓ check-leaks: dist/ passed all leak and denylist checks cleanly (${files.length} files scanned).`);
  process.exit(0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  checkLeaks();
}
