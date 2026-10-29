import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const PAGES = [
  { name: 'Home (/)', url: 'http://localhost:3000/' },
  { name: 'PCGO (/work/pcgo/)', url: 'http://localhost:3000/work/pcgo/' },
  { name: 'Dashboard (/work/productivity-dashboard/)', url: 'http://localhost:3000/work/productivity-dashboard/' },
  { name: 'Doc (/work/pcgo/docs/system-architecture/)', url: 'http://localhost:3000/work/pcgo/docs/system-architecture/' },
];

const results = [];
const tmpFile = path.resolve('./temp-lh-audit.json');

console.log('======================================================');
console.log('LIGHTHOUSE MOBILE AUDIT (4 Pages)');
console.log('======================================================\n');

for (const p of PAGES) {
  process.stdout.write(`Auditing ${p.name}... `);
  try {
    // Run lighthouse via npx
    execFileSync('cmd.exe', [
      '/c',
      'npx',
      'lighthouse',
      p.url,
      '--output=json',
      `--output-path=${tmpFile}`,
      '--chrome-flags="--headless"',
      '--only-categories=performance,accessibility,best-practices,seo',
      '--form-factor=mobile',
      '--quiet'
    ], { stdio: 'pipe' });

    const raw = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
    const scores = {
      Page: p.name,
      Performance: Math.round((raw.categories.performance?.score || 0) * 100),
      Accessibility: Math.round((raw.categories.accessibility?.score || 0) * 100),
      'Best Practices': Math.round((raw.categories['best-practices']?.score || 0) * 100),
      SEO: Math.round((raw.categories.seo?.score || 0) * 100),
    };
    results.push(scores);
    console.log(`Done! (P: ${scores.Performance}, A: ${scores.Accessibility}, BP: ${scores['Best Practices']}, SEO: ${scores.SEO})`);
  } catch (err) {
    console.error(`Failed: ${err.message}`);
    results.push({
      Page: p.name,
      Performance: 'ERR',
      Accessibility: 'ERR',
      'Best Practices': 'ERR',
      SEO: 'ERR',
    });
  }
}

if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
if (fs.existsSync('./scratch-lh.json')) fs.unlinkSync('./scratch-lh.json');

console.log('\n┌──────────────────────────────────────────────┬─────────────┬───────────────┬────────────────┬─────┐');
console.table(results);
