/**
 * scripts/build-docs.mjs
 * Copies the 15 curated PCGO docs into content/pcgo-docs/ and builds
 * /work/pcgo/docs/<slug>/index.html from each one.
 *
 * Must be called from build.js after the case pages are built.
 * Reads data/docs.config.json for the manifest.
 * Uses: markdown-it, markdown-it-anchor, highlight.js (all installed in Phase 0).
 */

import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt   from 'markdown-it';
import mdAnchor     from 'markdown-it-anchor';
import hljs         from 'highlight.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');

/* ----------------------------------------------------------------
   Config
   ---------------------------------------------------------------- */
const CONFIG_PATH   = path.join(ROOT, 'data', 'docs.config.json');
const SOURCE_ROOT   = path.join(ROOT, 'reference', 'personal-cloud-gaming-orchestrator-main', 'docs');
const CONTENT_ROOT  = path.join(ROOT, 'content', 'pcgo-docs');
const DIST          = path.join(ROOT, 'dist');
let   OUTPUT_ROOT   = path.join(DIST, 'work', 'pcgo', 'docs');
const LAYOUT_DOC    = path.join(ROOT, 'src', 'layout-doc.html');
const STYLES_VER    = () => {
  try {
    const p = fs.existsSync(path.join(DIST, 'styles.css')) ? path.join(DIST, 'styles.css') : path.join(ROOT, 'styles.css');
    return fs.statSync(p).mtimeMs.toString(36);
  } catch { return '1'; }
};
const JS_VER        = () => {
  try {
    const p = fs.existsSync(path.join(DIST, 'animation.bundle.js')) ? path.join(DIST, 'animation.bundle.js') : path.join(ROOT, 'animation.bundle.js');
    return fs.statSync(p).mtimeMs.toString(36);
  } catch { return '1'; }
};

/* ----------------------------------------------------------------
   Allowed slugs (from manifest) — keep this in sync automatically
   ---------------------------------------------------------------- */
function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function getAllDocs(config) {
  const docs = [];
  for (const group of config.groups) {
    for (const doc of group.docs) {
      docs.push({ ...doc, groupId: group.id, groupTitle: group.title });
    }
  }
  return docs;
}

/* ----------------------------------------------------------------
   Copy source docs → content/pcgo-docs/
   ---------------------------------------------------------------- */
function copyDocs(allDocs) {
  const copied = [];
  const skipped = [];

  for (const doc of allDocs) {
    const srcPath  = path.join(SOURCE_ROOT, doc.source);
    const destPath = path.join(CONTENT_ROOT, doc.source);

    if (!fs.existsSync(srcPath)) {
      console.warn(`[docs] MISSING source: ${doc.source}`);
      skipped.push(doc.slug);
      continue;
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    copied.push(doc.slug);
  }

  console.log(`[docs] Copied ${copied.length} docs to content/pcgo-docs/`);
  if (skipped.length) console.warn(`[docs] Skipped (missing): ${skipped.join(', ')}`);
  return copied;
}

/* ----------------------------------------------------------------
   Reading time
   ---------------------------------------------------------------- */
function readingTime(text) {
  const words = text.trim().split(/\s+/).length;
  const mins  = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

/* ----------------------------------------------------------------
   Heading normalization
   - Strips the leading H1 and directly following <hr> (if present)
   - Normalizes misleveled headings (e.g. # Release Stabilization Phase, leading ## Overview)
   - Shifts headings so smallest level present becomes h2 (capped at h6)
   ---------------------------------------------------------------- */
function normalizeHeadings(rawMarkdown, docSlug) {
  const lines = rawMarkdown.split('\n');
  let firstH1Removed = false;
  const cleaned = [];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!firstH1Removed && l.trim().startsWith('# ')) {
      firstH1Removed = true;
      // Skip directly following hr if present
      if (i + 1 < lines.length && ['---', '***', '___'].includes(lines[i + 1].trim())) {
        i++;
      }
      continue;
    }
    cleaned.push(l);
  }

  let docText = cleaned.join('\n');

  if (docSlug === 'problems-solved') {
    docText = docText.replace(/^#\s+Release Stabilization Phase\b/m, '## Release Stabilization Phase');
  } else {
    // If doc has body H1s and starts with ## Overview, normalize ## Overview -> # Overview
    // so all top-level sections in the doc are at level 1 before shifting to level 2.
    const hasBodyH1s = docText.split('\n').some(l => l.trim().startsWith('# '));
    if (hasBodyH1s) {
      docText = docText.replace(/^##\s+Overview\b/m, '# Overview');
    }
  }

  // Find minimum heading level in remaining document
  const remainingLines = docText.split('\n');
  let minLevel = 6;
  for (const l of remainingLines) {
    const m = l.match(/^(#{1,6})\s+/);
    if (m) minLevel = Math.min(minLevel, m[1].length);
  }

  if (minLevel === 6) return docText; // no headings

  const shift = 2 - minLevel;
  const shiftedLines = remainingLines.map(l => {
    const m = l.match(/^(#{1,6})(\s+.*)/);
    if (m) {
      const newLevel = Math.min(6, Math.max(2, m[1].length + shift));
      return '#'.repeat(newLevel) + m[2];
    }
    return l;
  });

  return shiftedLines.join('\n');
}

/* ----------------------------------------------------------------
   TOC links builder (h2 entries only for clean scanning)
   ---------------------------------------------------------------- */
function buildTOCLinks(toc) {
  if (!toc || !toc.length) return '';
  const h2Items = toc.filter(item => item.level === 2);
  if (!h2Items.length) return '';
  const items = h2Items.map(({ slug, title }) => {
    return `<li><a href="#${slug}">${escapeHtml(title)}</a></li>`;
  });
  return `<ul>${items.join('')}</ul>`;
}

function buildTOC(env) {
  const links = buildTOCLinks(env.toc);
  if (!links) return '';
  return `<nav class="doc-toc" aria-label="On this page"><h2 class="doc-toc__head">On this page</h2>${links}</nav>`;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ----------------------------------------------------------------
   Link rewriting per docs.config.json linkRewriting rules
   ---------------------------------------------------------------- */
function makeLinkRewriter(config, currentSlugSet) {
  const githubBlobBase = config.githubBlobBase; // ends with /
  const slugToHref = {};
  for (const group of config.groups) {
    for (const doc of group.docs) {
      slugToHref[doc.source] = `/work/pcgo/docs/${doc.slug}`;
    }
  }

  const rewriteLog = [];

  function rewrite(href, sourceFile) {
    // Rule 4: absolute http(s) links — leave alone, mark external
    if (/^https?:\/\//.test(href)) return { href, external: true };

    // Strip anchor
    const [relPath, anchor] = href.split('#');
    const anchorSuffix = anchor ? `#${anchor}` : '';

    if (!relPath) return { href, external: false }; // pure anchor

    // Resolve relative to the source file's directory in docs/
    const sourceDir   = path.dirname(sourceFile).replace(/\\/g, '/');
    const resolved    = path.posix.normalize(`${sourceDir}/${relPath}`);

    // Rule 1: Is it a manifest doc?
    if (slugToHref[resolved]) {
      const dest = slugToHref[resolved] + anchorSuffix;
      rewriteLog.push({ from: href, to: dest, rule: 1 });
      return { href: dest, external: false };
    }

    // Rule 2/3: any other docs/ file or file outside docs/ → GitHub blob
    const githubPath  = githubBlobBase.replace(/\/$/, '') + '/' + resolved;
    rewriteLog.push({ from: href, to: githubPath, rule: 2, external: true });
    return { href: githubPath, external: true };
  }

  return { rewrite, rewriteLog };
}

/* ----------------------------------------------------------------
   Markdown renderer
   ---------------------------------------------------------------- */
function makeRenderer(config, currentSlugSet) {
  const { rewrite, rewriteLog } = makeLinkRewriter(config, currentSlugSet);

  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    highlight: (code, lang) => {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return `<pre class="hljs"><code>${hljs.highlight(code, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
        } catch (_) { /* fall through */ }
      }
      return `<pre class="hljs"><code>${md.utils.escapeHtml(code)}</code></pre>`;
    },
  });

  // Anchor headings + TOC collection (levels 2-6)
  md.use(mdAnchor, {
    level: [2, 3, 4, 5, 6],
    callback: (token, info) => { /* toc built via env below */ },
  });

  // Wrap tables in scrollable div
  const defaultTableOpen  = md.renderer.rules.table_open  || ((t,i,o,e,s) => s.renderToken(t,i,o));
  const defaultTableClose = md.renderer.rules.table_close || ((t,i,o,e,s) => s.renderToken(t,i,o));
  md.renderer.rules.table_open  = (t,i,o,e,s) => '<div class="doc-table-wrap">' + defaultTableOpen(t,i,o,e,s);
  md.renderer.rules.table_close = (t,i,o,e,s) => defaultTableClose(t,i,o,e,s) + '</div>';

  // Rewrite links
  const defaultLinkOpen = md.renderer.rules.link_open || ((t,i,o,e,s) => s.renderToken(t,i,o));
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const hrefIdx = tokens[idx].attrIndex('href');
    if (hrefIdx >= 0) {
      const originalHref = tokens[idx].attrs[hrefIdx][1];
      const sourceFile   = env.sourceFile || '';
      const { href, external } = rewrite(originalHref, sourceFile);
      tokens[idx].attrs[hrefIdx][1] = href;
      if (external) {
        tokens[idx].attrSet('rel', 'noopener noreferrer');
        tokens[idx].attrSet('target', '_blank');
        // Add external marker class
        const classIdx = tokens[idx].attrIndex('class');
        if (classIdx < 0) tokens[idx].attrPush(['class', 'doc-link--external']);
        else tokens[idx].attrs[classIdx][1] += ' doc-link--external';
      }
    }
    return defaultLinkOpen(tokens, idx, options, env, self);
  };

  // Rewrite image tokens where src is a .md file (broken "![text](doc.md)" pattern)
  // Convert these into anchor links instead of broken img tags
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token   = tokens[idx];
    const srcIdx  = token.attrIndex('src');
    if (srcIdx >= 0) {
      const srcVal = token.attrs[srcIdx][1];
      if (srcVal.endsWith('.md') || srcVal.includes('.md#')) {
        // Treat as a link, not an image
        const sourceFile = env.sourceFile || '';
        const { href, external } = rewrite(srcVal, sourceFile);
        const altText = token.children ? token.children.map(t => t.content).join('') : 'Doc link';
        const extAttrs = external ? ' rel="noopener noreferrer" target="_blank"' : '';
        return `<a href="${href}"${extAttrs}>${escapeHtml(altText)} →</a>`;
      }
    }
    return self.renderToken(tokens, idx, options);
  };


  function render(markdown, sourceFile) {
    const env = { sourceFile, toc: [] };
    // Collect headings for TOC by post-processing tokens (h2-h6)
    const tokens = md.parse(markdown, env);
    env.toc = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if ((t.type === 'heading_open') && ['h2','h3','h4','h5','h6'].includes(t.tag)) {
        const inline = tokens[i + 1];
        if (inline && inline.type === 'inline') {
          const title = inline.children.filter(c => c.type === 'text' || c.type === 'code_inline').map(c => c.content).join('');
          const slug  = t.attrGet('id') || title.toLowerCase().replace(/[^\w]+/g, '-');
          env.toc.push({ level: parseInt(t.tag[1], 10), slug, title });
        }
      }
    }
    const html = md.renderer.render(tokens, md.options, env);
    return { html, toc: env.toc };
  }

  return { render, rewriteLog };
}

/* ----------------------------------------------------------------
   Prev / Next navigation
   ---------------------------------------------------------------- */
function prevNextLinks(allDocs, currentSlug) {
  const idx  = allDocs.findIndex(d => d.slug === currentSlug);
  const prev = idx > 0 ? allDocs[idx - 1] : null;
  const next = idx < allDocs.length - 1 ? allDocs[idx + 1] : null;
  const prevHtml = prev ? `<a class="doc-prevnext doc-prevnext--prev" href="/work/pcgo/docs/${prev.slug}"><span class="doc-prevnext__dir"><span class="doc-prevnext__arrow" aria-hidden="true">&larr;</span> Previous</span><span class="doc-prevnext__title">${escapeHtml(prev.title)}</span></a>` : '';
  const nextHtml = next ? `<a class="doc-prevnext doc-prevnext--next" href="/work/pcgo/docs/${next.slug}"><span class="doc-prevnext__dir">Next <span class="doc-prevnext__arrow" aria-hidden="true">&rarr;</span></span><span class="doc-prevnext__title">${escapeHtml(next.title)}</span></a>` : '';
  return `<nav class="doc-prevnext-row" aria-label="Doc navigation">${prevHtml}${nextHtml}</nav>`;
}

/* ----------------------------------------------------------------
   Write one doc page
   ---------------------------------------------------------------- */
function writeDocPage(doc, allDocs, body, toc, config, opts) {
  const { cssVer, jsVer, origin } = opts;
  const layoutSrc = fs.readFileSync(LAYOUT_DOC, 'utf8');

  const canonical  = `${origin}/work/pcgo/docs/${doc.slug}`;
  const pageTitle  = `${doc.title} | PCGO docs | Harsh C Hari`;
  const pageDesc   = doc.summary;
  const navGroup   = allDocs.filter(d => d.groupId === doc.groupId);
  const rt         = readingTime(body);

  // Sidebar doc list
  const sidebarGroups = config.groups.map(g => {
    const items = g.docs.map(d => {
      const active = d.slug === doc.slug ? ' aria-current="page"' : '';
      return `<li><a href="/work/pcgo/docs/${d.slug}"${active}>${escapeHtml(d.title)}</a></li>`;
    }).join('');
    return `<li class="doc-sidebar__group"><span class="doc-sidebar__group-title">${escapeHtml(g.title)}</span><ul>${items}</ul></li>`;
  }).join('');

  const sidebar = `<nav class="doc-sidebar" aria-label="Docs navigation"><a href="/work/pcgo#docs" class="doc-sidebar__back">← Back to PCGO</a><ul class="doc-sidebar__list">${sidebarGroups}</ul></nav>`;

  const prevNext  = prevNextLinks(allDocs, doc.slug);
  const tocLinks  = buildTOCLinks(toc);
  const tocHtml   = tocLinks ? `<nav class="doc-toc" aria-label="On this page"><h2 class="doc-toc__head">On this page</h2>${tocLinks}</nav>` : '';

  const vars = {
    page_title:       pageTitle,
    page_description: pageDesc,
    page_canonical:   canonical,
    page_og_image:    `${origin}/img/work/pcgo/og.jpg`,
    page_slug:        `pcgo-doc-${doc.slug}`,
    page_type:        'doc',
    page_jsonld:      '',
    css_version:      cssVer,
    js_version:       jsVer,
    home:             '/',
    base:             '/',
    doc_title:        escapeHtml(doc.title),
    doc_summary:      escapeHtml(doc.summary),
    doc_reading_time: rt,
    doc_toc:          tocHtml,
    doc_toc_links:    tocLinks,
    doc_sidebar:      sidebar,
    doc_body:         body,
    doc_prevnext:     prevNext,
  };

  let html = layoutSrc;
  for (const [key, val] of Object.entries(vars)) {
    html = html.split(`{{${key}}}`).join(val);
  }
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  const outPath = path.join(OUTPUT_ROOT, doc.slug, 'index.html');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, 'utf8');
}

/* ----------------------------------------------------------------
   Main export
   ---------------------------------------------------------------- */
export function buildDocs(originOverride, outputRootOverride) {
  if (outputRootOverride) {
    OUTPUT_ROOT = outputRootOverride;
  }
  const config    = loadConfig();
  const allDocs   = getAllDocs(config);
  const slugSet   = new Set(allDocs.map(d => d.slug));
  const origin    = originOverride || 'https://harshchari.vercel.app';
  const cssVer    = STYLES_VER();
  const jsVer     = JS_VER();

  // Step 1: Copy source docs
  copyDocs(allDocs);

  // Step 2: Render each doc
  const { render, rewriteLog } = makeRenderer(config, slugSet);
  const built = [];
  const missing = [];
  const headingAudit = [];

  for (const doc of allDocs) {
    const contentPath = path.join(CONTENT_ROOT, doc.source);
    if (!fs.existsSync(contentPath)) {
      missing.push(doc.slug);
      continue;
    }

    const rawMarkdown = fs.readFileSync(contentPath, 'utf8');
    const markdown    = normalizeHeadings(rawMarkdown, doc.slug);
    let { html: body, toc } = render(markdown, doc.source);

    writeDocPage(doc, allDocs, body, toc, config, { cssVer, jsVer, origin });
    built.push(doc.slug);

    // Audit the written page for h1 count and heading outline
    const outPath = path.join(OUTPUT_ROOT, doc.slug, 'index.html');
    const writtenHtml = fs.readFileSync(outPath, 'utf8');
    const h1Count = (writtenHtml.match(/<h1\b[^>]*>/gi) || []).length;

    // Check heading outline for skipped levels
    const headingsInPage = [];
    const headingRe = /<h([1-6])\b[^>]*>(.*?)<\/h\1>/gi;
    let match;
    while ((match = headingRe.exec(writtenHtml)) !== null) {
      headingsInPage.push({ level: parseInt(match[1], 10), title: match[2].replace(/<[^>]+>/g, '').trim() });
    }

    let skipped = 0;
    let prevLevel = 1; // Page title h1 is level 1
    for (const h of headingsInPage) {
      if (h.level > prevLevel + 1) skipped++;
      prevLevel = h.level;
    }

    const levelCounts = {};
    headingsInPage.forEach(h => {
      levelCounts[`h${h.level}`] = (levelCounts[`h${h.level}`] || 0) + 1;
    });
    const outlineSummary = Object.entries(levelCounts).map(([k, v]) => `${k}:${v}`).join(' ');

    headingAudit.push({
      slug: doc.slug,
      h1Count,
      outline: outlineSummary,
      skipped,
    });

    console.log(`[docs] Built /work/pcgo/docs/${doc.slug}`);
  }

  // Print Heading Audit table for all 15 docs
  console.log('\n── Heading Audit (all docs must have exactly 1 h1, no skipped levels) ──');
  for (const item of headingAudit) {
    const status = (item.h1Count === 1 && item.skipped === 0) ? '✓ PASS' : '✗ FAIL';
    console.log(`  ${status}  ${item.slug.padEnd(36)} h1: ${item.h1Count} | ${item.outline} | skipped: ${item.skipped}`);
  }
  console.log('────────────────────────────────────────────────────────────────────────\n');

  // Step 3: Print link-rewrite table
  if (rewriteLog.length) {
    console.log(`\n[docs] Link rewrite table (${rewriteLog.length} links):`);
    for (const entry of rewriteLog) {
      const ruleLabel = entry.rule === 1 ? 'internal' : 'github  ';
      console.log(`  ${ruleLabel}  ${entry.from}  →  ${entry.to}`);
    }
  }

  if (missing.length) console.warn(`[docs] Could not build (missing content): ${missing.join(', ')}`);
  console.log(`\n[docs] Built ${built.length}/${allDocs.length} doc pages.`);

  return { built, missing };
}
