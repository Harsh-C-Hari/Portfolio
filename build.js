// Assembles index.html from src/layout.html + src/partials/*.html,
// then bundles animation.js -> animation.bundle.js via esbuild.
//
// Usage: node build.js
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const LAYOUT_PATH = path.join(ROOT, 'src', 'layout.html');
const OUTPUT_PATH = path.join(ROOT, 'index.html');

const INCLUDE_RE = /<!-- include:(\S+?\.html) -->\r?\n/g;

// styles.css and animation.bundle.js are served with a one-year immutable cache
// (see vercel.json), so their URLs must change whenever their content does.
function versionOf(file) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) return '0';
  return crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex').slice(0, 8);
}

function assembleHTML() {
  const layout = fs.readFileSync(LAYOUT_PATH, 'utf8');

  let assembled = layout.replace(INCLUDE_RE, (match, relPath) => {
    const partialPath = path.join(ROOT, relPath);
    if (!fs.existsSync(partialPath)) {
      throw new Error(`Partial not found: ${partialPath}`);
    }
    return fs.readFileSync(partialPath, 'utf8');
  });

  assembled = assembled
    .replace('href="styles.css"', `href="styles.css?v=${versionOf('styles.css')}"`)
    .replace('src="animation.bundle.js"', `src="animation.bundle.js?v=${versionOf('animation.bundle.js')}"`);

  fs.writeFileSync(OUTPUT_PATH, assembled, 'utf8');
  console.log(`Built ${OUTPUT_PATH} (${Buffer.byteLength(assembled, 'utf8')} bytes)`);
}

async function bundleJS() {
  // esbuild bundles animation.js (with GSAP + Lenis imports) into one file.
  // Falls back gracefully if animation.js doesn't exist yet (Phase 1 bootstrap).
  const animSrc = path.join(ROOT, 'animation.js');
  if (!fs.existsSync(animSrc)) {
    console.log('animation.js not found — skipping JS bundle (run again after Phase 3)');
    return;
  }
  try {
    const esbuild = require('esbuild');
    await esbuild.build({
      entryPoints: [animSrc],
      bundle: true,
      minify: true,
      format: 'iife',
      outfile: path.join(ROOT, 'animation.bundle.js'),
      define: { 'process.env.NODE_ENV': '"production"' },
    });
    console.log('Bundled animation.bundle.js');
  } catch (err) {
    console.error('esbuild failed:', err.message);
    process.exit(1);
  }
}

async function build() {
  await bundleJS(); // first, so the HTML can reference the bundle's content hash
  assembleHTML();
}

if (require.main === module) {
  build().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { build };
