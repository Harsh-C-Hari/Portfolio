# Portfolio: build and dev setup

Paper-and-ink design: Anton (display), Bricolage Grotesque (reading), Sometype Mono (small data).
One accent colour (`--pink`), used only as a fill behind black or as text on black.
Design tokens live at the top of `styles.css`.

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
├── scripts/
│   ├── build-docs.mjs       <- docs pipeline: copy, render, rewrite links
│   └── check-links.mjs      <- internal link checker (run after build)
├── work/                    <- GENERATED: all sub-pages (do not hand-edit)
│   ├── pcgo/index.html
│   ├── productivity-dashboard/index.html
│   └── pcgo/docs/<slug>/index.html  (×15)
├── animation.js             <- all motion (GSAP + Lenis), bundled by esbuild
├── styles.css
├── build.js                 <- assembles all pages + bundles animation.js
├── dev.js                   <- live dev server
├── sitemap.xml              <- GENERATED
├── index.html               <- GENERATED, do not hand-edit
└── animation.bundle.js      <- GENERATED
```

## Develop

```
npm install
npm run dev      # http://localhost:3000, rebuilds on any save
```

## Build

```
npm run build
BUILD_STRICT=1 npm run build   # fails on any CONFIRM_WITH_HARSH placeholder
```

Vercel runs `npm install && node build.js` on deploy. The build adds a content hash to
`styles.css?v=` and `animation.bundle.js?v=`, so the one-year immutable cache in
`vercel.json` can never serve stale files after a change.

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
