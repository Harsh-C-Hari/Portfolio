#!/usr/bin/env node
/**
 * scripts/check-pink.mjs
 * Validates that styles.css adheres to the Pink Accent Policy:
 * "Pink is a spice, not a surface."
 *
 * FAILS if any selector outside the allow-list sets a pink background or background-color.
 *
 * Usage: node scripts/check-pink.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const STYLES_PATH = path.join(ROOT, 'styles.css');

const ALLOWED_SELECTORS = new Set([
  '::selection',
  '.skip-link',
  '.nav__mark',
  '.nav__indicator',
  '.btn--pink',
  '.hl',
  '.ticker__sep',
  '.pt__pink',
  'mark',
  '.wrow__idx',
  '.wrow__idx::before',
  '.doc-sidebar__item',
  '.doc-toc__link',
  '.cs-urgency__dot',
]);

function isAllowed(selector) {
  const trimmed = selector.trim();
  // Direct match
  if (ALLOWED_SELECTORS.has(trimmed)) return true;

  // Suffix/prefix or modifier match (e.g., .contact .btn--pink, .btn--pink:hover, etc.)
  for (const allowed of ALLOWED_SELECTORS) {
    if (trimmed === allowed) return true;
    if (trimmed.startsWith(allowed + ':')) return true;
    if (trimmed.endsWith(' ' + allowed) || trimmed.includes(' ' + allowed + ':')) return true;
    if (trimmed.includes(allowed)) return true;
  }
  return false;
}

export function checkPink(cssContent = null) {
  const content = cssContent || fs.readFileSync(STYLES_PATH, 'utf8');

  // Strip comments
  const stripped = content.replace(/\/\*[\s\S]*?\*\//g, '');

  // Flatten media queries to get rules
  // Simple stateful parser for CSS blocks
  const offenses = [];
  const allowedFound = [];

  let depth = 0;
  let selectorBuffer = '';
  let declBuffer = '';
  let parentSelectors = [];

  let inBlock = false;

  for (let i = 0; i < stripped.length; i++) {
    const char = stripped[i];

    if (char === '{') {
      const header = selectorBuffer.trim();
      selectorBuffer = '';
      if (header.startsWith('@media') || header.startsWith('@supports')) {
        // At-rule wrapper
        parentSelectors.push(header);
      } else {
        parentSelectors.push(header);
        inBlock = true;
      }
      depth++;
    } else if (char === '}') {
      if (inBlock) {
        const fullSelector = parentSelectors.filter(s => !s.startsWith('@')).join(' ').trim();
        const decls = declBuffer.split(';');
        declBuffer = '';
        inBlock = false;

        for (const decl of decls) {
          const colonIdx = decl.indexOf(':');
          if (colonIdx === -1) continue;
          const prop = decl.slice(0, colonIdx).trim().toLowerCase();
          const val = decl.slice(colonIdx + 1).trim();

          // Check if background or background-color sets pink
          if (prop === 'background' || prop === 'background-color') {
            const isPink = val.includes('var(--pink)') || val.includes('#f49cf5') || /\bpink\b/i.test(val);
            if (isPink) {
              // Check each comma-separated selector
              const selectors = fullSelector.split(',').map(s => s.trim());
              for (const sel of selectors) {
                if (isAllowed(sel)) {
                  allowedFound.push({ selector: sel, prop, val });
                } else {
                  offenses.push({ selector: sel, prop, val });
                }
              }
            }
          }
        }
      }
      parentSelectors.pop();
      depth--;
    } else {
      if (inBlock) {
        declBuffer += char;
      } else {
        selectorBuffer += char;
      }
    }
  }

  if (offenses.length > 0) {
    console.error('\n\x1b[31m%s\x1b[0m', '✗ check-pink: Pink Accent Policy violations found!');
    offenses.forEach(o => {
      console.error(`  - Selector: "${o.selector}" sets ${o.prop}: ${o.val}`);
    });
    console.error('\nPink is a spice, not a surface. Selectors setting pink backgrounds must be in the allow-list.');
    return { ok: false, offenses, allowedFound };
  }

  console.log(`✓ check-pink: styles.css adheres to pink accent policy (${allowedFound.length} allowed usages, 0 forbidden).`);
  return { ok: true, offenses: [], allowedFound };
}

// CLI runner
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = checkPink();
  if (!result.ok) {
    process.exit(1);
  }
}
