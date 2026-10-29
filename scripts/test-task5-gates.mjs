import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require('C:/Users/O M E N/AppData/Roaming/npm/node_modules/playwright');
}
const { chromium } = playwright;

const ARTIFACTS_DIR = 'C:/Users/O M E N/.gemini/antigravity-ide/brain/c7255512-0130-44f4-82c8-d2869e460dda';
const BASE_URL = 'http://localhost:3000';

const testPages = [
  '/work/pcgo/docs/system-architecture/',
  '/work/pcgo/docs/roadmap/',
  '/work/pcgo/docs/tailscale-state-recovery/',
];

const viewports = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1100', width: 1100, height: 800 },
  { name: '375',  width: 375,  height: 812 },
];

async function run() {
  const browser = await chromium.launch();
  let errors = 0;

  for (const pagePath of testPages) {
    const slug = pagePath.replace(/\/work\/pcgo\/docs\//, '').replace(/\//g, '');
    for (const vp of viewports) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await page.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'networkidle' });

      // Check h1 count
      const h1Count = await page.locator('h1').count();
      if (h1Count !== 1) {
        console.error(`FAIL: ${pagePath} at ${vp.width}px has ${h1Count} h1s (expected 1)`);
        errors++;
      }

      // Check horizontal scroll
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const innerWidth = await page.evaluate(() => window.innerWidth);
      if (scrollWidth > innerWidth) {
        console.error(`FAIL: Horizontal scroll detected on ${pagePath} at ${vp.width}px! scrollWidth: ${scrollWidth}, innerWidth: ${innerWidth}`);
        errors++;
      } else {
        console.log(`✓ ${slug} at ${vp.width}px: scrollWidth ${scrollWidth} <= ${innerWidth}, h1 count: ${h1Count}`);
      }

      // Verify layout specifics
      if (vp.width >= 1200) {
        const railVisible = await page.locator('.doc-toc-rail').isVisible();
        const detailsVisible = await page.locator('.doc-toc-details').isVisible();
        if (!railVisible || detailsVisible) {
          console.error(`FAIL: At ${vp.width}px, railVisible: ${railVisible} (expected true), detailsVisible: ${detailsVisible} (expected false)`);
          errors++;
        }
      } else {
        const railVisible = await page.locator('.doc-toc-rail').isVisible();
        const detailsVisible = await page.locator('.doc-toc-details').isVisible();
        if (railVisible || !detailsVisible) {
          console.error(`FAIL: At ${vp.width}px, railVisible: ${railVisible} (expected false), detailsVisible: ${detailsVisible} (expected true)`);
          errors++;
        }
      }

      // Take screenshot
      const shotName = `task5-${slug}-${vp.name}.png`;
      const shotPath = path.join(ARTIFACTS_DIR, shotName);
      await page.screenshot({ path: shotPath });
      console.log(`  Saved screenshot: ${shotName}`);

      await page.close();
    }
  }

  // Test IntersectionObserver TOC rail active highlight on system-architecture at 1440
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${BASE_URL}/work/pcgo/docs/system-architecture/`, { waitUntil: 'networkidle' });

    // Initial active link
    const firstActive = (await page.locator('.doc-toc-rail a.is-active').textContent())?.trim();
    console.log(`Initial active TOC rail link: "${firstActive}"`);

    // Scroll down to #architectural-layers
    await page.evaluate(() => {
      const el = document.getElementById('architectural-layers');
      if (el) window.scrollTo(0, el.offsetTop - 100);
    });
    await page.waitForTimeout(600);

    const activeAfterScroll = (await page.locator('.doc-toc-rail a.is-active').textContent())?.trim();
    console.log(`Active TOC rail link after scrolling to #architectural-layers: "${activeAfterScroll}"`);

    if (activeAfterScroll !== 'Architectural Layers') {
      console.error(`FAIL: Expected active link to be 'Architectural Layers', got '${activeAfterScroll}'`);
      errors++;
    } else {
      console.log('✓ IntersectionObserver accurately updated active TOC link to "Architectural Layers"!');
    }

    const shotName = 'task5-system-architecture-scrolled-active.png';
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, shotName) });
    console.log(`  Saved active rail screenshot: ${shotName}`);

    await page.close();
  }

  await browser.close();

  if (errors > 0) {
    console.error(`\nTest failed with ${errors} error(s)!`);
    process.exit(1);
  } else {
    console.log('\n✓ ALL Task 5 gates passed with 0 errors!');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
