# Portfolio: build and dev setup

Paper-and-ink design: Anton (display), Bricolage Grotesque (reading), Sometype Mono (small data).
One accent colour (`--pink`), used only as a fill behind black or as text on black.
Design tokens live at the top of `styles.css`.

## Accent policy: pink is a spice, not a surface

| | Rule |
|---|---|
| Budget | At rest, pink covers no more than ~2% of the viewport. During hover, no more than ~4%. No single pink-filled element larger than 20,000 px² (about 140 x 140), except the page-transition cover (transient motion). |
| Allowed | Text marker highlight (height no more than 0.38em, behind a word or title) · small chips and badges (nav current item, tags) · 2 to 4px rules, underlines, progress bar · the single primary button per view (existing `.btn--pink`, about 140 x 52) · the existing hero `.hl` signature highlight (one per page, kept as is) · text selection · a tiny arrow chip (<= 44px) on hover |
| Forbidden | Pink backgrounds on rows, cards, sections or bands · hover fills on any container · pink behind more than one line of body text |
| Hover vocabulary instead | Ink underline draw · title nudge 8 to 12px · offset ink shadow (the site's existing 4px shadow language) · ink border · sibling dimming · arrow nudge · a thin pink marker. |

## Structure

```
portfolio/
├── src/
│   ├── layout.html          <- home page shell
│   ├── layout-page.html     <- case study page shell
│   ├── layout-doc.html      <- docs reader page shell
│   ├── partials/            <- nav, footer, hero, work, about, etc.
│   └── projects/            <- one .html per case study (body content only)
│       ├── pcgo.html
│       └── productivity-dashboard.html
├── data/
│   ├── projects.json        <- source of truth for all project metadata
│   └── docs.config.json     <- curated list of 15 PCGO docs to publish
├── content/
│   └── pcgo-docs/           <- GENERATED: copies of source docs (do not hand-edit)
├── fonts/                   <- self-hosted variable and mono webfonts (WOFF2)
├── scripts/
│   ├── build-docs.mjs       <- docs pipeline: copy, render, rewrite links
│   ├── check-links.mjs      <- internal link checker
│   ├── check-pink.mjs       <- pink accent budget enforcer
│   ├── check-leaks.mjs      <- secrets and denylist scanner
│   ├── verify-deploy.mjs    <- staging deployment simulator
│   └── qa.mjs               <- Playwright device matrix, throttling & a11y suite
├── dist/                    <- GENERATED publish directory (do not hand-edit)
│   ├── index.html
│   ├── sitemap.xml
│   ├── styles.css
│   ├── animation.bundle.js
│   └── work/
│       ├── pcgo/index.html
│       ├── productivity-dashboard/index.html
│       └── pcgo/docs/<slug>/index.html  (×15)
├── animation.js             <- all motion (GSAP + Lenis), bundled by esbuild
├── styles.css
├── build.js                 <- assembles all pages into dist/ + bundles animation.js
└── dev.js                   <- live dev server
```

## Develop

```
npm install
npm run dev      # http://localhost:3000, rebuilds on any save
```

## Build & Deploy

```
npm run build
npm run check           # runs check-links, check-pink, and check-leaks
npm run verify-deploy   # simulates staging build matching Vercel deployment
npm test                # runs full Playwright QA suite
BUILD_STRICT=1 npm run build   # fails on any CONFIRM_WITH_HARSH placeholder
```

Vercel and Netlify publish from the `dist/` directory via `node build.js`. The build adds a content hash to
`styles.css?v=` and `animation.bundle.js?v=`, so the one-year immutable cache in
`vercel.json` and `netlify.toml` can never serve stale files after a change.

## How the work pages are built

### Data files

All project metadata lives in `data/projects.json`. Each entry can have:
- `page.href` — the URL path (e.g. `/work/pcgo`). When present, `build.js` generates the page.
- `page.title` / `page.description` — used for `<title>`, meta description, and OG tags.

The corresponding page body must exist at `src/projects/<slug>.html`.

### Adding a project

1. Add an entry to `data/projects.json` with a `page` object.
2. Create `src/projects/<slug>.html` (body content only, no `<html>/<head>/<body>`).
3. Run `npm run build`. The page appears at `work/<slug>/index.html`.

### Adding a PCGO doc

1. Add the doc to `data/docs.config.json` under the correct group with `source`, `slug`, `title`, and `summary`.
2. The source file must exist in `reference/personal-cloud-gaming-orchestrator-main/docs/`.
3. Run `npm run build`. The doc appears at `work/pcgo/docs/<slug>/index.html` and is linked in the sidebar.

### Replacing a screenshot

Use a **new filename** when replacing a screenshot (immutable cache). Place the file in the repo root (same level as `index.html`), update the `src` attribute in the relevant `src/projects/*.html`, and rebuild.

### Converting images

Images should be `.webp` for web delivery. If you need to convert:
```
node scripts/images.mjs   # (if present) converts and resizes source images
```

## QA

```
npm run check-links   # verifies 0 broken internal links across all generated pages
```

## Motion budget

1. Page load: counter loader (first visit per session only), hero words rise, highlighter wipes in.
2. Work: accordion with grid-row height animation, hover-intent on fine pointers.
3. About: the statement fills in letter by letter as you read.
4. Page transitions: two-layer cover (pink then ink) on navigation between pages.

Everything else answers an action. `prefers-reduced-motion` disables all of it.
