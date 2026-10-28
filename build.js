// Assembles index.html from src/layout.html + src/partials/*.html,
// then bundles animation.js -> animation.bundle.js via esbuild.
// Also generates case-study pages from layout-page.html + src/projects/*.html.
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

const ROOT        = __dirname;
const LAYOUT_HOME = path.join(ROOT, 'src', 'layout.html');
const LAYOUT_PAGE = path.join(ROOT, 'src', 'layout-page.html');
const OUTPUT_HOME = path.join(ROOT, 'index.html');
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
  const p = path.join(ROOT, file);
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

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
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
  return projects.map((p, i) => {
    const hasPage  = !!p.page;
    const isFirst  = i === 0;
    // Primary link: page href if it has a case study, else first external link
    const primaryHref = hasPage ? p.page.href : (p.links[0]?.href || '#');
    const ctaLabel    = hasPage ? `${p.page.cta} →` : `${p.links[0]?.label || 'GitHub'} ↗`;
    const ctaExternal = !hasPage;

    // Facts dl items (up to 4, 2×2 grid on desktop)
    const factsHtml = (p.facts || []).map(f =>
      `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`
    ).join('\n            ');

    // Stack chips
    const stackHtml = (p.stack || []).map(s =>
      `<li>${esc(s)}</li>`
    ).join('');

    // Secondary links (all links except the primary for rows with pages;
    // for no-page rows, already using links[0] as CTA so show the rest)
    const secondaryLinks = hasPage
      ? p.links
      : p.links.slice(1);
    const linksHtml = secondaryLinks.length
      ? secondaryLinks.map(l =>
          `<a class="btn" href="${esc(l.href)}"${l.external ? ' rel="noopener" target="_blank"' : ''}>${esc(l.label)} ↗</a>`
        ).join('\n          ')
      : '';

    // Thumb
    const t = p.thumb;
    const thumbEl = t
      ? `<a class="wrow__thumb" href="${esc(primaryHref)}"${ctaExternal ? ' rel="noopener" target="_blank"' : ''} tabindex="-1" aria-hidden="true">
          <img src="${esc(t.src)}" alt="${esc(t.alt)}" width="${t.width}" height="${t.height}" loading="lazy" decoding="async">
        </a>`
      : '';

    return `<article class="wrow" data-open="${isFirst}" data-has-page="${hasPage}">
  <h3 class="wrow__head">
    <a class="wrow__link" href="${esc(primaryHref)}"${ctaExternal ? ' rel="noopener" target="_blank"' : ''}>
      <span class="wrow__idx">${esc(p.index)}</span>
      <span class="wrow__title">${esc(p.title)}</span>
    </a>
    <span class="wrow__kind">${esc(p.kind)}</span>
    <a class="btn wrow__cta" href="${esc(primaryHref)}"${ctaExternal ? ' rel="noopener" target="_blank"' : ''}>${esc(ctaLabel)}</a>
  </h3>
  <div class="wrow__panel"${isFirst ? '' : ' inert'}>
    <div class="wrow__body">
      <p class="wrow__summary">${esc(p.summary)}</p>
      <dl class="wrow__facts">
        ${factsHtml}
      </dl>
      <ul class="wrow__stack">${stackHtml}</ul>
      ${linksHtml ? `<div class="wrow__links">${linksHtml}</div>` : ''}
    </div>
    ${thumbEl}
  </div>
</article>`;
  }).join('\n\n');
}

/* ----------------------------------------------------------------
   Home page (index.html)
   ---------------------------------------------------------------- */
function buildHome(projects) {
  const vars = {
    home:      '',   // on home, hash links are just #section
    base:      '/',
    work_rows: generateWorkRows(projects),
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
      css_version:      versionOf('styles.css'),
      js_version:       versionOf('animation.bundle.js'),
    };

    let html = assemble(LAYOUT_PAGE, vars);

    const outPath = path.join(ROOT, 'work', slug, 'index.html');
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
  const projects   = loadProjects();
  await bundleJS();           // JS first so HTML can hash the bundle
  buildHome(projects);
  const pagesBuilt = buildCasePages(projects) || [];
  printSummary(pagesBuilt);
}

if (require.main === module) {
  build().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { build };
