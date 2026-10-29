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
const ARTIFACT_DIR = 'C:/Users/O M E N/.gemini/antigravity-ide/brain/c7255512-0130-44f4-82c8-d2869e460dda';

async function run() {
  const browser = await chromium.launch();
  let passed = true;

  try {
    for (const width of [1440, 375]) {
      console.log(`\n=== Testing PCGO architecture diagram at ${width}px ===`);
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        deviceScaleFactor: 1
      });
      const page = await context.newPage();

      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await page.goto('http://localhost:3000/work/pcgo/', { waitUntil: 'networkidle' });

      // Check horizontal overflow
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth
      }));
      if (overflow.scrollWidth > overflow.innerWidth) {
        console.error(`FAIL: Horizontal overflow detected at ${width}px! scrollWidth=${overflow.scrollWidth}, innerWidth=${overflow.innerWidth}`);
        passed = false;
      } else {
        console.log(`PASS: No horizontal scroll (${overflow.scrollWidth} <= ${overflow.innerWidth})`);
      }

      // Check SVG element
      const svgInfo = await page.evaluate(() => {
        const svg = document.querySelector('.pcgo-arch-svg');
        if (!svg) return null;
        const rect = svg.getBoundingClientRect();
        const ariaHidden = svg.getAttribute('aria-hidden');
        const ariaLabelledby = svg.getAttribute('aria-labelledby');
        const titleEl = svg.querySelector('title');
        const descEl = svg.querySelector('desc');
        const srOnly = document.querySelector('.cs-arch__diagram .sr-only');

        // Check text elements within svg
        const texts = Array.from(svg.querySelectorAll('text')).map(t => {
          const bbox = t.getBBox();
          const computed = window.getComputedStyle(t);
          return {
            id: t.id,
            text: t.textContent.trim(),
            fontSize: parseFloat(computed.fontSize),
            bbox: { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height }
          };
        });

        return {
          renderedWidth: rect.width,
          renderedHeight: rect.height,
          ariaHidden,
          ariaLabelledby,
          hasTitle: !!titleEl && titleEl.textContent.length > 0,
          titleId: titleEl ? titleEl.id : null,
          hasDesc: !!descEl && descEl.textContent.length > 0,
          descId: descEl ? descEl.id : null,
          hasSrOnly: !!srOnly && srOnly.querySelectorAll('li').length >= 5,
          texts
        };
      });

      if (!svgInfo) {
        console.error(`FAIL: .pcgo-arch-svg not found`);
        passed = false;
        continue;
      }

      console.log(`SVG rendered dimensions: ${svgInfo.renderedWidth.toFixed(1)}px x ${svgInfo.renderedHeight.toFixed(1)}px`);

      if (width === 1440 && svgInfo.renderedWidth > 460.5) {
        console.error(`FAIL: SVG rendered width ${svgInfo.renderedWidth}px exceeds 460px`);
        passed = false;
      } else {
        console.log(`PASS: Rendered width ${svgInfo.renderedWidth.toFixed(1)}px <= 460px`);
      }

      if (svgInfo.ariaHidden === 'true') {
        console.error(`FAIL: SVG has aria-hidden="true"`);
        passed = false;
      } else {
        console.log(`PASS: SVG is not aria-hidden`);
      }

      if (!svgInfo.hasTitle || !svgInfo.hasDesc || !svgInfo.hasSrOnly) {
        console.error(`FAIL: Missing accessibility markup`, {
          hasTitle: svgInfo.hasTitle,
          hasDesc: svgInfo.hasDesc,
          hasSrOnly: svgInfo.hasSrOnly
        });
        passed = false;
      } else {
        console.log(`PASS: Accessibility title, desc, and sr-only list present`);
      }

      // Check font sizes
      let fontSizesOk = true;
      for (const t of svgInfo.texts) {
        // In SVG viewBox, font-size in SVG attribute is scaled, but let's check viewBox declared sizes or rendered
        if (t.fontSize < 9 && width === 1440) {
          console.error(`FAIL: Text "${t.text}" has small computed font-size: ${t.fontSize}px`);
          fontSizesOk = false;
        }
      }
      if (fontSizesOk) {
        console.log(`PASS: All SVG text elements have legible font size`);
      } else {
        passed = false;
      }

      // Screenshot zoom on the diagram
      const diagramEl = await page.$('.cs-arch__diagram');
      if (diagramEl) {
        const screenshotPath = path.join(ARTIFACT_DIR, `task6-arch-zoom-${width}.png`);
        await diagramEl.screenshot({ path: screenshotPath });
        console.log(`Captured screenshot: ${screenshotPath}`);
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  if (!passed) {
    console.error(`\n❌ Some Task 6 gates failed.`);
    process.exit(1);
  } else {
    console.log(`\n✅ All Task 6 gates passed!`);
  }
}

run();
