#!/usr/bin/env node
/**
 * scripts/qa.mjs
 * Consolidated comprehensive Playwright QA suite:
 *   1. Console error check across all core routes at 1440px and 375px
 *   2. Horizontal scroll overflow check at 1440px and 375px
 *   3. Exactly one <h1> per page check
 *   4. Client-side page transitions back and forth
 *   5. Reduced-motion emulation verification
 *   6. Keyboard tab navigation pass
 *
 * Usage: node scripts/qa.mjs [baseUrl]
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

let playwright;
try {
  playwright = await import('playwright');
} catch {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const globalPath = path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'playwright');
  playwright = require(globalPath);
}

const { chromium } = playwright.default || playwright;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml',
  '.txt': 'text/plain'
};

function createStaticServer() {
  return http.createServer((req, res) => {
    const rawUrl = req.url || '/';
    const cleanPath = rawUrl.split('?')[0].split('#')[0];
    let filePath = path.join(DIST, cleanPath.replace(/\//g, path.sep));

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    } else if (!fs.existsSync(filePath)) {
      if (fs.existsSync(filePath + '.html')) {
        filePath = filePath + '.html';
      } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
        filePath = path.join(filePath, 'index.html');
      }
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

async function isServerRunning(url) {
  return new Promise(resolve => {
    const req = http.get(url, res => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

const TEST_PAGES = [
  '/',
  '/work/pcgo/',
  '/work/productivity-dashboard/',
  '/work/pcgo/docs/system-architecture/',
  '/work/pcgo/docs/roadmap/',
];

async function runQA() {
  let server = null;
  let activeBaseUrl = process.argv[2] || 'http://localhost:3000';

  if (!process.argv[2]) {
    const isUp = await isServerRunning('http://localhost:3000');
    if (!isUp) {
      server = createStaticServer();
      await new Promise(resolve => server.listen(0, resolve));
      const port = server.address().port;
      activeBaseUrl = `http://localhost:${port}`;
      console.log(`[QA] Started temporary static server at ${activeBaseUrl} serving dist/`);
    }
  }

  const browser = await chromium.launch();
  let allPassed = true;

  try {
    console.log('======================================================');
    console.log('COMPREHENSIVE PLAYWRIGHT QA SUITE');
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

        await page.goto(`${activeBaseUrl}${pagePath}`, { waitUntil: 'networkidle' });

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
      await page.goto(`${activeBaseUrl}/`, { waitUntil: 'networkidle' });
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
      await page.goto(`${activeBaseUrl}/`, { waitUntil: 'networkidle' });

      const prefersReduced = await page.evaluate(() => {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      });

      if (!prefersReduced) {
        console.error('❌ prefers-reduced-motion: reduce not active');
        allPassed = false;
      } else {
        console.log('✓ prefers-reduced-motion: reduce media query matches true');
      }

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
      await page.goto(`${activeBaseUrl}/`, { waitUntil: 'networkidle' });

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
      const linksFocused = focusedElements.filter(e => e.tagName === 'A');
      console.log(`  Focus traversed ${linksFocused.length} links properly.`);

      if (focusedElements.length < 5) {
        console.error('❌ Tab navigation did not traverse sufficient focusable elements.');
        allPassed = false;
      }

      await context.close();
    }

    // 5. Mobile Touch Target Audit (Task 2)
    console.log('\n--- 5. Testing Mobile Touch Targets (>= 44px, inline >= 24px) ---');
    const TARGET_WIDTHS = [320, 360, 390, 412, 768];
    const TARGET_PAGES = [
      '/',
      '/work/pcgo/',
      '/work/productivity-dashboard/',
      '/work/pcgo/docs/system-architecture/'
    ];

    let touchTargetViolations = 0;
    for (const pagePath of TARGET_PAGES) {
      for (const width of TARGET_WIDTHS) {
        const context = await browser.newContext({
          viewport: { width, height: 800 },
          hasTouch: true,
          isMobile: true
        });
        const page = await context.newPage();
        await page.goto(`${activeBaseUrl}${pagePath}`, { waitUntil: 'networkidle' });

        const violations = await page.evaluate(() => {
          const items = Array.from(document.querySelectorAll('a[href], button, summary, [role="button"], input, select, textarea'));
          const issues = [];

          for (const el of items) {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;

            if (el.closest('details:not([open])') && el.tagName.toLowerCase() !== 'summary') continue;
            const navMenu = el.closest('.nav__menu, .mobile-menu, [id*="mobile-menu"], .menu');
            if (navMenu && (style.display === 'none' || style.visibility === 'hidden' || navMenu.hasAttribute('hidden'))) continue;

            const isInlineP = el.tagName.toLowerCase() === 'a' && el.closest('p') !== null && style.display === 'inline';

            const minW = isInlineP ? 24 : 44;
            const minH = isInlineP ? 24 : 44;

            if (rect.width < minW || rect.height < minH) {
              issues.push({
                tag: el.tagName,
                text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 35),
                className: el.className,
                width: Math.round(rect.width * 10) / 10,
                height: Math.round(rect.height * 10) / 10,
                isInlineP
              });
            }
          }
          return issues;
        });

        if (violations.length > 0) {
          touchTargetViolations += violations.length;
          allPassed = false;
          console.error(`❌ ${violations.length} touch target violations on ${pagePath} at ${width}px:`);
          for (const v of violations) {
            console.error(`   - [${v.tag}] "${v.text}" (${v.width}x${v.height}) inlineP=${v.isInlineP} class="${v.className}"`);
          }
        }
        await context.close();
      }
    }

    if (touchTargetViolations === 0) {
      console.log('✓ Touch targets check passed: 0 violations across all 5 widths and 4 page types');
    }


  } finally {
    await browser.close();
    if (server) {
      await new Promise(r => server.close(r));
    }
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runQA();
}

export { runQA };
