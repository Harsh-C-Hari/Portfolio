import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require('C:/Users/O M E N/AppData/Roaming/npm/node_modules/playwright');
}

async function testTask4() {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  const failedRequests = [];
  page.on('response', response => {
    if (response.status() >= 400) {
      failedRequests.push(`${response.status()} ${response.url()}`);
    }
  });

  console.log('Testing /work/productivity-dashboard...');
  await page.goto('http://localhost:3000/work/productivity-dashboard/', { waitUntil: 'networkidle' });
  
  // Verify gallery has 6 items
  const dashGalleryItems = await page.$$('.cs-gallery--dash .cs-gallery__item');
  console.log(`Productivity Dashboard gallery items: ${dashGalleryItems.length} (expected 6)`);
  if (dashGalleryItems.length !== 6) throw new Error(`Expected 6 gallery items, found ${dashGalleryItems.length}`);

  // Scroll to gallery so lazy images load
  const gallery = await page.$('.cs-gallery--dash');
  await gallery.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  // Check images loaded
  const dashImages = await page.$$eval('.cs-gallery--dash img', imgs => imgs.map(i => ({ src: i.src, naturalWidth: i.naturalWidth, complete: i.complete })));
  console.log(`Dashboard images loaded (${dashImages.length}):`);
  for (const img of dashImages) {
    console.log(`  - ${img.src} (naturalWidth: ${img.naturalWidth})`);
    if (img.naturalWidth === 0) throw new Error(`Image failed to load: ${img.src}`);
  }

  console.log('\nTesting /work/pcgo...');
  await page.goto('http://localhost:3000/work/pcgo/', { waitUntil: 'networkidle' });
  
  const pcgoGalleryItems = await page.$$('#tab-admin .cs-gallery__item');
  console.log(`PCGO admin gallery items: ${pcgoGalleryItems.length} (expected 11)`);
  if (pcgoGalleryItems.length !== 11) throw new Error(`Expected 11 gallery items, found ${pcgoGalleryItems.length}`);

  const pcgoGallery = await page.$('#tab-admin .cs-gallery');
  await pcgoGallery.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  const pcgoImages = await page.$$eval('#tab-admin img', imgs => imgs.map(i => ({ src: i.src, naturalWidth: i.naturalWidth })));
  console.log(`PCGO images loaded (${pcgoImages.length}):`);
  for (const img of pcgoImages) {
    console.log(`  - ${img.src} (naturalWidth: ${img.naturalWidth})`);
    if (img.naturalWidth === 0) throw new Error(`Image failed to load: ${img.src}`);
  }

  await browser.close();

  if (failedRequests.length > 0) {
    console.warn('Failed requests encountered:', failedRequests);
    throw new Error('Some assets returned HTTP >= 400');
  }

  console.log('\n✓ Task 4 Gates PASSED: All 17 gallery images loaded with 200 OK and valid naturalWidth.');
}

testTask4().catch(err => {
  console.error('Task 4 Gates failed:', err);
  process.exit(1);
});
