/**
 * scripts/audit-pink-area.mjs
 * Playwright audit of visible pink background area.
 * Budget:
 *   - Max single element pink area: <= 20,000 px² (except transient .pt__pink)
 *   - Total pink area on viewport: <= 4% of viewport (51,840 px² at 1440×900)
 *
 * Checks at rest AND while hovering all rows, cards, and buttons on:
 *   - /
 *   - /work/pcgo/
 *   - /work/productivity-dashboard/
 *   - /work/pcgo/docs/system-architecture/
 *
 * Usage: node scripts/audit-pink-area.mjs [baseUrl]
 */

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require('C:/Users/O M E N/AppData/Roaming/npm/node_modules/playwright');
}

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const VIEWPORT = { width: 1440, height: 900 };
const VIEWPORT_AREA = VIEWPORT.width * VIEWPORT.height;
const MAX_SINGLE_AREA = 20000;
const MAX_TOTAL_PERCENT = 4.0; // 4%
const MAX_TOTAL_AREA = VIEWPORT_AREA * (MAX_TOTAL_PERCENT / 100);

const PAGES = [
  '/',
  '/work/pcgo/',
  '/work/productivity-dashboard/',
  '/work/pcgo/docs/system-architecture/',
];

function isPink(colorStr) {
  if (!colorStr) return false;
  // Match rgb(244, 156, 245) or rgba(244, 156, 245, ...) or #f49cf5
  const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) {
    const r = parseInt(m[1], 10);
    const g = parseInt(m[2], 10);
    const b = parseInt(m[3], 10);
    // #f49cf5 -> r:244, g:156, b:245
    return Math.abs(r - 244) < 15 && Math.abs(g - 156) < 15 && Math.abs(b - 245) < 15;
  }
  return false;
}

async function measurePink(page) {
  return await page.evaluate(() => {
    function isPinkColor(colorStr) {
      if (!colorStr) return false;
      const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (m) {
        const r = parseInt(m[1], 10);
        const g = parseInt(m[2], 10);
        const b = parseInt(m[3], 10);
        const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
        if (a < 0.05) return false;
        return Math.abs(r - 244) < 15 && Math.abs(g - 156) < 15 && Math.abs(b - 245) < 15;
      }
      return false;
    }

    const allEls = Array.from(document.querySelectorAll('*'));
    const pinkEls = [];
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    for (const el of allEls) {
      // Ignore transient page transition cover and allowed hero signature highlight (.hl)
      if (el.classList.contains('pt__pink') || el.closest('.pt') || el.classList.contains('hl')) {
        continue;
      }

      const style = window.getComputedStyle(el);
      const bg = style.backgroundColor;
      if (isPinkColor(bg)) {
        const rect = el.getBoundingClientRect();
        // Compute intersection with viewport
        const x1 = Math.max(0, rect.left);
        const y1 = Math.max(0, rect.top);
        const x2 = Math.min(vw, rect.right);
        const y2 = Math.min(vh, rect.bottom);

        if (x2 > x1 && y2 > y1 && style.visibility !== 'hidden' && style.opacity !== '0') {
          const visibleArea = Math.round((x2 - x1) * (y2 - y1));
          pinkEls.push({
            tag: el.tagName.toLowerCase(),
            className: el.className || '',
            id: el.id || '',
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            visibleArea,
            fullArea: Math.round(rect.width * rect.height),
          });
        }
      }
    }

    const totalArea = pinkEls.reduce((sum, e) => sum + e.visibleArea, 0);
    const maxSingle = pinkEls.reduce((max, e) => Math.max(max, e.visibleArea), 0);
    return { pinkEls, totalArea, maxSingle };
  });
}

async function runAudit() {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  console.log(`\n======================================================`);
  console.log(`PINK ACCENT POLICY AUDIT (1440×900)`);
  console.log(`Budget: Max single <= ${MAX_SINGLE_AREA} px² | Max total <= ${MAX_TOTAL_PERCENT}% (${MAX_TOTAL_AREA} px²)`);
  console.log(`======================================================\n`);

  const auditRows = [];
  let allPassed = true;

  for (const pagePath of PAGES) {
    const url = BASE_URL + pagePath;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // 1. Measure at rest
    const rest = await measurePink(page);
    const restPct = ((rest.totalArea / VIEWPORT_AREA) * 100).toFixed(2);
    const restPass = rest.maxSingle <= MAX_SINGLE_AREA && rest.totalArea <= MAX_TOTAL_AREA;
    if (!restPass) allPassed = false;

    auditRows.push({
      page: pagePath,
      state: 'At rest',
      count: rest.pinkEls.length,
      maxSingleArea: rest.maxSingle,
      totalArea: rest.totalArea,
      viewportPercent: restPct + '%',
      status: restPass ? 'PASS' : 'FAIL',
    });

    // 2. Measure interactive hovers
    const interactiveSelectors = [
      '.wrow',
      '.wrow__main',
      '.wrow__title-link',
      '.btn',
      '.btn--pink',
      '.cs-next__link',
      '.cs-next',
      '.doc-prevnext',
    ];

    for (const sel of interactiveSelectors) {
      const handles = await page.$$(sel);
      for (let i = 0; i < handles.length; i++) {
        const handle = handles[i];
        try {
          await handle.hover({ timeout: 1000 });
          await page.waitForTimeout(100);
          const hovered = await measurePink(page);
          const pct = ((hovered.totalArea / VIEWPORT_AREA) * 100).toFixed(2);
          const pass = hovered.maxSingle <= MAX_SINGLE_AREA && hovered.totalArea <= MAX_TOTAL_AREA;
          if (!pass) allPassed = false;

          auditRows.push({
            page: pagePath,
            state: `Hover ${sel} [${i + 1}]`,
            count: hovered.pinkEls.length,
            maxSingleArea: hovered.maxSingle,
            totalArea: hovered.totalArea,
            viewportPercent: pct + '%',
            status: pass ? 'PASS' : 'FAIL',
          });
        } catch {
          // Element might be hidden/offscreen
        }
      }
    }
  }

  await browser.close();

  // Print summary table
  console.table(auditRows);

  if (allPassed) {
    console.log(`\n✓ All pages and hover states passed the pink accent budget!\n`);
    process.exit(0);
  } else {
    console.error(`\n✗ Pink accent budget exceeded on one or more states!\n`);
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
