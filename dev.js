// Dev workflow: rebuilds index.html the instant you save a partial, and
// auto-refreshes the browser tab. No manual `npm run build` needed while
// you're actively editing.
//
// Usage: npm run dev
'use strict';

const browserSync = require('browser-sync');
const { build } = require('./build');

const bs = browserSync.create();

// Build once up front so index.html is fresh when the server starts.
build().catch((err) => console.error(err));

bs.init({
  server: {
    baseDir: __dirname
  },
  files: ['styles.css', 'animation.bundle.js'], // reload automatically when these change
  open: false,
  notify: false,
  ui: false,
  logLevel: 'info'
});

// usePolling makes this reliable on every filesystem (network drives, some
// containers/VMs and WSL setups don't deliver native file-change events).
// It costs a little CPU but the interval is short enough to feel instant.
bs.watch(['src/layout.html', 'src/partials/*.html', 'styles.css', 'animation.js'], { usePolling: true, interval: 150 }).on('change', async (file) => {
  try {
    await build();
    bs.reload();
  } catch (err) {
    console.error(`Build failed after change to ${file}:`, err.message);
  }
});
