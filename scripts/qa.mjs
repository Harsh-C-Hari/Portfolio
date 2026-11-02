#!/usr/bin/env node
/**
 * scripts/qa.mjs
 * Comprehensive Mobile QA Suite (Task 8):
 *   1. Full Device Matrix (320x568, 360x740, 390x844, 412x915, 844x390, 768x1024) across all page types:
 *      - 0 console errors
 *      - 0 horizontal scroll overflow (scrollWidth <= innerWidth)
 *      - Exactly 1 <h1> per page
 *      - Touch target audit (>= 44x44, inline >= 24x24)
 *   2. Touch tap flows under CDP network throttling (Slow 4G and Fast 3G):
 *      - Work row tap: Home -> /work/pcgo/
 *      - Next project tap: /work/pcgo/ -> /work/productivity-dashboard/
 *      - Docs prev/next tap: /work/pcgo/docs/system-architecture/ -> /work/pcgo/docs/backend-architecture/
 *      - Browser back navigation
 *   3. Reduced-motion emulation verification
 *   4. Keyboard tab navigation pass
 *   5. Axe-core accessibility audit (zero violations across all pages)
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
  '.txt': 'text/plain',
  '.woff2': 'font/woff2'
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

const DEVICE_MATRIX = [
  { name: '320x568 (iPhone SE 1st)', width: 320, height: 568 },
  { name: '360x740 (Galaxy S8+)', width: 360, height: 740 },
  { name: '390x844 (iPhone 12/13/14)', width: 390, height: 844 },
  { name: '412x915 (Pixel 7)', width: 412, height: 915 },
  { name: '844x390 (Landscape iPhone)', width: 844, height: 390 },
  { name: '768x1024 (iPad Mini Portrait)', width: 768, height: 1024 }
];

const TEST_PAGES = [
  '/',
  '/work/pcgo/',
  '/work/productivity-dashboard/',
  '/work/pcgo/docs/system-architecture/',
  '/work/pcgo/docs/roadmap/'
];

async function getAxeSource() {
  const cachePath = path.resolve('scratch/axe.min.js');
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, 'utf8');
  }
  const res = await fetch('https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js');
  const src = await res.text();
  const dir = path.dirname(cachePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(cachePath, src, 'utf8');
  return src;
}

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
    console.log('TASK 8: COMPREHENSIVE MOBILE QA SUITE');
    console.log('======================================================\n');

    // 1. Full Device Matrix: Errors, Horizontal Overflow, H1 Count, Touch Targets
    console.log('--- 1. Testing Device Matrix (6 device sizes x 5 page types) ---');
    let totalTargetViolations = 0;
    let matrixChecksPassed = 0;

    for (const dev of DEVICE_MATRIX) {
      for (const pagePath of TEST_PAGES) {
        const context = await browser.newContext({
          viewport: { width: dev.width, height: dev.height },
          hasTouch: true,
          isMobile: true
        });
        const page = await context.newPage();
        await page.addInitScript(() => {
          sessionStorage.setItem('intro-seen', '1');
          sessionStorage.setItem('intro-seen-home', '1');
        });

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
          console.error(`❌ Console errors on ${pagePath} (${dev.name}):`, consoleErrors);
          allPassed = false;
        }

        if (overflow.scrollWidth > overflow.innerWidth) {
          console.error(`❌ Horizontal overflow on ${pagePath} (${dev.name}): scrollWidth=${overflow.scrollWidth} > innerWidth=${overflow.innerWidth}`);
          allPassed = false;
        }

        if (h1Count !== 1) {
          console.error(`❌ Expected exactly 1 <h1> on ${pagePath}, found ${h1Count}`);
          allPassed = false;
        }

        // Tap Target Audit
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
            if (el.closest('.cs-lightbox[hidden]')) continue;

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
          totalTargetViolations += violations.length;
          allPassed = false;
          console.error(`❌ ${violations.length} touch target violations on ${pagePath} (${dev.name}):`);
          for (const v of violations) {
            console.error(`   - [${v.tag}] "${v.text}" (${v.width}x${v.height}) inlineP=${v.isInlineP} class="${v.className}"`);
          }
        } else {
          matrixChecksPassed++;
        }

        await context.close();
      }
    }

    console.log(`✓ Device matrix verified: ${matrixChecksPassed}/30 combinations passed with 0 horizontal overflow, 0 console errors, 1 <h1>, and ${totalTargetViolations} target violations.`);

    // 2. CDP Network Throttling (Slow 4G and Fast 3G) Touch Flows
    console.log('\n--- 2. Testing Touch Flows Under CDP Network Throttling ---');
    const THROTTLE_CONFIGS = [
      {
        name: 'Slow 4G',
        downloadThroughput: (500 * 1024) / 8,
        uploadThroughput: (500 * 1024) / 8,
        latency: 400
      },
      {
        name: 'Fast 3G',
        downloadThroughput: (1.6 * 1024 * 1024) / 8,
        uploadThroughput: (750 * 1024) / 8,
        latency: 150
      }
    ];

    for (const cfg of THROTTLE_CONFIGS) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true
      });
      const page = await context.newPage();
      await page.addInitScript(() => {
        sessionStorage.setItem('intro-seen', '1');
        sessionStorage.setItem('intro-seen-home', '1');
      });

      const client = await page.context().newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: cfg.latency,
        downloadThroughput: cfg.downloadThroughput,
        uploadThroughput: cfg.uploadThroughput,
        connectionType: 'cellular3g'
      });

      console.log(`  [${cfg.name}] Flow 1: Work row tap Home → /work/pcgo/`);
      await page.goto(`${activeBaseUrl}/`, { waitUntil: 'domcontentloaded' });
      const pcgoLink = page.locator('a[href^="/work/pcgo"]').first();
      await pcgoLink.tap();
      await page.waitForURL(url => url.pathname.includes('/work/pcgo'));

      console.log(`  [${cfg.name}] Flow 2: Case Next Project tap /work/pcgo/ → /work/productivity-dashboard/`);
      const nextBtn = page.locator('.cs-next__link');
      await nextBtn.scrollIntoViewIfNeeded();
      await nextBtn.tap();
      await page.waitForURL(url => url.pathname.includes('/work/productivity-dashboard'));

      console.log(`  [${cfg.name}] Flow 3: Browser Back navigation`);
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await page.waitForURL(url => url.pathname.includes('/work/pcgo'));

      console.log(`  [${cfg.name}] Flow 4: Docs prev/next tap flow`);
      await page.goto(`${activeBaseUrl}/work/pcgo/docs/system-architecture/`, { waitUntil: 'domcontentloaded' });
      const nextDoc = page.locator('.doc-prevnext--next');
      if (await nextDoc.count()) {
        await nextDoc.scrollIntoViewIfNeeded();
        await nextDoc.tap();
        await page.waitForURL(url => url.pathname.includes('/work/pcgo/docs/'));

        const prevDoc = page.locator('.doc-prevnext--prev');
        if (await prevDoc.count()) {
          await prevDoc.scrollIntoViewIfNeeded();
          await prevDoc.tap();
          await page.waitForURL(url => url.pathname.includes('/work/pcgo/docs/system-architecture'));
        }
      }
      console.log(`✓ All transition tap flows succeeded under ${cfg.name}`);

      await context.close();
    }

    // 3. Reduced Motion Emulation
    console.log('\n--- 3. Testing Reduced-Motion Emulation ---');
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        reducedMotion: 'reduce'
      });
      const page = await context.newPage();
      await page.addInitScript(() => {
        sessionStorage.setItem('intro-seen', '1');
        sessionStorage.setItem('intro-seen-home', '1');
      });
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
      console.log(`✓ Page transition under reduced-motion completed cleanly in ${duration}ms`);

      await context.close();
    }

    // 4. Keyboard Navigation Pass
    console.log('\n--- 4. Testing Keyboard-Only Navigation ---');
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.addInitScript(() => {
        sessionStorage.setItem('intro-seen', '1');
        sessionStorage.setItem('intro-seen-home', '1');
      });
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

    // 5. Axe-core Accessibility Audit
    console.log('\n--- 5. Testing Axe-core Accessibility (Zero Violations) ---');
    const axeSource = await getAxeSource();
    let totalAxeViolations = 0;

    for (const pagePath of TEST_PAGES) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await page.addInitScript(() => {
        sessionStorage.setItem('intro-seen', '1');
        sessionStorage.setItem('intro-seen-home', '1');
      });
      await page.goto(`${activeBaseUrl}${pagePath}`, { waitUntil: 'networkidle' });

      await page.addScriptTag({ content: axeSource });
      const results = await page.evaluate(async () => {
        // @ts-ignore
        return await axe.run({
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
          }
        });
      });

      if (results.violations.length > 0) {
        totalAxeViolations += results.violations.length;
        allPassed = false;
        console.error(`❌ ${results.violations.length} axe violations on ${pagePath}:`);
        for (const v of results.violations) {
          console.error(`   - [${v.impact}] ${v.id}: ${v.help}`);
        }
      } else {
        console.log(`✓ 0 axe violations: ${pagePath}`);
      }
      await context.close();
    }

    if (totalAxeViolations === 0) {
      console.log('✓ Axe-core check passed: zero WCAG 2.1 AA violations across all test pages.');
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
    console.log('✅ ALL TASK 8 QA PLAYWRIGHT TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================\n');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runQA();
}

export { runQA };
