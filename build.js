// Assembles index.html from src/layout.html + src/partials/*.html,
// then bundles animation.js -> animation.bundle.js via esbuild.
// Also generates case-study pages from layout-page.html + src/projects/*.html.
// Also generates /work/pcgo/docs/<slug> pages from scripts/build-docs.mjs.
//
// Template variables available in any included partial or layout:
//   {{home}}  - empty string on home page, "/" on every sub-page
//   {{base}}  - always "/" (for root-absolute assets)
//
// Usage: node build.js
//        BUILD_STRICT=1 node build.js   <- fails on any CONFIRM_WITH_HARSH
'use strict';

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT          = __dirname;
const DIST          = path.join(ROOT, 'dist');
const LAYOUT_HOME   = path.join(ROOT, 'src', 'layout.html');
const LAYOUT_PAGE   = path.join(ROOT, 'src', 'layout-page.html');
const OUTPUT_HOME   = path.join(DIST, 'index.html');
const DATA_PROJECTS = path.join(ROOT, 'data', 'projects.json');

const INCLUDE_RE  = /<!-- include:(\S+?\.html) -->\r?\n/g;
const VAR_RE      = /\{\{(\w+)\}\}/g;

const STRICT = process.env.BUILD_STRICT === '1';

// Collect warnings across the build; printed at the end.
const warnings = [];

/* ----------------------------------------------------------------
   Helpers
   ---------------------------------------------------------------- */

function versionOf(file) {
  const pDist = path.join(DIST, file);
  const pRoot = path.join(ROOT, file);
  const p = fs.existsSync(pDist) ? pDist : pRoot;
  if (!fs.existsSync(p)) return '0';
  return crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex').slice(0, 8);
}

/**
 * Replace <!-- include:path --> directives, recursively, then substitute
 * {{variable}} placeholders from the given vars map.
 */
function assemble(templatePath, vars = {}) {
  const raw = fs.readFileSync(templatePath, 'utf8');
  // Replace includes
  let html = raw.replace(INCLUDE_RE, (match, relPath) => {
    const abs = path.join(ROOT, relPath);
    if (!fs.existsSync(abs)) throw new Error(`Partial not found: ${abs}`);
    return fs.readFileSync(abs, 'utf8');
  });
  // Replace variables
  html = html.replace(VAR_RE, (_, name) => {
    if (name in vars) return vars[name];
    return `{{${name}}}`; // leave unknown vars as-is (don't swallow them)
  });
  return html;
}

function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  if (filePath.endsWith('.html')) {
    content = stripComments(content);
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

function copyDir(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const STATIC_ROOT_FILES = [
  'harsh-portrait.webp',
  'image-1.webp',
  'image-2.webp',
  'image-prodash.webp',
  'admin_home_page.webp',
  'og-image-2.jpg',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'favicon-48x48.png',
  'favicon.ico',
  'apple-touch-icon.png',
  'resume.pdf',
  'robots.txt',
  'google371b688b56727e4a.html',
];

function copyStaticAssets() {
  ensureDir(DIST);
  // 1. styles.css (minified)
  const esbuild = require('esbuild');
  const rawCss = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  const minCss = esbuild.transformSync(rawCss, { loader: 'css', minify: true }).code;
  fs.writeFileSync(path.join(DIST, 'styles.css'), minCss, 'utf8');

  // 2. img/ directory
  const imgDir = path.join(ROOT, 'img');
  if (fs.existsSync(imgDir)) {
    copyDir(imgDir, path.join(DIST, 'img'));
  }

  // 2b. fonts/ directory
  const fontsDir = path.join(ROOT, 'fonts');
  if (fs.existsSync(fontsDir)) {
    copyDir(fontsDir, path.join(DIST, 'fonts'));
  }

  // 3. Static root assets
  for (const file of STATIC_ROOT_FILES) {
    const srcPath = path.join(ROOT, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, path.join(DIST, file));
    }
  }
}

/* ----------------------------------------------------------------
   Load and validate projects.json
   ---------------------------------------------------------------- */
function loadProjects() {
  if (!fs.existsSync(DATA_PROJECTS)) {
    console.warn('[build] WARNING: data/projects.json not found — skipping project data');
    return [];
  }
  const raw = JSON.parse(fs.readFileSync(DATA_PROJECTS, 'utf8'));
  const projects = raw.projects || [];

  projects.forEach((p) => {
    // Warn on any CONFIRM_WITH_HARSH value anywhere in the project object
    const scan = (obj, path2) => {
      if (typeof obj === 'string' && obj.includes('CONFIRM_WITH_HARSH')) {
        const msg = `[CONFIRM_WITH_HARSH] ${path2}: "${obj}"`;
        warnings.push(msg);
        console.warn('\x1b[33m%s\x1b[0m', `⚠  ${msg}`);
      } else if (Array.isArray(obj)) {
        obj.forEach((item, i) => scan(item, `${path2}[${i}]`));
      } else if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([k, v]) => scan(v, `${path2}.${k}`));
      }
    };
    scan(p, `projects[${p.slug}]`);
  });

  return projects;
}

/* ----------------------------------------------------------------
   JS bundle
   ---------------------------------------------------------------- */
async function bundleJS() {
  const animSrc = path.join(ROOT, 'animation.js');
  if (!fs.existsSync(animSrc)) {
    console.log('animation.js not found — skipping JS bundle');
    return;
  }
  try {
    const esbuild = require('esbuild');
    ensureDir(DIST);
    await esbuild.build({
      entryPoints: [animSrc],
      bundle: true,
      minify: true,
      format: 'iife',
      outfile: path.join(DIST, 'animation.bundle.js'),
      define: { 'process.env.NODE_ENV': '"production"' },
    });
    console.log('Bundled dist/animation.bundle.js');
  } catch (err) {
    console.error('esbuild failed:', err.message);
    process.exit(1);
  }
}

/* ----------------------------------------------------------------
   Work list HTML (generated from projects.json into work.html)
   ---------------------------------------------------------------- */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateWorkRows(projects) {
  return projects.map((p, idx) => {
    const hasPage     = !!p.page;
    const primaryHref = hasPage ? p.page.href : (p.links[0]?.href || '#');
    const isExternal  = !hasPage;
    const goLabel     = hasPage ? 'Case study <span aria-hidden="true">&rarr;</span>' : `${esc(p.links[0]?.label || 'GitHub')} <span aria-hidden="true">&#x2197;</span>`;
    const extAttrs    = isExternal ? ' rel="noopener" target="_blank"' : '';
    const labelAttr   = hasPage ? ` data-pt-label="${esc(p.shortTitle || p.title)}"` : '';
    const isActive    = idx === 0 ? ' is-active' : '';

    // Live link (for projects with pages that also have an external live link)
    const liveLink = p.links?.find(l => l.external && l.label !== 'GitHub');
    const liveLinkHtml = liveLink
      ? `\n        <a class="wrow__action-link wrow__live" href="${esc(liveLink.href)}" target="_blank" rel="noopener">Live <span aria-hidden="true">&#x2197;</span></a>`
      : '';

    // Mobile thumbnail (uses existing thumb or preview)
    const t = p.thumb || p.preview;
    const thumbSrc = t ? esc(t.src) : '';

    return `<li class="wrow${isActive}" data-slug="${esc(p.slug)}">
  <div class="wrow__grid">
    <span class="wrow__idx">${esc(p.index)}</span>
    <div class="wrow__content">
      <h3 class="wrow__title-wrap">
        <a class="wrow__title-link" href="${esc(primaryHref)}"${extAttrs}${labelAttr}>
          <span class="wrow__title">${esc(p.title)}</span>
        </a>
      </h3>
      <p class="wrow__tagline">${esc(p.tagline || '')}</p>
      <div class="wrow__kind-mobile">${esc(p.kind)}</div>
    </div>
    <div class="wrow__thumb-wrap" aria-hidden="true">
      <img class="wrow__thumb" src="${thumbSrc}" alt="" width="88" height="55" loading="lazy" decoding="async">
    </div>
    <div class="wrow__actions">
      <a class="wrow__action-link" href="${esc(primaryHref)}"${extAttrs}${labelAttr}>${goLabel}</a>${liveLinkHtml}
    </div>
  </div>
</li>`;
  }).join('\n\n');
}

/* Stacked <img> per project for the sticky preview panel. */
function generatePanelPreviews(projects) {
  return projects.map((p, idx) => {
    const pv = p.preview;
    if (!pv) return '';
    const isActive = idx === 0 ? ' is-active' : '';
    const loading = idx === 0 ? 'loading="eager"' : 'loading="lazy"';
    return `<img class="wpanel__img${isActive}" data-slug="${esc(p.slug)}" src="${esc(pv.src)}" alt="${esc(p.title)} preview" width="${pv.width}" height="${pv.height}" ${loading} decoding="async">`;
  }).join('\n          ');
}

/* Fixed caption items for the sticky preview panel. */
function generatePanelCaptions(projects) {
  return projects.map((p, idx) => {
    const isActive = idx === 0 ? ' is-active' : '';
    const hasPage = !!p.page;
    const primaryHref = hasPage ? p.page.href : (p.links[0]?.href || '#');
    const isExternal = !hasPage;
    const extAttrs = isExternal ? ' rel="noopener" target="_blank"' : '';
    const labelAttr = hasPage ? ` data-pt-label="${esc(p.shortTitle || p.title)}"` : '';
    const goLabel = hasPage ? 'Case study &rarr;' : `${esc(p.links[0]?.label || 'GitHub')} &#x2197;`;
    const fullStack = (p.stack || []).join(' · ');

    return `<div class="wpanel__caption-item${isActive}" data-slug="${esc(p.slug)}">
  <div class="wpanel__kind">${esc(p.kind)}</div>
  <div class="wpanel__stack">${esc(fullStack)}</div>
  <a class="wpanel__action" href="${esc(primaryHref)}"${extAttrs}${labelAttr}>${goLabel}</a>
</div>`;
  }).join('\n          ');
}

/* ----------------------------------------------------------------
   Home page (index.html)
   ---------------------------------------------------------------- */
function buildHome(projects) {
  const vars = {
    home:                 '',   // on home, hash links are just #section
    base:                 '/',
    work_rows:            generateWorkRows(projects),
    work_panel_previews:  generatePanelPreviews(projects),
    work_panel_captions:  generatePanelCaptions(projects),
  };

  let html = assemble(LAYOUT_HOME, vars);

  // Cache-bust versioned assets
  html = html
    .replace('href="/styles.css"',        `href="/styles.css?v=${versionOf('styles.css')}"`)
    .replace('src="/animation.bundle.js"',`src="/animation.bundle.js?v=${versionOf('animation.bundle.js')}"`);

  writeFile(OUTPUT_HOME, html);
  console.log(`Built ${OUTPUT_HOME} (${Buffer.byteLength(html, 'utf8')} bytes)`);
  return html;
}

/* ----------------------------------------------------------------
   Case-study pages  (/work/<slug>/index.html)
   ---------------------------------------------------------------- */
function buildCasePages(projects) {
  // Derive site origin from the canonical tag in layout.html
  const layoutSrc  = fs.readFileSync(LAYOUT_HOME, 'utf8');
  const originMatch = layoutSrc.match(/rel="canonical"\s+href="(https?:\/\/[^/"]+)/);
  const origin      = originMatch ? originMatch[1] : 'https://harshchari.vercel.app';

  if (!fs.existsSync(LAYOUT_PAGE)) {
    console.log('[build] layout-page.html not found — skipping case pages (Phase 1 placeholder)');
    return;
  }

  const pagesBuilt = [];

  projects.forEach((project) => {
    if (!project.page) return; // no case page for this project

    const slug    = project.slug;
    const bodyPath = path.join(ROOT, 'src', 'projects', `${slug}.html`);
    if (!fs.existsSync(bodyPath)) {
      console.log(`[build] src/projects/${slug}.html not found — skipping /work/${slug}`);
      return;
    }

    const pageHref   = `${origin}/work/${slug}`;
    const ogImage    = `${origin}/img/work/${slug}/og.jpg`;
    const title      = project.page?.title || `${project.title}: case study | Harsh C Hari`;
    const desc       = project.page?.description || project.summary || '';
    const bodyHtml   = fs.readFileSync(bodyPath, 'utf8');

    const pagePreload = slug === 'pcgo'
      ? '<link rel="preload" as="image" imagesrcset="/img/work/pcgo/home-800.webp 800w, /img/work/pcgo/home-1600.webp 1600w" imagesizes="(max-width: 600px) 300px, (max-width: 1200px) 100vw, 1200px" fetchpriority="high">'
      : '';

    const vars = {
      home:             '/',
      base:             '/',
      page_type:        'case',
      page_title:       title,
      page_description: desc,
      page_canonical:   pageHref,
      page_og_image:    ogImage,
      page_slug:        slug,
      page_body:        bodyHtml,
      page_jsonld:      '',
      page_preload:     pagePreload,
      css_version:      versionOf('styles.css'),
      js_version:       versionOf('animation.bundle.js'),
    };

    let html = assemble(LAYOUT_PAGE, vars);

    const outPath = path.join(DIST, 'work', slug, 'index.html');
    writeFile(outPath, html);
    pagesBuilt.push(`/work/${slug}`);
    console.log(`Built /work/${slug} (${Buffer.byteLength(html, 'utf8')} bytes)`);
  });

  return pagesBuilt;
}

/* ----------------------------------------------------------------
   Summary / strict mode
   ---------------------------------------------------------------- */
function printSummary(pagesBuilt = []) {
  console.log('\n── Build summary ─────────────────────────────');
  console.log(`  Home page:   index.html`);
  if (pagesBuilt.length) {
    pagesBuilt.forEach((p) => console.log(`  Case page:   ${p}`));
  }
  if (warnings.length) {
    console.log(`\n  ⚠  ${warnings.length} CONFIRM_WITH_HARSH warning(s):`);
    warnings.forEach((w) => console.log(`     ${w}`));
  } else {
    console.log('  ✓  No CONFIRM_WITH_HARSH warnings');
  }
  console.log('──────────────────────────────────────────────\n');

  if (STRICT && warnings.length) {
    console.error('[BUILD_STRICT] Build failed: unresolved CONFIRM_WITH_HARSH values.');
    process.exit(1);
  }
}

/* ----------------------------------------------------------------
   Main
   ---------------------------------------------------------------- */
async function build() {
  ensureDir(DIST);
  copyStaticAssets();
  await bundleJS();           // JS first so HTML can hash the bundle
  const projects   = loadProjects();
  buildHome(projects);
  const pagesBuilt = buildCasePages(projects) || [];

  // Resolve origin from the home layout's canonical tag
  const ORIGIN = (() => {
    try {
      const m = fs.readFileSync(LAYOUT_HOME, 'utf8').match(/rel="canonical"\s+href="(https?:\/\/[^/"]+)/);
      return m ? m[1] : 'https://harshchari.vercel.app';
    } catch { return 'https://harshchari.vercel.app'; }
  })();

  // Phase 6: PCGO docs reader
  try {
    const { buildDocs } = await import('./scripts/build-docs.mjs');
    const { built }    = await buildDocs(ORIGIN, path.join(DIST, 'work', 'pcgo', 'docs'));
    built.forEach((slug) => pagesBuilt.push(`/work/pcgo/docs/${slug}`));
  } catch (err) {
    console.warn(`[build] Docs build skipped: ${err.message}`);
  }

  // Sitemap
  const now  = new Date().toISOString().split('T')[0];
  const urls = ['', ...pagesBuilt].map(p => {
    const loc = p === '' ? ORIGIN + '/' : ORIGIN + p;
    return `  <url><loc>${loc}</loc><lastmod>${now}</lastmod></url>`;
  }).join('\n');
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemapXml, 'utf8');
  console.log(`[build] sitemap.xml written (${1 + pagesBuilt.length} URLs)`);

  printSummary(pagesBuilt);
}

if (require.main === module) {
  build().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { build };
