# Portfolio — build & dev setup

## Structure

```
portfolio/
├── src/
│   ├── layout.html          ← page shell: <head>, nav/main/footer scaffolding
│   └── partials/
│       ├── nav.html
│       ├── hero.html
│       ├── marquee-1.html
│       ├── about.html
│       ├── skills.html
│       ├── work.html
│       ├── experiments.html
│       ├── marquee-2.html
│       ├── timeline.html
│       ├── contact.html
│       └── footer.html
├── build.py                 ← zero-dependency build (Python, no npm needed)
├── build.js                 ← same build, as a Node module (used by dev.js)
├── dev.js                   ← live dev server: rebuilds + refreshes on save
├── package.json
├── styles.css
├── script.js
└── index.html                ← GENERATED — do not hand-edit
```

## Option A — live dev workflow (recommended, needs Node/npm)

One-time setup:

```
npm install
```

Then, whenever you're editing:

```
npm run dev
```

This opens the site at **http://localhost:3000**, and from then on:
edit any file in `src/partials/` or `src/layout.html`, hit save, and the
browser tab updates automatically — no manual rebuild step, no visible
delay. It also live-reloads on changes to `styles.css` and `script.js`.

Stop it with `Ctrl+C`.

## Option B — one-off build (no npm required)

```
python3 build.py
```

or, if you have Node but don't want the dev server:

```
npm run build
```

Both produce the same `index.html`. Use this if you just want to build
once (e.g. right before deploying) rather than run a live dev session.

## Editing the shell (nav links, `<head>` meta tags, page scaffolding)

Edit `src/layout.html` directly — the dev server and both build scripts
pick it up the same way as a partial.

## How it works

The build step reads `src/layout.html` and replaces each
`<!-- include:src/partials/NAME.html -->` marker with the raw contents of
that partial, writing the result to `index.html`. `dev.js` does the same
thing, but wraps it in a file watcher (`browser-sync`) that reruns the
build and pushes a live-reload event to your browser on every save.
Deployment is unaffected either way — `index.html` is still one plain
static file; only your local editing workflow changed.

## Deploying to Vercel

**Option 1 — build locally, commit the result (simplest, no Vercel config needed).**
Run `npm run build` (or `python3 build.py`) before every commit/push so
`index.html` in the repo is always current, then deploy as you already do.

**Option 2 — let Vercel build it for you.**
This repo includes a `vercel.json` that sets the build command to
`node build.js`, so Vercel regenerates `index.html` from your partials on
every deploy — you never have to remember to build locally at all. Just
edit partials, commit, push. (A `.vercelignore` keeps `node_modules` and
`package-lock.json` out of the deployment; the small source files like
`src/` and `README.md` still get uploaded but aren't linked from the page,
so they're harmless clutter rather than a functional issue.)

Either way, the deployed `index.html` is the exact same static file as
before — Vercel doesn't need to know partials exist unless you choose
Option 2.

## Verified

The initial split was done mechanically (sliced from the single original
file at exact section boundaries, not retyped), and the assembled output
was confirmed **byte-for-byte identical** to the pre-refactor `index.html`,
then further checked with a headless-browser DOM/pixel comparison and a
functional pass (marquee loop, scroll-spy, mobile nav, scroll-reveal) —
zero differences found. The live-reload dev server was also tested
end-to-end: editing a partial while a browser tab was open updated the
page automatically with no manual action.
