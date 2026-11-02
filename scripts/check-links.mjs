/**
 * scripts/check-links.mjs
 * Scans every generated HTML page in /work/** and index.html,
 * checks all internal href/src attributes:
 *   - internal links (no scheme) must resolve to a real file in the output tree
 *   - internal assets (.css, .js, .webp, .jpg, .ico, .png, .pdf) must exist on disk
 *
 * Usage: node scripts/check-links.mjs
 * Exits with code 1 if any broken links are found.
 */

import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const DIST      = path.join(ROOT, 'dist');

// Collect all generated HTML files
function collectHTML(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectHTML(full, results);
    else if (entry.name.endsWith('.html')) results.push(full);
  }
  return results;
}

// Resolve a root-absolute href from the site root
function resolveHref(href) {
  // Strip query string and hash
  const clean = href.split('?')[0].split('#')[0];
  if (!clean || clean === '/') return path.join(DIST, 'index.html');

  const diskPath = path.join(DIST, clean.replace(/\//g, path.sep));

  // First try as a file
  if (fs.existsSync(diskPath)) return diskPath;

  // Try as a clean URL: /work/pcgo -> work/pcgo/index.html
  const indexPath = path.join(diskPath, 'index.html');
  if (fs.existsSync(indexPath)) return indexPath;

  return null;
}

// Extract all href and src values from an HTML string
function extractRefs(html) {
  const refs = [];
  const reHref = /href="([^"]+)"/g;
  const reSrc  = /src="([^"]+)"/g;
  let m;
  while ((m = reHref.exec(html)) !== null) refs.push(m[1]);
  while ((m = reSrc.exec(html))  !== null) refs.push(m[1]);
  return refs;
}

function isInternal(href) {
  if (href.startsWith('http://') || href.startsWith('https://')) return false;
  if (href.startsWith('mailto:') || href.startsWith('tel:'))     return false;
  if (href.startsWith('//'))                                       return false;
  if (href.startsWith('#'))                                        return false; // anchor-only
  return true;
}

const pages   = [
  path.join(DIST, 'index.html'),
  ...collectHTML(path.join(DIST, 'work')),
];

const broken  = [];
const skipped = [];

for (const htmlFile of pages) {
  const html = fs.readFileSync(htmlFile, 'utf8');
  const refs = extractRefs(html);
  const rel  = path.relative(ROOT, htmlFile).replace(/\\/g, '/');

  for (const href of refs) {
    if (!isInternal(href)) continue;
    const resolved = resolveHref(href);
    if (!resolved) {
      broken.push({ page: rel, href });
    }
  }
}

if (broken.length === 0) {
  console.log(`✓ check-links: 0 broken internal links across ${pages.length} pages.`);
  process.exit(0);
} else {
  console.error(`✗ check-links: ${broken.length} broken internal link(s):\n`);
  for (const { page, href } of broken) {
    console.error(`  [${page}]  →  ${href}`);
  }
  process.exit(1);
}
