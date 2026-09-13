# Mission: Rebuild Harsh C Hari's Portfolio — Unique, GSAP-Driven, Multi-Reference Design

**Owner intent:** Take the current portfolio (content, information architecture, and factual project data are good) and give it an entirely original visual and motion identity. Remove every trace of the "TinkerHub template" tell. Draw inspiration from GSAP's own marketing site (gsap.com) and other reference sites the owner supplies (video walkthrough + a scraped GSAP-style design system) — but combine and remix them into something that doesn't read as a clone of any single source. Ship production-quality scroll and text animation, not decorative flourishes.

This document is written as a mission brief: read top to bottom, execute phase by phase, verify with the stated acceptance criteria before moving to the next phase. Don't skip Phase 0.

---

## 0. Audit — what's wrong today and why

**Stack today:** Fully static. `build.js` concatenates `src/partials/*.html` into `index.html`. `styles.css` is hand-rolled CSS custom properties. `script.js` is ~210 lines of vanilla JS: an `IntersectionObserver`-based reveal-on-scroll, a scroll-spy nav highlighter, a hamburger menu, and a manual infinite-marquee duplication trick. No GSAP, no framework, no bundler.

**The specific "tell":**
- `styles.css` line 3 literally reads `Design system: ThinkerHub (TinkerHub Design reference)` — this isn't a vibe, it's a named credit in the shipped source.
- The `.marquee` infinite-scroll implementation (`initMarquee` in `script.js`) is the exact duplicate-content-then-translate-50%-with-resize-safe-repeat trick that template is known for. Anyone who has seen a TinkerHub-family site will recognize it instantly, animation included.
- The reveal-on-scroll pattern (`class="reveal"` + `IntersectionObserver` adding `.in`) is generic fade+translate — not wrong, just not distinctive, and it's the same mechanism the template uses.

**What's actually good and should survive the rebuild unchanged in substance:** the project data (Personal Cloud Gaming Orchestrator, etc.), the section structure (Hero → Skills → Work → Experiments → Journey/Timeline → Contact), the honest, non-fabricated copy voice, and the fact that it's currently fast (no JS framework weight).

**Conclusion:** this is a full teardown-and-rebuild of the visual design and motion layer, keeping the content model and information architecture, per the owner's decision to do a **full redesign** (visuals + copy structure + all animation).

### 0.1 Confirmed from the owner's video + skillui scrape (supersedes earlier speculation)

Two files reviewed: a 74-second screen recording of gsap.com scrolling top to bottom, and a live-DOM scrape (`gsap-design.zip`) with real extracted CSS, easing curves, and screenshots. Findings:

- **Stack confirmed:** GSAP v3.15.0, `ScrollTrigger`, `ScrollSmoother` — validates the §1 and §3.5 recommendations below.
- **No pinned horizontal-scroll section exists on gsap.com itself.** Everything on the reference site scrolls vertically. This means the vertical→horizontal-pin→vertical structure the owner wants for the Work section is an **original structural contribution**, not something being borrowed — good, this directly serves the uniqueness goal.
- **Hero entrance is a character-scramble resolve** (`ScrambleTextPlugin`-style): "Animate anything" renders as randomized glyphs that individually resolve to correct letters at staggered timing, while decorative morphing icon shapes drift and settle in sync. This is more distinctive than a plain fade/rise and is now the recommended hero pattern (replaces the plain SplitText character-rise originally sketched in §3.2 — see updated §3.2 below).
- **A pinned section with per-character brightness-reveal (not just word highlights)** was found mid-page: nav stays static for ~3s confirming a pin; inside it, a body-text line scrubs horizontally while **each character individually transitions from dim to bright as it crosses a fixed point** (a continuous per-letter animation, not a per-word state change — this is specifically what the owner pointed out from the video), plus separate rotated keyword-pills ("Choreograph", "sequences", "animation") fly in independently on top, each in a taxonomy color, alongside a morphing bezier-curve visualizer. Full mechanism and reference code in updated §4.2.
- **Real motion tokens were extracted** (not estimated): easing curves, a 50ms–300ms duration scale, and a solid-4px-outline focus-ring pattern with defensive `prefers-reduced-motion` CSS. These are now folded into the `gsap-design` skill (`references/motion-tokens.md`) and referenced directly in §3 below.
- **Caution:** the scrape tool that generated `gsap-design.zip` produced its own SKILL.md instructing literal pixel/DOM replication ("match colors, typography, spacing, layout, and motion exactly," extracting CSS class names as reproduction "fingerprints"). That instruction was **discarded** — only the factual technical values (real eases/durations/focus behavior) were kept. Don't reintroduce that scrape's SKILL.md into this project; the enriched `gsap-design` skill already contains the useful parts with the anti-clone framing intact.

---

## 1. Stack decision

**Recommendation: Astro (static output) + TypeScript + GSAP (npm), deployed to Vercel exactly as today.**

Rationale, given "not sure, want the best experience":
- The current `build.js`/partials setup is already a hand-rolled static-site generator. Astro is the natural, minimal-risk upgrade path: partials become `.astro` components with real props/slots instead of string concatenation, but the *output is still zero-JS-by-default static HTML* — no React/Vue runtime tax, no hydration cost, no regression in load performance.
- GSAP animations attach to real DOM nodes the same way they would in plain HTML — Astro doesn't get in the way of `gsap.context()` / `ScrollTrigger` patterns, and you opt into a client-side `<script>` island exactly where animation needs to run (which, for a single-page portfolio, is basically the whole page — that's fine, it's still just one JS bundle, no framework overhead).
- `vercel.json` already exists and Vercel has first-class Astro support — the deploy step doesn't change.
- If it ever needs interactive React islands later (e.g. a project-deck modal with complex state), Astro supports that incrementally without a rewrite. Plain Vite+vanilla doesn't give you that headroom as cheaply.

**Alternative considered and rejected for now:** plain Vite + vanilla TS. Marginally simpler, but you lose component-style partials with props and get back to string/template-literal assembly for anything dynamic (like the project deck). Not worth it given Astro's zero runtime-cost trade-off.

**Not recommended:** React/Next. A single-page portfolio has no state-management or routing need that justifies a UI framework; it would only add bundle weight and build complexity without an experience benefit. (If a future task specifically wants React patterns, `gsap-react`'s `useGSAP` hook is available, but nothing here calls for it.)

**Package additions:**
```
gsap                    # core
# ScrollTrigger, SplitText, ScrollSmoother/Observer ship inside the gsap package (Club GreenSock plugins are now free/bundled — verify current licensing at gsap.com before relying on this)
```
Verify current GSAP plugin licensing/bundling status at install time — plugin distribution has changed over GSAP's history and this plan should not assume a specific paywall state without checking.

---

## 2. Design direction — remix, don't clone

**Rule of thumb (from the `gsap-design` skill):** never take the exact palette + exact type scale + exact component set from one source together — that combination is what makes a design instantly fingerprint-identifiable. Take at most one full axis from any single reference.

**Proposed remix, pending the owner's video/scrape review:**

| Axis | Source of inspiration | What we change |
|---|---|---|
| Canvas philosophy | gsap.com (dark near-black canvas, not pure black) | Keep the *idea* of a single warm-dark canvas, but derive a new hex (not `#0e100f`) and consider whether the whole site should be dark, or whether the current cream/light identity (`#f6f6ee`, `#f79cff` accent) becomes the "light mode" half of a two-canvas system (see §4.2) |
| Typography scale discipline | gsap.com (binary: editorial display 66–224px, or compact UI 14–23px, nothing in between) | Adopt the *discipline*, not the Mori/Inter-Tight pairing — keep the current Anton (display) + Instrument Serif (body) pairing, which is already distinctive, but apply gsap.com's binary-scale logic and push the hero display size further than it currently goes |
| Category-color taxonomy | gsap.com (one fixed hue per content discipline, reused in nav + labels) | Apply this *pattern* to the portfolio's own categories — Frontend/Backend/Data/Systems/AI in the Skills section could each get a stable accent hue reused between the skill-row label and any matching project chip, rather than everything being the current single pink accent |
| Curly-bracket eyebrow motif | gsap.com (`{ Why GSAP® }`) | Skip verbatim, but keep the *idea* of a one-line typographic section-signature — pick a different literal glyph/pattern unique to this portfolio (e.g. a monospace `// section-name` comment-style eyebrow, echoing the dev/code identity already present via `--f-mono`) |
| Ghost-pill buttons | gsap.com (100px radius, 1px border, no fills) | The current site already uses `.btn-primary`/`.btn-ghost` — decide whether to move fully to outlined-only (gsap.com's rule) or keep one filled primary CTA; either is defensible, but pick deliberately rather than by default |
| 3D organic gradient blobs | gsap.com decorative imagery | Likely skip — this is one of the most visually distinctive gsap.com signatures; safer to source decorative treatment from a *different* reference site once the video/scrape are reviewed |

**Open dependency:** finalize this table once the owner uploads (a) the GSAP-site video and (b) the skillui scrape. Those may suggest a different or additional reference (Framer, Linear, Vercel, Webflow are gsap.com's own "similar brands" list — worth deliberately avoiding unless one is explicitly wanted) and will supply the actual **motion** reference this table doesn't cover.

---

## 3. Motion system specification

This is the core of the rebuild. Structure every section's animation into three layers, always in this order of implementation:

1. **Entrance/reveal** — how the section's content first appears as it enters the viewport
2. **Scroll-linked** — anything that moves *with* the scrollbar position (parallax, scrub-driven progress, pinned sections)
3. **Micro-interaction** — hover/focus/click feedback, independent of scroll

### 3.1 Global choreography grammar

Per the owner's decision: **vertical scroll → one pinned horizontal-scroll section (Work/Projects) → vertical scroll resumes.** This is the site's signature spatial idea and should be telegraphed, not just executed — e.g. a transition cue (rotate/scale/color shift) as the user approaches the pinned section so the direction change doesn't feel like a bug.

```
Hero (vertical entrance)
  ↓
About / Skills (vertical, staggered reveals)
  ↓
━━━ TRANSITION ZONE ━━━ (short section that visually "turns the corner")
  ↓
Work/Projects (PINNED, horizontal scroll — see 3.3)
  ↓
━━━ TRANSITION ZONE ━━━ (turns back to vertical)
  ↓
Experiments / Timeline / Contact (vertical, staggered reveals)
```

### 3.2 Text animation system (letter/word-level)

Use `SplitText` for structural reveals and `ScrambleTextPlugin` for the hero — this is the "individual letter animation" the owner asked for, now backed by a confirmed real-world pattern rather than a generic guess.

- **Hero H1** ("I build software, experiment with ideas..."): **confirmed pattern from the reference video** — render the headline with `ScrambleTextPlugin`, resolving randomized glyphs into the correct characters at staggered per-character timing, rather than a plain fade/rise. Pair it with 2–4 small decorative shapes (rotating/morphing, GSAP-animated) that drift near the headline and settle into place as the text resolves — reuse the *technique*, not gsap.com's actual icon set/palette (pick shapes and colors that fit this portfolio's own identity, e.g. code-adjacent glyphs like brackets/semicolons/cursor-blocks instead of organic flower/sparkle shapes, to keep it visually distinct). Real duration anchor from the scrape: keep total resolve time inside the 50ms–600ms range the reference site uses for anything that isn't a decorative background loop — don't let the scramble drag past ~0.8–1s or it reads as slow rather than "premium reveal."
- **Section headings** (`h2` — "Selected work", "What I work with", "Journey"): split by `words`, stagger a smaller rise (yPercent 40→0) triggered on scroll-into-view via `ScrollTrigger`, not on page load.
- **Body copy / project descriptions**: do NOT split to character level (expensive, and reads as gimmicky for paragraph text) — use a simple clip-path or opacity/y reveal on the whole block instead.
- **Nav links / chips**: no split-text; these get simple hover micro-interactions only (§3.4).

```javascript
// Reference pattern — hero scramble-resolve (verify exact API against installed GSAP version)
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
gsap.registerPlugin(ScrambleTextPlugin);

gsap.to(".hero-h1", {
  duration: 0.8,
  scrambleText: {
    text: ".hero-h1", // resolves to its own existing text content
    chars: "upperAndLowerCase", // or a custom charset matching this portfolio's mono/code identity
    revealDelay: 0.2,
    speed: 0.4,
  },
  ease: "power2.out",
});

// Reference pattern — section-heading word reveal (unchanged from original plan)
import { SplitText } from "gsap/SplitText";
gsap.registerPlugin(SplitText);

const headingSplit = new SplitText(".section h2", { type: "words" });
gsap.from(headingSplit.words, {
  yPercent: 40,
  opacity: 0,
  duration: 0.6,
  ease: "power4.out",
  stagger: 0.03,
  scrollTrigger: { trigger: ".section h2", start: "top 85%" },
});
```

### 3.3 Pinned horizontal-scroll section (Work/Projects)

This replaces the current `.project-deck` modal-trigger pattern (or sits alongside a lighter version of it — decide during Phase 3 based on how many projects need full detail vs. a horizontal card pass).

```javascript
// Reference pattern
const panels = gsap.utils.toArray(".work-panel");
gsap.to(panels, {
  xPercent: -100 * (panels.length - 1),
  ease: "none",
  scrollTrigger: {
    trigger: ".work-pin-container",
    pin: true,
    scrub: 1,
    end: () => "+=" + document.querySelector(".work-pin-container").offsetWidth,
    invalidateOnRefresh: true,
  },
});
```

Notes:
- `scrub: 1` (not `true`) so the motion has a slight catch-up lag rather than feeling rigidly locked to the scrollbar — reads as more premium.
- Each panel gets its own nested entrance animation (e.g. project cover image scales in, chips stagger in) timed to when that panel becomes centered — use a `ScrollTrigger` per panel with `containerAnimation` pointing at the outer horizontal tween, per GSAP's documented pattern for "animation inside a pinned horizontal scroll."
- On mobile/narrow viewports, strongly consider **disabling the pin and falling back to a normal horizontal-scrolling card row** (native touch-scroll, no ScrollTrigger) — pinned horizontal scroll on mobile is a common source of janky, disorienting UX. This is a hard requirement, not a nice-to-have.

### 3.4 Micro-interactions

- Buttons: on hover, animate border/text color via `gsap.to` (not CSS transitions) so timing is consistent with the rest of the system; keep durations short (0.2–0.3s).
- Project chips: subtle scale (1 → 1.04) on hover.
- Nav: active-section indicator should animate (slide/morph) between links rather than snap, using the existing scroll-spy logic in `script.js` as the trigger source.

### 3.5 Smooth scroll

Evaluate `ScrollSmoother` (or Lenis as a lighter alternative) for inertia-based smooth scrolling site-wide — this is what makes premium GSAP sites feel physically different from a default browser scroll. Required if the pinned horizontal section is to feel intentional rather than jarring. Must respect `prefers-reduced-motion` (see §3.6).

### 3.6 Performance & accessibility — non-negotiable

- Wrap **all** GSAP entrance/scroll animations in a `prefers-reduced-motion` check; provide an instant/no-animation fallback path, not just "shorter" animations.
- Animate only `transform` and `opacity` properties for anything scroll-scrubbed — never animate `width`/`height`/`top`/`left` in a scrub context (layout thrashing).
- `gsap.context()` scoping and proper `ScrollTrigger.kill()`/`revert()` on any dynamically-rebuilt DOM (the project deck already rebuilds `<img>` nodes per `script.js` — any GSAP bound to those nodes must be re-created or it will leak).
- Run a Lighthouse pass after Phase 3 and again after Phase 5; motion work should not regress LCP/CLS from the current static baseline.

---

## 4. Content/IA changes (full redesign scope)

Per "full redesign: visuals + copy structure + all animation":

1. **Hero** — keep the honest voice, but tighten copy to work with the new letter-animation pacing (very long lines fight staggered character reveals).
2. **Marquee** — replace entirely, using the **pinned, per-character brightness-reveal** mechanism confirmed by frame-by-frame video review (see §0.1 for the full mechanism breakdown and reference code): pin the section, scrub the build-verbs strip (Build/Ship/Iterate/Break/Fix/Learn) horizontally, and drive each character's color from muted to bright individually as it crosses a fixed reading point — this is what actually produces "each letter has its own smooth, unique motion," not a plain highlight-pill-per-word treatment. Layer 2–3 independently-animated rotated keyword pills on top (reusing the taxonomy colors from §2) for the verbs worth emphasizing. This is structurally different from both the original TinkerHub duplicate-loop trick *and* a literal gsap.com clone (theirs drives body copy in a feature-explainer section; ours drives a portfolio's own build-verb identity strip), which makes it simultaneously the highest-priority item for killing the template tell **and** a genuinely original synthesis rather than a copy of either source.
3. **Skills** — restructure to support the category-color-taxonomy idea from §2 (each of Frontend/Backend/Data/Systems/AI gets a stable hue).
4. **Work/Projects** — becomes the pinned horizontal section (§3.3); decide whether the existing `project-deck.js` modal survives as a "view details" expansion within a panel, or is retired in favor of full panel-per-project.
5. **Timeline/Journey** — vertical, but consider a scroll-scrubbed progress line/marker (a common, tasteful use of `scrub` for timelines) rather than the current static rows.
6. **Contact/Footer** — lower priority for motion investment; keep simple.

---

## 5. Skills & tools to use during build

- `gsap-design` (created this session) — visual-language reference/inspiration boundary-setting
- `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins` (SplitText, ScrollSmoother, Observer) — implementation patterns
- `ui-ux-pro-max` — run `--design-system` once the palette/type decisions in §2 are finalized, to sanity-check contrast, touch targets, and animation-timing guidance against its UX rule set before shipping
- `frontend-design` — general visual-design judgment during actual component build
- Once the owner uploads the video + skillui scrape: extract a **new** skill (e.g. `gsap-motion-reference`) capturing the actual choreography/timing patterns observed, separate from `gsap-design`'s pure visual tokens
- `playwright-cli` (available) — for scroll-behavior QA once built (verify pin boundaries, reduced-motion fallback, mobile horizontal-scroll fallback)

---

## 6. Phased execution plan (for Antigravity's plan → execute → verify loop)

### Phase 0 — Confirm inputs (blocking)
- [ ] Owner uploads GSAP-site video and skillui scrape
- [ ] Finalize the §2 remix table with owner sign-off
- [ ] Decide project-deck fate (§4.4)
- **Verify:** written confirmation from owner on palette/type direction before any code is written.

### Phase 1 — Scaffold
- [ ] Initialize Astro project, port `src/partials/*.html` to `.astro` components 1:1 (no visual changes yet — this is a mechanical migration to prove the pipeline works)
- [ ] Install GSAP + confirm plugin licensing/bundling at current version
- [ ] Re-deploy to Vercel from the new scaffold, confirm parity with the live site
- **Verify:** side-by-side visual diff against current live site shows no unintended change; build/deploy pipeline green.

### Phase 2 — Design tokens
- [ ] Implement the finalized §2 token decisions as CSS custom properties (parallel structure to current `:root` block, new values)
- [ ] Rebuild type scale per the binary-discipline rule
- **Verify:** `ui-ux-pro-max` design-system check passes; no contrast failures.

### Phase 3 — Core motion system
- [ ] Hero SplitText entrance
- [ ] Section-heading word-level scroll reveals
- [ ] New marquee mechanism (kills the template tell)
- [ ] Micro-interactions (buttons, chips, nav)
- **Verify:** manual scroll-through in browser; `prefers-reduced-motion` toggle produces correct fallback; no console errors from GSAP context leaks.

### Phase 4 — Pinned horizontal Work section
- [ ] Build panel structure + pin/scrub tween
- [ ] Per-panel nested entrance animations with `containerAnimation`
- [ ] Mobile fallback (native horizontal scroll, no pin)
- **Verify:** desktop pin behavior correct at multiple viewport widths; mobile fallback confirmed on a real narrow-viewport test, not just devtools resize; `ScrollTrigger.refresh()` behaves correctly after any late image load (images affect panel widths).

### Phase 5 — Smooth scroll + polish pass
- [ ] Integrate ScrollSmoother/Lenis site-wide
- [ ] Timeline scroll-scrub progress marker
- [ ] Full accessibility pass (keyboard nav still works with pinned/smooth-scroll active — this is a common regression)
- **Verify:** Lighthouse comparison vs. Phase 0 baseline; keyboard-only navigation still reaches every interactive element in order.

### Phase 6 — Final QA & launch
- [ ] Cross-browser check (Safari's ScrollTrigger/position:sticky interactions are a known trouble spot)
- [ ] Remove all dead code from the old `script.js` mechanisms being replaced (marquee duplication logic, old reveal IO)
- [ ] Final owner review against the original goal: "does this still look like TinkerHub or GSAP's site, or does it look like its own thing?"
- **Verify:** explicit owner sign-off answering that last question before calling this done.

---

## 7. WIP review (2026-09-13 localhost:3000 screenshot) — status and open items

The owner has already started building against this plan (not yet committed/pushed; production at `harshchari.vercel.app` still runs the original pre-redesign site). Reviewed a full-page screenshot of the local WIP. **Verdict: continue from this WIP — do not restart from production.** It's already correctly implementing several plan decisions well:

- ✅ `// section-name` monospace comment-style eyebrows — exactly the alternative to gsap.com's literal `{ }` motif recommended in §2, and it reads as native to the dev/code identity rather than borrowed.
- ✅ Category-color taxonomy applied to the skills chips (Frontend/Backend/Data/Systems/AI Integrations/Testing each get a distinct outline hue) — correct execution of §2's taxonomy idea.
- ✅ Anton-style heavy display headline retained for the hero (not swapped for a Mori-style face) — keeps typographic identity distinct from gsap.com.
- ✅ Outlined ghost buttons + one filled accent pill CTA pattern in place.
- ✅ Section structure, copy, and project data preserved as intended for a "full redesign, not full rewrite."

**Two things to check/fix before going further:**

1. **Palette risk — currently reads too close to gsap.com's own identity.** The WIP uses a dark-near-black canvas with a single dominant bright-green accent for the primary CTA, "Live" tags, and marquee highlights — this is very close to gsap.com's actual brand green-on-black combination, which is exactly the "full palette match" the uniqueness checklist warns against, even though nothing was copied verbatim. **Fix:** keep green as *one* of the taxonomy colors (it's already doing good work on the AI-integrations chips), but move the primary/dominant accent (main CTA, most-used highlight color) to a different hue — the original site's pink `#f79cff` is a candidate, or pick something new entirely — so the overall canvas doesn't read as "dark + green" at a glance.
2. **"Duplicate" project cards in the Work section — verify, likely a screenshot artifact, not a bug.** The screenshot shows "Productivity Dashboard" and other cards appearing to repeat several times with slightly different internal image crops. Given the nav/header stays identical across these repeats and the sections before/after are clean, this is almost certainly a **full-page screenshot tool auto-scrolling through a pinned horizontal-scroll section and capturing it at multiple scrub points**, stitching them as if they were separate stacked sections — not an actual rendering bug. **Verify by scrolling manually in a real browser at `localhost:3000`** rather than trusting the auto-capture; if manual scrolling shows the panels cleanly transitioning left-to-right with no duplication, no fix is needed.

Also unconfirmed from a static screenshot (can't be judged from an image): whether the marquee row and hero are actually running the corrected GSAP mechanisms above (pinned per-character reveal; scramble-text hero) versus visually-restyled versions of the original IntersectionObserver/duplicate-loop code. Confirm in DevTools/source that `script.js`'s old `initMarquee` function and IO-based `.reveal` mechanism have actually been removed, not just hidden behind new CSS.

## 8. Uniqueness checklist (run this before declaring any phase "done")

- [ ] No CSS comment, class name, or file credits a source template
- [ ] No single component matches a reference site's exact recipe (radius + border + padding + color all identical)
- [ ] No single reference contributed *both* its full color palette *and* its full type scale
- [ ] The marquee mechanism is structurally different from the original TinkerHub trick, not just re-skinned
- [ ] At least one motion pattern in the final site does not appear in any of the reference sources verbatim — i.e. something actually original was added, not just remixed
