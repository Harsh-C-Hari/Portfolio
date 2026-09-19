# Portfolio: build and dev setup

Paper-and-ink design: Anton (display), Bricolage Grotesque (reading), Sometype Mono (small data).
One accent colour (`--pink`), used only as a fill behind black or as text on black.
Design tokens live at the top of `styles.css`.

## Structure

```
portfolio/
├── src/
│   ├── layout.html          <- page shell: <head>, includes
│   └── partials/
│       ├── loader.html      <- intro counter
│       ├── nav.html
│       ├── hero.html
│       ├── ticker.html
│       ├── work.html        <- the four project cards (edit copy/stats here)
│       ├── about.html
│       ├── skills.html
│       ├── contact.html
│       └── footer.html
├── animation.js             <- all motion (GSAP + Lenis), bundled by esbuild
├── styles.css
├── build.js                 <- assembles index.html + bundles animation.js
├── dev.js                   <- live dev server
├── build.py                 <- HTML-only build (does NOT bundle JS)
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
```

Vercel runs `npm install && node build.js` on deploy. The build adds a content hash to
`styles.css?v=` and `animation.bundle.js?v=`, so the one-year immutable cache in
`vercel.json` can never serve stale files after a change.

## Motion budget

1. Page load: counter loader (first visit per session only), hero words rise, highlighter wipes in.
2. Work: project cards stack on scroll (CSS `position: sticky`, plus a small scale-back).
3. About: the statement fills in letter by letter as you read.

Everything else answers an action. `prefers-reduced-motion` disables all of it.
