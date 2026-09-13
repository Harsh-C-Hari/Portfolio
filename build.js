// Assembles index.html from src/layout.html + src/partials/*.html,
// then bundles animation.js -> animation.bundle.js via esbuild.
//
// Usage: node build.js
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const LAYOUT_PATH = path.join(ROOT, 'src', 'layout.html');
const OUTPUT_PATH = path.join(ROOT, 'index.html');

const INCLUDE_RE = /<!-- include:(\S+?\.html) -->\r?\n/g;

function assembleHTML() {
  const layout = fs.readFileSync(LAYOUT_PATH, 'utf8');

  const assembled = layout.replace(INCLUDE_RE, (match, relPath) => {
    const partialPath = path.join(ROOT, relPath);
    if (!fs.existsSync(partialPath)) {
      throw new Error(`Partial not found: ${partialPath}`);
    }
    return fs.readFileSync(partialPath, 'utf8');
  });

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
  assembleHTML();
  await bundleJS();
}

if (require.main === module) {
  build().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { build };
