// Assembles index.html from src/layout.html + src/partials/*.html.
// Same logic as build.py — use whichever runtime you have handy.
//
// Usage: node build.js
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const LAYOUT_PATH = path.join(ROOT, 'src', 'layout.html');
const OUTPUT_PATH = path.join(ROOT, 'index.html');

const INCLUDE_RE = /<!-- include:(\S+?\.html) -->\r?\n/g;

function build() {
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

if (require.main === module) {
  build();
}

module.exports = { build };
