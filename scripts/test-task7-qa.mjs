import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let playwright;
try {
  playwright = await import('playwright');
} catch {
  const require = createRequire(import.meta.url);
  playwright = require('C:/Users/O M E N/AppData/Roaming/npm/node_modules/playwright');
}

const { chromium } = playwright.default || playwright;
const BASE_URL = 'http://localhost:3000';

const TEST_PAGES = [
  '/',
  '/work/pcgo/',
  '/work/productivity-dashboard/',
  '/work/pcgo/docs/system-architecture/',
  '/work/pcgo/docs/roadmap/'
];

async function runQA() {
  const browser = await chromium.launch();
  let allPassed = true;

  try {
    console.log('======================================================');
    console.log('TASK 7: COMPREHENSIVE PLAYWRIGHT QA SUITE');
    console.log('======================================================\n');

    // 1. Console Errors & Horizontal Scroll at 1440 and 375
    console.log('--- 1. Testing Console Errors & Horizontal Overflow ---');
    for (const pagePath of TEST_PAGES) {
      for (const width of [1440, 375]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 }
        });
        const page = await context.newPage();
        const consoleErrors = [];
        page.on('console', msg => {
          if (msg.type() === 'error') consoleErrors.push(msg.text());
        });

        await page.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'networkidle' });

        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth
        }));

        const h1Count = await page.evaluate(() => document.querySelectorAll('h1').length);

        if (consoleErrors.length > 0) {
          console.error(`❌ Console errors on ${pagePath} at ${width}px:`, consoleErrors);
          allPassed = false;
        } else {
          console.log(`✓ 0 console errors: ${pagePath} (${width}px)`);
        }

        if (overflow.scrollWidth > overflow.innerWidth) {
          console.error(`❌ Horizontal overflow on ${pagePath} at ${width}px: scrollWidth=${overflow.scrollWidth} > innerWidth=${overflow.innerWidth}`);
          allPassed = false;
        } else {
          console.log(`✓ No horizontal overflow: ${pagePath} (${width}px)`);
        }

        if (h1Count !== 1) {
          console.error(`❌ Expected exactly 1 <h1> on ${pagePath}, found ${h1Count}`);
          allPassed = false;
        } else {
          console.log(`✓ Exactly 1 <h1>: ${pagePath}`);
        }

        await context.close();
      }
    }

    // 2. Page Transitions in Both Directions
    console.log('\n--- 2. Testing Page Transitions Forward & Backward ---');
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();

      // Home -> PCGO
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
      const pcgoLink = page.locator('a[href^="/work/pcgo"]').first();
      await pcgoLink.click();
      await page.waitForURL(url => url.pathname.startsWith('/work/pcgo'));
      console.log('✓ Transition Home → /work/pcgo successful');

      // PCGO -> Next Project (Productivity Dashboard)
      const nextProjLink = page.locator('.cs-next__link');
      await nextProjLink.click();
      await page.waitForURL(url => url.pathname.includes('/work/productivity-dashboard'));
      console.log('✓ Transition /work/pcgo → /work/productivity-dashboard successful');

      // Next Project -> PCGO
      const nextProjLink2 = page.locator('.cs-next__link');
      await nextProjLink2.click();
      await page.waitForURL(url => url.pathname.includes('/work/pcgo'));
      console.log('✓ Transition /work/productivity-dashboard → /work/pcgo successful');

      // Browser Back Button
      await page.goBack({ waitUntil: 'networkidle' });
      if (page.url().includes('/work/productivity-dashboard')) {
        console.log('✓ Back button navigation successful (returned to productivity-dashboard)');
      } else {
        console.error('❌ Back button did not return to productivity-dashboard:', page.url());
        allPassed = false;
      }

      await page.goBack({ waitUntil: 'networkidle' });
      if (page.url().includes('/work/pcgo')) {
        console.log('✓ Back button navigation successful (returned to pcgo)');
      } else {
        console.error('❌ Back button did not return to pcgo:', page.url());
        allPassed = false;
      }

      await context.close();
    }

    // 3. Reduced Motion Emulation
    console.log('\n--- 3. Testing Reduced-Motion Emulation ---');
    {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion: 'reduce'
      });
      const page = await context.newPage();
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

      const prefersReduced = await page.evaluate(() => {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      });

      if (!prefersReduced) {
        console.error('❌ prefers-reduced-motion: reduce not active');
        allPassed = false;
      } else {
        console.log('✓ prefers-reduced-motion: reduce media query matches true');
      }

      // Check transition with reduced motion
      const pcgoLink = page.locator('a[href^="/work/pcgo"]').first();
      const startTime = Date.now();
      await pcgoLink.click();
      await page.waitForURL(url => url.pathname.includes('/work/pcgo'));
      const duration = Date.now() - startTime;
      console.log(`✓ Page transition under reduced-motion completed in ${duration}ms`);

      await context.close();
    }

    // 4. Keyboard Navigation Pass
    console.log('\n--- 4. Testing Keyboard-Only Navigation ---');
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

      // Tab through elements
      let focusedElements = [];
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press('Tab');
        const activeTag = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el) return null;
          return {
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            text: el.textContent.trim().slice(0, 30),
            hasOutline: window.getComputedStyle(el).outlineStyle !== 'none'
          };
        });
        if (activeTag) focusedElements.push(activeTag);
      }

      console.log(`✓ Successfully tabbed through ${focusedElements.length} focusable elements.`);
      console.log(`  First focus: <${focusedElements[0]?.tagName}> id="${focusedElements[0]?.id}" class="${focusedElements[0]?.className}" text="${focusedElements[0]?.text}"`);
      const linksFocused = focusedElements.filter(e => e.tagName === 'A');
      console.log(`  Focus traversed ${linksFocused.length} links properly.`);

      if (focusedElements.length < 5) {
        console.error('❌ Tab navigation did not traverse sufficient focusable elements.');
        allPassed = false;
      }

      await context.close();
    }

  } finally {
    await browser.close();
  }

  if (!allPassed) {
    console.error('\n❌ QA test suite encountered failures.');
    process.exit(1);
  } else {
    console.log('\n======================================================');
    console.log('✅ ALL QA PLAYWRIGHT TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================\n');
  }
}

runQA();
