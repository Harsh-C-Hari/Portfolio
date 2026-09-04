# Portfolio Plan — Harsh C Hari

> Build a personal portfolio for **Harsh C Hari** (CSE student, full-stack developer) using the **ThinkerHub SkillUI** reference as the primary visual design system — translated into an original portfolio experience, not a recreation of ThinkerHub.

---

## 1. Intent & Audience

**Audience.** Recruiters, fellow developers, hackathon judges, and curious peers. Visitors who already know Harsh (LinkedIn/GitHub referrals) get fast access to his best work; cold visitors get a memorable, opinionated first read of who he is.

**North star.** A portfolio that feels hand-built — not a template, not a SaaS landing page. The site should read as one person's taste applied to a problem (his own presentation), not as a generic grid of cards.

**Mode.** Plan-first. This document is the spec. HTML comes only after the plan is approved.

---

## 2. Identity Narrative

**Positioning.** Harsh is a **Full-Stack Developer & CSE Student** who builds software, experiments with ideas, and turns ambitious concepts into working systems. AI is one tool he uses — not his identity. Hackathons and personal experiments are the through-line.

**Voice.** Direct, technically grounded, occasionally playful. Confident without being a hype reel. Real project descriptions, not feature dumps.

**Anti-patterns to avoid.**
- Purple/blue AI-slop gradients, 3D characters, terminal-style heroes.
- SaaS pricing-page layout ("Free / Pro / Enterprise").
- Card-inside-card-inside-card bento grids.
- Logo walls of tools.
- Generic "Hi, I'm a developer who loves building things" opener.

---

## 3. Visual System (ThinkerHub-derived)

Tokens are inherited from ThinkerHub SkillUI, then **recomposed** for portfolio use. The hero display scale (Anton 180–250px) is reserved for the hero moment only.

### 3.1 Color
| Token | Value | Use |
|---|---|---|
| `text-primary` | `#000000` | Body text, display |
| `background` | `#ffffff` | Page base |
| `surface` | `#e8f5fe` | Soft panel, info accents |
| `border` | `#2e2e2e` | Hairlines, dividers |
| `text-muted` | `#757575` | Secondary text, captions |
| `accent` | `#f79cff` | Links, focus rings, ≤2 uses per viewport |
| `danger` | `#ff0059` | Reserved (form errors / delete actions) |
| `warning` | `#f4c761` | Reserved (status, "in progress" markers) |
| `lime` | `#c3ff16` | Reserved (experimental / "build" tag) |
| `info` | `#3b82f6` | Reserved (ring, highlight) |

Neutral background first; no big colored fills. Accent only on active state, one CTA, or one inline link per viewport.

### 3.2 Typography
- **Display (hero only):** Anton, 700. Anton appears on the hero display line; not reused on every heading.
- **Body / section headings:** Instrument Serif, 400 (italic allowed for editorial pull-quotes).
- **Code / metadata / monospace tags:** SometypeMono, 14–16px.
- **Self-host all three font files** (paths from `tinkerhub-design/fonts/`) — no third-party CDN.

Type scale (rationalized for portfolio use — Anton is oversized, kept to the hero):
| Role | Family | Size | Weight |
|---|---|---|---|
| Hero display | Anton | 180–250px (responsive) | 700 |
| Section H2 | Instrument Serif | 56–72px | 400 |
| Section H3 | Instrument Serif | 32–40px | 400 |
| Body | Instrument Serif | 18–20px | 400 |
| Caption / meta | SometypeMono | 14px | 400 |
| Code | SometypeMono | 14–16px | 400 |

### 3.3 Spacing
- Base grid: **4px** (ThinkerHub's actual base — not the 8px OD default).
- Outer section padding: `clamp(64px, 8vw, 160px)` vertical; `clamp(24px, 4vw, 80px)` horizontal.
- Max content width: **1128px**, `mx-auto`.

### 3.4 Borders & radius
- 1px borders for hairlines, card edges, dividers (ThinkerHub's signature).
- 4px corner radius as the only radius (no big rounding).
- Section dividers: `border-top: 1px solid #e5e8ec` (ThinkerHub's `border-t-gray-200`).

---

## 4. Hero Concept

**Idea.** A single page, opened vertically. The hero is **one massive Anton display line** (a sentence about Harsh, not a name reveal), with a quiet supporting paragraph below it in Instrument Serif, and a single primary accent link ("See three projects →") pointing to the work section.

**Layout posture (deliberate break from the typical left-text / right-image hero):**
- The hero display sits **center-aligned**, not split.
- No image, no illustration, no avatar to the right of the name.
- A thin 1px border runs across the hero horizontally — the line is the structure.
- Below the display: a marquee strip in SometypeMono (16px) that scrolls right-to-left with a single rotating line: `// currently building a personal cloud gaming orchestrator.`
- The marquee is a 1:1 carry-over of ThinkerHub's `.vfm-marquee` pattern, recomposed as an honest status line rather than decorative.
- An inline accent link `Harsh C Hari ↗` (in `#f79cff`) sits in the upper-right of the hero, linking to LinkedIn or GitHub — keeps the "where this came from" surface area small.

**Below the fold.** A small typographic intro paragraph: name + positioning, written as one sentence:
> "Harsh C Hari — I build software, experiment with ideas, and turn ambitious concepts into working systems."

This is the *central idea* sentence. The hero display carries energy; this paragraph carries identity.

**No "Hi, I'm" / "Welcome to my portfolio" / "Passionate developer" openers.**

---

## 5. Section List & Goals

The page is intentionally **editorial** — not 15 tiny sections. Each section has a clear job.

| # | Section | Job |
|---|---|---|
| 0 | Hero (display + intro + marquee) | Establish who this is, in one beat |
| 1 | Currently (marquee continues; could merge with hero) | Live status |
| 2 | Selected Work | Three projects, treated by importance |
| 3 | Live Experiments | Two deployed items, framed as side bets |
| 4 | GitHub | One CTA card linking out |
| 5 | Hackathons & Recognition | Structured slots, ready for real entries |
| 6 | How I Work (skills in practice) | Evidenced skills, not a logo wall |
| 7 | Get in touch | Two or three quiet contact options |

Total: **8 sections** (incl. hero). Each section is 1 viewport on desktop, fewer on mobile. No filler.

---

## 6. Project Treatments

Three projects, treated in importance order. The Cloud Gaming Orchestrator is the **hero project** — it gets the most space and motion.

### 6.1 Personal Cloud Gaming Orchestrator — *Hero project*
- **Stack:** React, FastAPI, Python, JWT, WebSockets, Sunshine, Tailscale.
- **Treatment:** Asymmetric 60/40 split. Left: massive section heading "Cloud Gaming Orchestrator" in Instrument Serif, with one italic Instrument pull-quote line describing the system. Right: a small live-looking status block (SometypeMono) showing fake but plausible state — e.g. `latency 38ms · stream 1080p · region eu-west · 2 controllers paired`. Status block has a thin border, 1px, with a lime `#c3ff16` "online" dot. No fake analytics — this is a *system mock* labeled as such, or kept as illustrative typography.
- **Detail row below:** Three small columns: **Why**, **How**, **Stack**. Each is 2–3 lines max.
- **CTA:** "Read on GitHub ↗" — accent color, underline on hover.
- **Repo:** https://github.com/Harsh-C-Hari/personal-cloud-gaming-orchestrator
- **No image / no screenshot** unless Harsh provides one. Mock UI block stands in.

### 6.2 Future of CEC — *Secondary project*
- **Stack:** Google Auth, AI assistant (local Gemma/Ollama), lift-access workflows, PostgreSQL/Prisma/Express/FastAPI.
- **Treatment:** Same vertical rhythm, smaller scale. 50/50 split. Heading "Future of CEC" in Instrument Serif. Two-line description. Stack tags in SometypeMono: `Google OAuth · Ollama · PostgreSQL · Prisma · Express · FastAPI`. Single CTA.
- **Repo:** https://github.com/Harsh-C-Hari/Minions--Future_of_CEC

### 6.3 Smart Farming Dashboard — *Tertiary project*
- **Stack:** sensors, AI agronomy, Chart.js, FastAPI.
- **Treatment:** Compact. Single column. Heading + one line + stack tags + CTA.
- **Repo:** https://github.com/Harsh-C-Hari/build-with-ai-chn-kokachiz

### 6.4 Live Experiments strip
A horizontal row with two items, framed as "things I shipped that are still alive":
- **Productivity Dashboard** — https://productivity-dashboard-phi-navy.vercel.app/ — described as "a tool I use daily."
- **Sreya Birthday** — https://sreya-birthday.vercel.app/ — described as "a hand-built gift; exists to show range."

Both render as a small typographic card with a 1px border, an instrument-serif title, and a `↗ open` link. No screenshots unless provided. The Sreya Birthday inclusion shows Harsh can ship small, warm, one-off things — that's a feature, not a side note.

---

## 7. GitHub Integration

A single quiet section, not a feed. A 1px-bordered card, instrument-serif title, and a SometypeMono line showing the GitHub handle: `github.com/Harsh-C-Hari`. CTA: `Open GitHub ↗`. No pinned-repos display (no API call — keeps the page self-contained, no JS, no fetch). If Harsh wants live data later, that's an additive enhancement.

---

## 8. Hackathons & Recognition (Scaffold)

This section is **structured for real entries** to be added later. No fabricated achievements, no placeholder names, no made-up dates. Rendered as:

- A section heading: "Hackathons & Recognition" in Instrument Serif.
- Below it, an empty-state line in SometypeMono: `// awaiting entries — to be filled in.`
- The layout already supports a vertical list of cards (1px border, instrument-serif title, mono meta, one-line description) — slots ready.

When real entries exist, each becomes a card:
```
[ Year · Hackathon Name ]
[ One-line outcome or role ]
[ Optional link ↗ ]
```

---

## 9. Skills Representation — "How I Work"

**Rule:** Only skills evidenced by the projects above appear. No "React: ★★★★☆" bars. No logo wall.

Format: short editorial paragraphs grouped by what Harsh does, each with a SometypeMono tag-line of the actual tools used in real projects. Example:

> **I build full-stack systems.** The Cloud Gaming Orchestrator runs React on the front, FastAPI behind it, with a Python agent doing the orchestration. JWT for auth, WebSockets for the live stream state, Sunshine and Tailscale doing the actual streaming plumbing. `React · FastAPI · Python · WebSockets · JWT · Sunshine · Tailscale`

Two or three such blocks, each referencing a real project. The skills are evidenced by the work — not declared separately.

---

## 10. Motion & Interaction Language

Bound to ThinkerHub's actual motion DNA. No invented durations, no GSAP bloat.

- **Marquee:** the `.vfm-marquee` pattern — translateX, linear, infinite. ~30s cycle. Used in hero for the "currently building" line.
- **Section reveal:** opacity 0 → 1 + 12px Y translate, 0.4s, on scroll entry. Triggered via `IntersectionObserver`. No animation library — plain CSS + small inline script.
- **Hover (links vs buttons):** text links (footer text, inline text links) may `text-decoration: underline` on hover; buttons (`.btn`, all variants) **never** underline. Solid `.btn-primary` inverts on hover: background swaps to `var(--c-accent)` and foreground to `var(--c-text)` (dark on accent) so contrast stays ≥4.5:1; `.btn-ghost` lightens background toward `var(--c-surface-2)` with the foreground unchanged. Every focusable element gets a visible `:focus-visible` ring (`outline: 2px solid var(--c-text); outline-offset: 2px; text-decoration: none;`). `transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)`. No color flash, no scale pop, no dark-on-dark.
- **Focus:** `outline: rgb(16,16,16) auto 1px` for accessibility, plus the accent color ring on interactive elements.
- **Project status block (Cloud Gaming):** a subtle 10s "breathing" loop on the lime online dot, using ThinkerHub's `moveBackground` keyframe pattern, translated into a soft opacity pulse. Very subtle.

**No marquee everywhere. No parallax. No scroll-jacking.**

---

## 11. Responsive Strategy

- Breakpoints: mobile-first. Hero display line scales from 80px (mobile) → 180px (desktop) → 250px (large desktop).
- Mobile (<920px): sections stack. Hero display reduces. Asymmetric 60/40 project split becomes a single column. Marquee stays but slows. No card-inside-card. No floating side panels.
- Tablet (920–1200px): max content width scales down; two-column layouts where they make sense (e.g. project split).
- Desktop (1200px+): full layout, max-w 1128px centered.
- Touch targets ≥ 44px.
- Reduced-motion media query disables the marquee and the breathing dot.

---

## 12. File / Delivery

- **Single self-contained HTML file:** `harsh-c-hari-portfolio.html` (semantic name, not `index.html`).
- Fonts self-hosted from `tinkerhub-design/fonts/` — copied into the artifact folder, referenced via relative paths.
- No third-party CDN. No JS frameworks. One small inline script for `IntersectionObserver` reveals.
- Sections each carry `data-od-id` (e.g. `data-od-id="hero"`, `data-od-id="work"`) per skill rules.
- Placeholder image areas use `.ph-img` markup, NOT generated fake screenshots.

---

## 13. Open Questions

These are the things to confirm before HTML generation:
1. **Photos / screenshots.** Are there any real project screenshots or a personal photo Harsh wants in the portfolio? Default plan: none. Confirm.
2. **Cloud Gaming Orchestrator — system mock.** Is the live-status block in §6.1 acceptable as a *typographic mock* (clearly illustrative, no fake metrics), or should it be a real static screenshot from the running system?
3. **Resume PDF.** Include a downloadable resume link? Default: no (LinkedIn handles it). Confirm.
4. **Domain / deploy target.** Is this just the HTML artifact, or will Harsh deploy it somewhere later? (Doesn't change the build, but affects any meta tags we generate.)
5. **Hackathons section.** Currently scaffolded empty. If Harsh has any real entries ready, list them now so the scaffold is filled in the first pass.

---

## 14. Next Step

1. Review this plan. Edit or push back on any of the above.
2. Once approved, switch to **Design mode** in Open Design. The plan will become the brief for HTML generation:
   - Use the `assets/template.html` seed from the Web Prototype skill.
   - Apply the tokens in §3 verbatim.
   - Build sections in the order of §5.
   - Self-host fonts from `tinkerhub-design/fonts/`.
   - Produce `harsh-c-hari-portfolio.html` in this workspace.
3. After HTML is generated, review for: hero readability at mobile sizes, project-section rhythm, marquee restraint, and the central sentence doing its job.
