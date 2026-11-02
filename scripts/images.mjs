import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const PCGO_SRC = 'reference/pcgo-screenshots';
const DASH_SRC = 'reference/dashboard-screenshots';
const PCGO_DEST = 'img/work/pcgo';
const DASH_DEST = 'img/work/productivity-dashboard';

fs.mkdirSync(PCGO_DEST, { recursive: true });
fs.mkdirSync(DASH_DEST, { recursive: true });

// PCGO Privacy definitions
const PCGO_PRIVACY = {
  'host-monitor.png': [
    { type: 'blur', left: 810, top: 550, width: 155, height: 25, sigma: 14 }
  ],
  'user-management.png': [
    { type: 'blur', left: 105, top: 692, width: 140, height: 58, sigma: 14 },
    { type: 'blur', left: 105, top: 766, width: 150, height: 58, sigma: 14 },
    { type: 'blur', left: 105, top: 838, width: 140, height: 58, sigma: 14 }
  ],
  'sunshine.png': [
    { type: 'blur', left: 190, top: 766, width: 190, height: 44, sigma: 14 }
  ]
};

// Dashboard Privacy definitions
const DASH_PRIVACY = {
  'ai-workspace.png': [
    { type: 'box', left: 360, top: 794, width: 175, height: 20, fill: '#0c0c0e' },
    { type: 'box', left: 360, top: 870, width: 175, height: 20, fill: '#0c0c0e' }
  ],
  'collaboration.png': [
    { type: 'box', left: 385, top: 745, width: 135, height: 26, fill: '#0f0f11' }
  ]
};

async function applyPrivacyFilters(srcPath, filename, privacyMap) {
  const edits = privacyMap[filename];
  if (!edits || edits.length === 0) {
    return sharp(srcPath).toBuffer();
  }

  const composites = [];
  for (const edit of edits) {
    if (edit.type === 'blur') {
      const patch = await sharp(srcPath)
        .extract({ left: edit.left, top: edit.top, width: edit.width, height: edit.height })
        .blur(edit.sigma)
        .toBuffer();
      composites.push({
        input: patch,
        left: edit.left,
        top: edit.top
      });
    } else if (edit.type === 'box') {
      const svg = Buffer.from(
        `<svg width="${edit.width}" height="${edit.height}"><rect width="${edit.width}" height="${edit.height}" fill="${edit.fill}"/></svg>`
      );
      composites.push({
        input: svg,
        left: edit.left,
        top: edit.top
      });
    }
  }

  return sharp(srcPath).composite(composites).toBuffer();
}

async function processSet(srcDir, destDir, privacyMap, fileList) {
  for (const file of fileList) {
    const srcPath = path.join(srcDir, file);
    const baseName = path.parse(file).name;
    console.log(`Processing ${file}...`);

    const cleanedBuffer = await applyPrivacyFilters(srcPath, file, privacyMap);

    // 1600 webp
    const out1600 = path.join(destDir, `${baseName}-1600.webp`);
    await sharp(cleanedBuffer)
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(out1600);

    // 800 webp
    const out800 = path.join(destDir, `${baseName}-800.webp`);
    await sharp(cleanedBuffer)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(out800);

    const s1600 = fs.statSync(out1600).size;
    const s800 = fs.statSync(out800).size;
    console.log(`  -> ${baseName}-1600.webp: ${(s1600 / 1024).toFixed(1)} KB`);
    console.log(`  -> ${baseName}-800.webp: ${(s800 / 1024).toFixed(1)} KB`);
  }
}

async function generateOGImages() {
  console.log('Generating OG images (1200x630)...');

  // PCGO OG: from home.png
  const pcgoCleaned = await applyPrivacyFilters(
    path.join(PCGO_SRC, 'home.png'),
    'home.png',
    PCGO_PRIVACY
  );
  const pcgoOGPath = path.join(PCGO_DEST, 'og.jpg');
  await sharp(pcgoCleaned)
    .resize(1200, 630, { fit: 'cover', position: 'top' })
    .jpeg({ quality: 85 })
    .toFile(pcgoOGPath);
  console.log(`  -> PCGO OG: ${(fs.statSync(pcgoOGPath).size / 1024).toFixed(1)} KB`);

  // Dashboard OG: from dashboard.png
  const dashCleaned = await applyPrivacyFilters(
    path.join(DASH_SRC, 'dashboard.png'),
    'dashboard.png',
    DASH_PRIVACY
  );
  const dashOGPath = path.join(DASH_DEST, 'og.jpg');
  await sharp(dashCleaned)
    .resize(1200, 630, { fit: 'cover', position: 'top' })
    .jpeg({ quality: 85 })
    .toFile(dashOGPath);
  console.log(`  -> Dashboard OG: ${(fs.statSync(dashOGPath).size / 1024).toFixed(1)} KB`);
}

async function run() {
  const pcgoFiles = fs.readdirSync(PCGO_SRC).filter(f => f.endsWith('.png'));
  const dashFiles = fs.readdirSync(DASH_SRC).filter(f => f.endsWith('.png'));

  console.log(`Found ${pcgoFiles.length} PCGO images, ${dashFiles.length} Dashboard images.`);
  await processSet(PCGO_SRC, PCGO_DEST, PCGO_PRIVACY, pcgoFiles);
  await processSet(DASH_SRC, DASH_DEST, DASH_PRIVACY, dashFiles);
  await generateOGImages();
  console.log('All responsive WebPs and OG images generated successfully!');
}

run().catch(console.error);
