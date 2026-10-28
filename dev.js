// Dev workflow: rebuilds on every source change and auto-refreshes the browser.
// Watches: src/**, data/**, content/**, styles.css, animation.js
//
// Usage: npm run dev
'use strict';

const browserSync = require('browser-sync');
const { build }   = require('./build');

const bs = browserSync.create();

// Build once up front so all output files are fresh when the server starts.
build().catch((err) => console.error(err));

bs.init({
  server: {
    baseDir: __dirname,
  },
  files:     ['styles.css', 'animation.bundle.js'],
  open:      false,
  notify:    false,
  ui:        false,
  logLevel:  'info',
});

// usePolling makes this reliable on every filesystem (network drives, WSL, VMs).
bs.watch(
  [
    'src/**/*.html',
    'src/**/*.svg',
    'data/**/*.json',
    'content/**/*.md',
    'styles.css',
    'animation.js',
  ],
  { usePolling: true, interval: 150 }
).on('change', async (file) => {
  try {
    await build();
    bs.reload();
  } catch (err) {
    console.error(`Build failed after change to ${file}:`, err.message);
  }
});
