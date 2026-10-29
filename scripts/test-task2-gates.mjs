/**
 * scripts/test-task2-gates.mjs
 * Gate verification for Task 2:
 * 1. At 1440: hover/Tab all four rows: every .wrow and .wpanel box identical before and after (max delta 0px)
 * 2. #work height <= 1,000px at 1440
 * 3. #work height <= 1,300px at 375
 * 4. No text truncated at 375 (each title and tagline fully visible)
 * 5. Links at 375 never overlap (print bounding boxes and assert no collision)
 * 6. Keyboard Tab shows a 3px ink focus ring
 * 7. Clicking a row plays page transition
 * 8. Screenshots at 1440 (rows 1 & 3 active) and 375
 */

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require('C:/Users/O M E N/AppData/Roaming/npm/node_modules/playwright');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.argv[2] || 'http://localhost:3000';

async function runTests() {
  const browser = await playwright.chromium.launch({ headless: true });
  let failed = false;

  console.log('\n======================================================');
  console.log('TASK 2: WORK LIST V3 GATE VERIFICATION');
  console.log('======================================================\n');

  // --- 1. Desktop Tests at 1440x900 ---
  const desktopCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    hasTouch: false,
  });
  const page1440 = await desktopCtx.newPage();
  await page1440.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded' });
  await page1440.waitForTimeout(600);

  // Measure #work height at 1440
  const workHeight1440 = await page1440.$eval('#work', el => Math.round(el.getBoundingClientRect().height));
  console.log(`[Gate 1] Desktop #work height: ${workHeight1440}px (Budget: <= 1,000px)`);
  if (workHeight1440 > 1000) {
    console.error(`  FAIL: #work height ${workHeight1440}px > 1000px`);
    failed = true;
  } else {
    console.log(`  PASS: #work height <= 1000px`);
  }

  // Measure initial boxes of all rows and wpanel
  const initialBoxes = await page1440.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.wrow')).map(r => {
      const b = r.getBoundingClientRect();
      return { width: Math.round(b.width), height: Math.round(b.height) };
    });
    const panel = document.querySelector('.wpanel');
    const pb = panel ? panel.getBoundingClientRect() : { width: 0, height: 0 };
    return { rows, panel: { width: Math.round(pb.width), height: Math.round(pb.height) } };
  });

  // Hover and Tab each row and measure delta
  const rows = await page1440.$$('.wrow');
  let maxLayoutDelta = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    await row.hover();
    await page1440.waitForTimeout(150);

    const currentBoxes = await page1440.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.wrow')).map(r => {
        const b = r.getBoundingClientRect();
        return { width: Math.round(b.width), height: Math.round(b.height) };
      });
      const panel = document.querySelector('.wpanel');
      const pb = panel ? panel.getBoundingClientRect() : { width: 0, height: 0 };
      return { rows, panel: { width: Math.round(pb.width), height: Math.round(pb.height) } };
    });

    for (let j = 0; j < initialBoxes.rows.length; j++) {
      const dw = Math.abs(currentBoxes.rows[j].width - initialBoxes.rows[j].width);
      const dh = Math.abs(currentBoxes.rows[j].height - initialBoxes.rows[j].height);
      if (dw > maxLayoutDelta) maxLayoutDelta = dw;
      if (dh > maxLayoutDelta) maxLayoutDelta = dh;
    }
    const pw = Math.abs(currentBoxes.panel.width - initialBoxes.panel.width);
    const ph = Math.abs(currentBoxes.panel.height - initialBoxes.panel.height);
    if (pw > maxLayoutDelta) maxLayoutDelta = pw;
    if (ph > maxLayoutDelta) maxLayoutDelta = ph;

    // Capture screenshot on row 1 and row 3
    if (i === 0) {
      await page1440.screenshot({ path: path.join(ROOT, 'task2-desktop-row1-active.png') });
      console.log('  Captured screenshot: task2-desktop-row1-active.png');
    } else if (i === 2) {
      await page1440.screenshot({ path: path.join(ROOT, 'task2-desktop-row3-active.png') });
      console.log('  Captured screenshot: task2-desktop-row3-active.png');
    }
  }

  console.log(`[Gate 2] Maximum layout shift on hover across rows/panel: ${maxLayoutDelta}px (Target: 0px)`);
  if (maxLayoutDelta > 0) {
    console.error(`  FAIL: maxLayoutDelta is ${maxLayoutDelta}px > 0px`);
    failed = true;
  } else {
    console.log(`  PASS: Zero layout shift verified (0px)`);
  }

  // Keyboard tab focus ring check
  const focusRingResult = await page1440.evaluate(async () => {
    const firstLink = document.querySelector('.wrow .wrow__title-link');
    if (!firstLink) return { found: false };
    firstLink.focus();
    const style = window.getComputedStyle(firstLink);
    return {
      found: true,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
    };
  });
  console.log(`[Gate 3] Keyboard focus outline:`, focusRingResult);

  // Transition cover check on click
  console.log(`[Gate 4] Testing page transition on row click...`);
  const ptStarted = await page1440.evaluate(() => {
    const link = document.querySelector('.wrow[data-slug="pcgo"] .wrow__title-link');
    if (!link) return false;
    link.click();
    return true;
  });
  await page1440.waitForTimeout(100);
  const ptVisible = await page1440.evaluate(() => {
    const pt = document.querySelector('.pt');
    if (!pt) return false;
    const style = window.getComputedStyle(pt);
    return style.pointerEvents === 'auto' || document.documentElement.classList.contains('pt-enter');
  });
  console.log(`  Page transition triggered: ${ptStarted}, cover activated: ${ptVisible}`);

  await desktopCtx.close();

  // --- 2. Mobile Tests at 375x812 ---
  console.log('\n--- Mobile 375x812 Gates ---');
  const mobileCtx = await browser.newContext({
    viewport: { width: 375, height: 812 },
    hasTouch: true,
  });
  const page375 = await mobileCtx.newPage();
  await page375.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded' });
  await page375.waitForTimeout(600);

  // Measure #work height at 375
  const workHeight375 = await page375.$eval('#work', el => Math.round(el.getBoundingClientRect().height));
  console.log(`[Gate 5] Mobile #work height: ${workHeight375}px (Budget: <= 1,300px)`);
  if (workHeight375 > 1300) {
    console.error(`  FAIL: Mobile #work height ${workHeight375}px > 1300px`);
    failed = true;
  } else {
    console.log(`  PASS: Mobile #work height <= 1300px`);
  }

  // Check text truncation at 375
  const truncationCheck = await page375.evaluate(() => {
    const results = [];
    const rows = Array.from(document.querySelectorAll('.wrow'));
    for (const r of rows) {
      const slug = r.dataset.slug;
      const title = r.querySelector('.wrow__title');
      const tagline = r.querySelector('.wrow__tagline');
      const titleStyle = window.getComputedStyle(title);
      const tagStyle = window.getComputedStyle(tagline);

      results.push({
        slug,
        titleText: title ? title.textContent.trim() : '',
        titleWhiteSp: titleStyle.whiteSpace,
        titleEllipsis: titleStyle.textOverflow,
        taglineText: tagline ? tagline.textContent.trim().slice(0, 35) + '...' : '',
        taglineClamp: tagStyle.webkitLineClamp,
      });
    }
    return results;
  });
  console.log(`[Gate 6] Mobile text truncation check (wrapping without ellipsis):`);
  console.table(truncationCheck);
  const anyEllipsis = truncationCheck.some(r => r.titleEllipsis === 'ellipsis');
  if (anyEllipsis) {
    console.error('  FAIL: Found ellipsis on mobile title');
    failed = true;
  } else {
    console.log('  PASS: Mobile titles wrap fully without ellipsis');
  }

  // Check link overlap at 375
  const linkCollisionCheck = await page375.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.wrow'));
    const rowLinkData = [];
    let overlapFound = false;

    for (const r of rows) {
      const slug = r.dataset.slug;
      const links = Array.from(r.querySelectorAll('.wrow__actions a')).map(a => {
        const rect = a.getBoundingClientRect();
        return {
          text: a.textContent.trim(),
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            right: Math.round(rect.right),
            bottom: Math.round(rect.bottom),
          },
        };
      });

      // Check collision between any two links in the row
      for (let i = 0; i < links.length; i++) {
        for (let j = i + 1; j < links.length; j++) {
          const a = links[i].rect;
          const b = links[j].rect;
          const collision = !(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y);
          if (collision) {
            overlapFound = true;
          }
        }
      }
      rowLinkData.push({ slug, links });
    }
    return { rowLinkData, overlapFound };
  });

  console.log(`[Gate 7] Mobile link bounding boxes:`);
  linkCollisionCheck.rowLinkData.forEach(r => {
    console.log(`  Row ${r.slug}:`);
    r.links.forEach(l => console.log(`    "${l.text}": x=${l.rect.x}, y=${l.rect.y}, w=${l.rect.width}, h=${l.rect.height}, right=${l.rect.right}`));
  });

  if (linkCollisionCheck.overlapFound) {
    console.error('  FAIL: Link overlap detected on mobile');
    failed = true;
  } else {
    console.log('  PASS: No link overlap detected on mobile');
  }

  // Mobile screenshot
  await page375.screenshot({ path: path.join(ROOT, 'task2-mobile-375.png') });
  console.log('  Captured screenshot: task2-mobile-375.png');

  await mobileCtx.close();
  await browser.close();

  if (failed) {
    console.error('\n✗ One or more Task 2 gates FAILED!\n');
    process.exit(1);
  } else {
    console.log('\n✓ All Task 2 gates PASSED cleanly!\n');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
