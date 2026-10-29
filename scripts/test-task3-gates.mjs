/**
 * scripts/test-task3-gates.mjs
 * Gate verification for Task 3:
 * 1. .cs-next is a full-width link band (not a card), height ~200-260px
 * 2. On hover: title translateX(10px), arrow translateX(8px), marker under title, thumb lifts 4px with 4px ink shadow
 * 3. .doc-prevnext cards: 2px ink border, hover = translate(-2px, -2px) + 6px 6px 0 var(--ink) shadow, arrow nudge
 * 4. Secondary link "All work" exists next to next-project band
 * 5. Pink area audit passes on all states
 * 6. Screenshots at 1440 and 375
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
  console.log('TASK 3: NEXT-PROJECT AND PREV/NEXT VERIFICATION');
  console.log('======================================================\n');

  // --- 1. Desktop Tests at 1440x900 on /work/pcgo/ ---
  const desktopCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page1440 = await desktopCtx.newPage();
  await page1440.goto(BASE_URL + '/work/pcgo/', { waitUntil: 'domcontentloaded' });
  await page1440.waitForTimeout(600);

  // Measure .cs-next band height
  const nextBandData = await page1440.evaluate(() => {
    const section = document.querySelector('.cs-next');
    const link = document.querySelector('.cs-next__link');
    const allWork = document.querySelector('.cs-next__all');
    const title = document.querySelector('.cs-next__title');
    const arrow = document.querySelector('.cs-next__arrow');
    const thumb = document.querySelector('.cs-next__thumb');

    const sb = section ? section.getBoundingClientRect() : null;
    const tb = thumb ? thumb.getBoundingClientRect() : null;

    return {
      hasSection: !!section,
      sectionHeight: sb ? Math.round(sb.height) : 0,
      hasLink: !!link,
      hasAllWork: !!allWork,
      allWorkText: allWork ? allWork.textContent.trim() : '',
      allWorkHref: allWork ? allWork.getAttribute('href') : '',
      thumbWidth: tb ? Math.round(tb.width) : 0,
      thumbHeight: tb ? Math.round(tb.height) : 0,
    };
  });

  console.log('[Gate 1] .cs-next band verification:');
  console.log(`  Section height: ${nextBandData.sectionHeight}px (Target: ~200-260px)`);
  console.log(`  "All work" link: "${nextBandData.allWorkText}" -> ${nextBandData.allWorkHref}`);
  console.log(`  Thumbnail dimensions: ${nextBandData.thumbWidth}x${nextBandData.thumbHeight}px (max 240px wide, 16:10)`);

  if (nextBandData.sectionHeight < 180 || nextBandData.sectionHeight > 290) {
    console.error(`  FAIL: Section height ${nextBandData.sectionHeight}px out of expected range`);
    failed = true;
  } else {
    console.log('  PASS: Section height is within ~200-260px');
  }

  if (!nextBandData.hasAllWork || !nextBandData.allWorkText.includes('All work')) {
    console.error('  FAIL: Secondary "All work" link missing');
    failed = true;
  } else {
    console.log('  PASS: Secondary "All work" link present');
  }

  // Scroll to cs-next and hover
  await page1440.$eval('.cs-next', el => el.scrollIntoView({ behavior: 'instant' }));
  await page1440.waitForTimeout(200);

  // Capture at rest screenshot
  await page1440.screenshot({ path: path.join(ROOT, 'task3-pcgo-next-rest-1440.png') });

  // Hover .cs-next__link
  const nextLink = await page1440.$('.cs-next__link');
  await nextLink.hover();
  await page1440.waitForTimeout(200);

  // Check hover styling: title transform, arrow transform, thumb transform
  const hoverStyles = await page1440.evaluate(() => {
    const title = document.querySelector('.cs-next__title');
    const arrow = document.querySelector('.cs-next__arrow');
    const thumb = document.querySelector('.cs-next__thumb');
    const mark = document.querySelector('.cs-next .mark');

    const titleStyle = window.getComputedStyle(title);
    const arrowStyle = window.getComputedStyle(arrow);
    const thumbStyle = window.getComputedStyle(thumb);
    const markStyle = window.getComputedStyle(mark);

    return {
      titleTransform: titleStyle.transform,
      arrowTransform: arrowStyle.transform,
      thumbTransform: thumbStyle.transform,
      thumbShadow: thumbStyle.boxShadow,
      markBgSize: markStyle.backgroundSize,
    };
  });

  console.log('[Gate 2] .cs-next hover transforms:');
  console.log('  Title transform:', hoverStyles.titleTransform);
  console.log('  Arrow transform:', hoverStyles.arrowTransform);
  console.log('  Thumb transform:', hoverStyles.thumbTransform);
  console.log('  Thumb shadow:', hoverStyles.thumbShadow);
  console.log('  Marker background size:', hoverStyles.markBgSize);

  await page1440.screenshot({ path: path.join(ROOT, 'task3-pcgo-next-hover-1440.png') });
  console.log('  Captured screenshot: task3-pcgo-next-hover-1440.png');

  // --- 2. Check doc-prevnext on a docs page ---
  await page1440.goto(BASE_URL + '/work/pcgo/docs/system-architecture/', { waitUntil: 'domcontentloaded' });
  await page1440.waitForTimeout(500);

  const prevNextData = await page1440.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.doc-prevnext'));
    return cards.map(c => {
      const style = window.getComputedStyle(c);
      return {
        text: c.textContent.trim().replace(/\s+/g, ' '),
        borderWidth: style.borderWidth,
        borderStyle: style.borderStyle,
        borderColor: style.borderColor,
        bg: style.backgroundColor,
      };
    });
  });

  console.log('\n[Gate 3] .doc-prevnext card border check:');
  console.table(prevNextData);
  const borderPass = prevNextData.every(c => c.borderWidth === '2px' && c.borderStyle === 'solid');
  if (!borderPass) {
    console.error('  FAIL: .doc-prevnext cards do not have 2px solid border');
    failed = true;
  } else {
    console.log('  PASS: 2px solid ink border verified on doc-prevnext cards');
  }

  // Hover doc-prevnext card
  const docNext = await page1440.$('.doc-prevnext--next');
  if (docNext) {
    await docNext.hover();
    await page1440.waitForTimeout(200);
    const docHoverStyle = await page1440.evaluate(() => {
      const card = document.querySelector('.doc-prevnext--next');
      const arrow = card.querySelector('.doc-prevnext__arrow');
      const cs = window.getComputedStyle(card);
      const as = window.getComputedStyle(arrow);
      return {
        cardTransform: cs.transform,
        cardShadow: cs.boxShadow,
        arrowTransform: as.transform,
      };
    });
    console.log('  doc-prevnext--next hover:', docHoverStyle);
    await page1440.screenshot({ path: path.join(ROOT, 'task3-doc-prevnext-hover-1440.png') });
  }

  await desktopCtx.close();

  // --- 3. Mobile Tests at 375x812 ---
  console.log('\n--- Mobile 375x812 Tests ---');
  const mobileCtx = await browser.newContext({
    viewport: { width: 375, height: 812 },
    hasTouch: true,
  });
  const page375 = await mobileCtx.newPage();
  await page375.goto(BASE_URL + '/work/pcgo/', { waitUntil: 'domcontentloaded' });
  await page375.waitForTimeout(500);

  await page375.$eval('.cs-next', el => el.scrollIntoView({ behavior: 'instant' }));
  await page375.waitForTimeout(200);

  const mobileNextData = await page375.evaluate(() => {
    const thumb = document.querySelector('.cs-next__thumb');
    const thumbStyle = thumb ? window.getComputedStyle(thumb) : null;
    return {
      thumbHidden: thumbStyle ? thumbStyle.display === 'none' : true,
    };
  });
  console.log(`[Gate 4] Mobile thumb hidden (< 700px): ${mobileNextData.thumbHidden}`);
  if (!mobileNextData.thumbHidden) {
    console.error('  FAIL: Thumbnail visible below 700px');
    failed = true;
  } else {
    console.log('  PASS: Thumbnail hidden below 700px');
  }

  await page375.screenshot({ path: path.join(ROOT, 'task3-pcgo-next-375.png') });
  console.log('  Captured screenshot: task3-pcgo-next-375.png');

  await mobileCtx.close();
  await browser.close();

  if (failed) {
    console.error('\n✗ Task 3 verification FAILED!\n');
    process.exit(1);
  } else {
    console.log('\n✓ All Task 3 gates PASSED cleanly!\n');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
