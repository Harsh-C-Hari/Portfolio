/**
 * scripts/gen-previews.mjs
 * Center-crop each project thumbnail to 16:10 at 760px wide, quality 80.
 * Output: img/work/previews/<slug>-760.webp  (new filenames, immutable-cacheable)
 * Usage:  node scripts/gen-previews.mjs
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT  = path.join(ROOT, 'img', 'work', 'previews');
fs.mkdirSync(OUT, { recursive: true });

const W = 760, H = 380; // 2:1

const sources = [
  { slug: 'pcgo',                    src: 'admin_home_page.webp'  },
  { slug: 'productivity-dashboard',  src: 'image-prodash.webp'    },
  { slug: 'future-of-cec',           src: 'image-2.webp'          },
  { slug: 'smart-farming-dashboard', src: 'image-1.webp'          },
];

let ok = 0;
for (const { slug, src } of sources) {
  const full = path.join(ROOT, src);
  if (!fs.existsSync(full)) { console.error(`[previews] MISSING: ${src}`); continue; }
  const out = path.join(OUT, `${slug}-760.webp`);
  await sharp(full)
    .resize(W, H, { fit: 'cover', position: 'left top' })
    .webp({ quality: 80 })
    .toFile(out);
  const kb = Math.round(fs.statSync(out).size / 1024);
  console.log(`[previews] img/work/previews/${slug}-760.webp  (${kb} KB)`);
  ok++;
}
console.log(`[previews] Done: ${ok}/${sources.length}`);

