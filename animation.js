/**
 * animation.js — Harsh C Hari Portfolio
 * GSAP-driven motion system: hero scramble-resolve, pinned verb-reveal,
 * scroll reveals, horizontal pinned work, smooth scroll.
 *
 * Bundled by esbuild -> animation.bundle.js
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { Observer } from 'gsap/Observer';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, Observer);

// ─────────────────────────────────────────────────────────────────────────────
// REDUCED MOTION GATE
// All animation init is wrapped; reduced-motion users get instant reveals.
// ─────────────────────────────────────────────────────────────────────────────
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Reveal all GSAP targets immediately for reduced-motion users
if (prefersReduced) {
  document.querySelectorAll('.gsap-reveal').forEach((el) => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// LENIS SMOOTH SCROLL
// Inertia-based scroll; ticked inside GSAP's RAF for ScrollTrigger compat.
// Disabled if reduced-motion is preferred (native scroll is fine there).
// ─────────────────────────────────────────────────────────────────────────────
let lenis;

if (!prefersReduced) {
  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    wheelMultiplier: 0.9,
    touchMultiplier: 1.5,
    smoothTouch: false, // native feel on touch devices
  });

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// NAV — scroll-class + active indicator morph
// ─────────────────────────────────────────────────────────────────────────────
(function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  // Add scrolled class for backdrop blur.
  // NOTE: deliberately using a native scroll listener instead of ScrollTrigger.
  // The GSAP pin mechanism for the Work section briefly adjusts the internal
  // scroll position during pin setup, which can fire onToggle with isActive:false
  // and strip .is-scrolled even when the user is far down the page.
  // A direct window.scrollY read is immune to that manipulation.
  function syncNavScroll() {
    nav.classList.toggle('is-scrolled', window.scrollY > 10);
  }
  syncNavScroll(); // set correct state on initial load / refresh
  window.addEventListener('scroll', syncNavScroll, { passive: true });

  // Sliding active-indicator under desktop nav links
  const indicator = document.querySelector('.nav-indicator');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  const navBrand = document.querySelector('.nav-brand');
  const heroEl = document.getElementById('hero');

  if (!indicator || !navLinks.length) return;

  function moveIndicator(link) {
    const linkRect = link.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    gsap.to(indicator, {
      x: linkRect.left - navRect.left,
      width: linkRect.width,
      duration: 0.4,
      ease: 'power2.out',
    });
    gsap.to(indicator, { opacity: 1, duration: 0.2 });
  }

  function hideIndicator() {
    gsap.to(indicator, { opacity: 0, duration: 0.2 });
  }

  // Scroll spy — reuse the existing reliable pattern, now drive indicator
  const spyZones = [];
  if (heroEl) spyZones.push({ el: heroEl, href: '#top' });
  navLinks.forEach((a) => {
    const href = a.getAttribute('href');
    if (spyZones.some((z) => z.href === href)) return;
    const target = document.querySelector(href);
    if (target) spyZones.push({ el: target, href, link: a });
  });

  function setActive(href) {
    navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === href));
    if (navBrand) navBrand.classList.toggle('is-active', href === '#top');
    const activeLink = [...navLinks].find((a) => a.getAttribute('href') === href);
    if (activeLink) moveIndicator(activeLink);
    else hideIndicator();
  }

  function updateActiveSection() {
    const mid = window.innerHeight * 0.5;
    let current = null;
    let currentDist = Infinity;
    spyZones.forEach((z) => {
      const rect = z.el.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;
      const dist = Math.abs((rect.top + rect.bottom) / 2 - mid);
      if (dist < currentDist) { currentDist = dist; current = z; }
    });
    if (current) setActive(current.href);
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { updateActiveSection(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', updateActiveSection);
  updateActiveSection();

  // Hamburger
  const toggle = document.querySelector('.nav-toggle');
  const mobileNav = document.getElementById('nav-mobile');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => {
      const open = mobileNav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    mobileNav.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href');
        if (!href || href[0] !== '#') {
          mobileNav.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
          return;
        }
        e.preventDefault();
        mobileNav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        setTimeout(() => {
          const target = href === '#top'
            ? document.getElementById('top')
            : document.querySelector(href);
          if (!target) return;
          // Compute exact scroll position at click-time from live layout.
          // getBoundingClientRect reflects the real DOM position including any
          // GSAP pin spacers, so this always lands the section top flush below nav.
          const navH = document.querySelector('.nav')?.offsetHeight || 64;
          const exactY = href === '#top'
            ? 0
            : Math.max(0, target.getBoundingClientRect().top + window.scrollY - navH);
          if (lenis) {
            lenis.scrollTo(exactY, { immediate: true });
          } else {
            window.scrollTo({ top: exactY, behavior: 'instant' });
          }
        }, 310);
      });
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav') && mobileNav.classList.contains('is-open')) {
        mobileNav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ── DESKTOP NAV LINKS — smooth scroll with nav-height offset ────────────
  // Without this, clicking anchor links falls through to the browser's native
  // scrollIntoView which: (a) ignores the 64px fixed nav, (b) is confused by
  // the GSAP pin spacer that inflates the page height during the Work section.
  navLinks.forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href[0] !== '#') return; // let external links pass through

      e.preventDefault();

      const target = href === '#top'
        ? (document.getElementById('top') || document.documentElement)
        : document.querySelector(href);
      if (!target) return;

      // Compute exact scroll position at click-time from live layout.
      // getBoundingClientRect reflects the real DOM position including any
      // GSAP pin spacers, so this always lands the section top flush below nav.
      const navH = nav.offsetHeight || 64;
      const exactY = href === '#top'
        ? 0
        : Math.max(0, target.getBoundingClientRect().top + window.scrollY - navH);

      if (lenis) {
        // immediate:true = instant jump — no animated scroll-through.
        // A long smooth scroll is bad here because the GSAP-pinned Work section
        // inflates the page by ~3000px, so a 1.4s tween would drag the user
        // through all four horizontal panels before reaching the destination.
        lenis.scrollTo(exactY, { immediate: true });
      } else {
        window.scrollTo({ top: exactY, behavior: 'instant' });
      }
    });
  });

  // Also wire the nav brand logo → scroll to top
  if (navBrand) {
    navBrand.addEventListener('click', (e) => {
      const href = navBrand.getAttribute('href');
      if (href === '#top' || href === '#') {
        e.preventDefault();
        if (lenis) {
          lenis.scrollTo(0, { immediate: true });
        } else {
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
      }
    });
  }
})();

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE SKELETONS (carried over from script.js, no animation dependency)
// ─────────────────────────────────────────────────────────────────────────────
(function initImageSkeletons() {
  const seenImageURLs = new Set();
  function wireImageSkeleton(img) {
    const wrap = img.closest('.img-skeleton');
    if (!wrap) return;
    const src = img.currentSrc || img.src;
    if (src && seenImageURLs.has(src)) {
      wrap.classList.add('is-loaded', 'is-loaded-instant');
      return;
    }
    const reveal = () => {
      if (src) seenImageURLs.add(src);
      wrap.classList.add('is-loaded');
    };
    if (img.complete && img.naturalWidth > 0) reveal();
    else {
      img.addEventListener('load', reveal, { once: true });
      img.addEventListener('error', reveal, { once: true });
    }
  }
  window.wireImageSkeleton = wireImageSkeleton;
  document.querySelectorAll('.img-skeleton > img').forEach(wireImageSkeleton);
})();

// ─────────────────────────────────────────────────────────────────────────────
// FOOTER — year
// ─────────────────────────────────────────────────────────────────────────────
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ─────────────────────────────────────────────────────────────────────────────
// ALL ANIMATION — guarded by prefersReduced
// ─────────────────────────────────────────────────────────────────────────────
if (!prefersReduced) {
  // Use gsap.context for clean teardown (important for any SPA-style rebuilds)
  const ctx = gsap.context(() => {

    // ── HERO ENTRANCE — ScrambleText per line + code-glyph shapes ────────
    (function heroEntrance() {
      const heroH1 = document.querySelector('.hero-h1');
      if (!heroH1) return;

      // Target each .hero-line span individually — each is a plain string,
      // safe for ScrambleText (avoids the DOM element vs string type error).
      const lines = heroH1.querySelectorAll('.hero-line');
      if (!lines.length) return;

      lines.forEach((lineEl, i) => {
        // Store original text before ScrambleText overwrites it
        const targetText = lineEl.textContent.trim();

        // Start each line fully scrambled (opacity at 1, visible from start)
        // ScrambleText begins immediately and resolves at staggered timing
        gsap.to(lineEl, {
          duration: 0.65,
          scrambleText: {
            text: targetText,
            chars: '{[(<>)];|}/\\ ',  // code-adjacent charset
            revealDelay: 0.08,
            speed: 0.55,
            delimiter: '',            // character-level (not word)
          },
          ease: 'power2.out',
          delay: i * 0.12,           // cascade: each line starts 120ms after prev
        });
      });

      // Hero sub + meta fade up — starts after first line begins resolving
      gsap.from(['.hero-sub', '.hero-meta', '.hero-rule'], {
        y: 24,
        opacity: 0,
        duration: 0.75,
        ease: 'power3.out',
        stagger: 0.12,
        delay: 0.55,
      });

      // Status chips in the header row
      gsap.from('.hero .chip', {
        opacity: 0,
        y: -10,
        stagger: 0.08,
        duration: 0.5,
        ease: 'power2.out',
        delay: 0.1,
      });

      // Code-glyph decorative shapes — animate in during scramble
      const decos = document.querySelectorAll('.hero-deco');
      if (decos.length) {
        const decoAnimations = [
          // { — rotates CW and settles, drifts from top-right
          { el: decos[0], from: { x: 30, y: -20, rotation: -25, opacity: 0 }, to: { x: 0, y: 0, rotation: 12, opacity: 0.7, duration: 0.9, ease: 'power3.out', delay: 0.25 } },
          // /> — drifts in from right
          { el: decos[1], from: { x: 40, opacity: 0 }, to: { x: 0, opacity: 0.55, duration: 0.7, ease: 'power2.out', delay: 0.45 } },
          // _ cursor — scales from 0, blinks twice then freezes
          { el: decos[2], from: { scaleX: 0, opacity: 0 }, to: { scaleX: 1, opacity: 0.8, duration: 0.35, ease: 'back.out(1.8)', delay: 0.3 } },
          // ; — falls down from above
          { el: decos[3], from: { y: -30, opacity: 0 }, to: { y: 0, opacity: 0.6, duration: 0.65, ease: 'bounce.out', delay: 0.55 } },
        ];

        decoAnimations.forEach(({ el, from, to }) => {
          gsap.fromTo(el, from, to);
        });

        // Cursor blink: _ blinks twice then stays
        if (decos[2]) {
          gsap.to(decos[2], {
            opacity: 0,
            duration: 0.12,
            repeat: 3,
            yoyo: true,
            ease: 'none',
            delay: 0.75,
            onComplete: () => {
              gsap.set(decos[2], { opacity: 0.8 });
            },
          });
        }

        // Subtle float loop on the shapes after they settle
        decos.forEach((deco, i) => {
          gsap.to(deco, {
            y: `+=${6 + i * 2}`,
            duration: 2.5 + i * 0.4,
            repeat: -1,
            yoyo: true,
            ease: 'power1.inOut',
            delay: 1.2 + i * 0.3,
          });
        });
      }
    })();

    // ── SECTION HEADING WORD REVEALS ─────────────────────────────────────
    // Every h2 inside a section (not hero) splits by words on scroll entry
    document.querySelectorAll('section h2, .work-header h2').forEach((heading) => {
      const split = new SplitText(heading, { type: 'words,lines', linesClass: 'line' });
      gsap.from(split.words, {
        yPercent: 55,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.06,
        scrollTrigger: {
          trigger: heading,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      });
    });

    // ── EYEBROW / SECTION-LABEL REVEAL ───────────────────────────────────
    document.querySelectorAll('.eyebrow, .section-label').forEach((el) => {
      gsap.from(el, {
        opacity: 0,
        x: -12,
        duration: 0.5,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%' },
      });
    });

    // ── VERB REVEAL STRIP — scroll-scrubbed, NO pin ───────────────────────
    // The strip lives in normal flow. As the user scrolls past it, chars
    // transition dim→bright in sequence, and the track drifts slightly left.
    // Removing pin:true eliminates the spacer div that was displacing all
    // downstream sections (About, Skills, Work) by ~2300px.
    (function () {
      const verbEl = document.querySelector('.verb-reveal');
      if (!verbEl) return;

      const track = verbEl.querySelector('.verb-reveal__track');
      if (!track) return;

      // Wrap every character in a .verb-reveal__char span for GSAP targeting
      const wordEls = track.querySelectorAll('.verb-reveal__word');
      wordEls.forEach((wordEl) => {
        const text = wordEl.textContent;
        wordEl.innerHTML = text.split('').map(
          (char) => `<span class="verb-reveal__char">${char}</span>`
        ).join('');
      });

      const allChars = track.querySelectorAll('.verb-reveal__char');
      if (!allChars.length) return;

      requestAnimationFrame(() => {
        // Initial state: all chars dim
        gsap.set(allChars, { color: 'var(--c-muted-2)' });

        let panTween;
        let resizeTimer;

        function initPanTween() {
          if (panTween) {
            if (panTween.scrollTrigger) panTween.scrollTrigger.kill();
            panTween.kill();
            panTween = null;
          }

          // Get containerPadding from the site's existing .container convention
          const containerEl = document.querySelector('.container') || verbEl;
          const containerPadding = parseFloat(window.getComputedStyle(containerEl).paddingLeft) || 0;
          
          const panDistance = track.scrollWidth - verbEl.clientWidth + (containerPadding * 2);

          // Explicitly set the track's starting x before the ScrollTrigger is created
          gsap.set(track, { x: containerPadding });

          // Guard the degenerate case: skip pan tween entirely if narrow
          if (panDistance <= containerPadding) {
            return;
          }

          panTween = gsap.to(track, {
            x: containerPadding - panDistance,
            ease: 'none',
            scrollTrigger: {
              trigger: verbEl,
              scrub: 1,
              start: 'top 90%',     // start when section enters viewport bottom
              end: 'bottom 10%',    // end when section nearly exits viewport top
              invalidateOnRefresh: true,
            },
          });
        }

        initPanTween();

        // Recompute on resize
        window.addEventListener('resize', () => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            initPanTween();
            ScrollTrigger.refresh();
          }, 200);
        });


        // Per-character brightness reveal — staggered across the scrub range
        gsap.fromTo(allChars,
          { color: 'var(--c-muted-2)' },
          {
            color: 'var(--c-text)',
            stagger: { each: 0.016, from: 'start' },
            ease: 'power2.out',
            scrollTrigger: {
              trigger: verbEl,
              scrub: 1,
              start: 'top 75%',
              end: 'bottom 25%',
              invalidateOnRefresh: true,
            },
          }
        );

        // Floating keyword pills — animate in when section enters
        const pills = verbEl.querySelectorAll('.kw-pill');
        const pillPositions = [
          { top: '22%', left: '12%', rotate: -8 },
          { top: '58%', left: '48%', rotate: 5 },
          { top: '28%', left: '72%', rotate: -12 },
        ];
        pills.forEach((pill, i) => {
          const pos = pillPositions[i] || pillPositions[0];
          pill.style.top = pos.top;
          pill.style.left = pos.left;
          gsap.set(pill, { rotation: pos.rotate, opacity: 0, y: 20 });

          gsap.to(pill, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: verbEl,
              start: 'top 70%',
              toggleActions: 'play none none reverse',
            },
            delay: i * 0.15,
          });

          gsap.to(pill, {
            y: '-=8',
            duration: 1.8 + i * 0.3,
            repeat: -1,
            yoyo: true,
            ease: 'power1.inOut',
            delay: 0.9 + i * 0.2,
          });
        });
      }); // end requestAnimationFrame
    })();

    // ── MARQUEE-2 — velocity-linked GSAP loop (tech-stack strip) ─────────
    // Only the second .marquee (tech stack) keeps the loop pattern.
    // marquee-1 is now the verb-reveal section above.
    document.querySelectorAll('.marquee').forEach((marqueeEl) => {
      const track = marqueeEl.querySelector('.marquee__track');
      if (!track || !track.children.length) return;

      // Duplicate content once — GSAP animates -50% which seamlessly loops
      track.innerHTML += track.innerHTML;

      const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'none' } });
      tl.to(track, {
        xPercent: -50,
        duration: 22,
        ease: 'none',
      });

      // Velocity-linked speed: scroll faster → marquee speeds up
      let velocityTarget = 1;
      let currentVelocity = 1;

      ScrollTrigger.create({
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          const rawVelocity = Math.abs(self.getVelocity());
          velocityTarget = gsap.utils.clamp(1, 6, 1 + rawVelocity / 800);
        },
      });

      gsap.ticker.add(() => {
        currentVelocity = gsap.utils.interpolate(currentVelocity, velocityTarget, 0.08);
        tl.timeScale(currentVelocity);
        velocityTarget = gsap.utils.interpolate(velocityTarget, 1, 0.05);
      });
    });

    // ── ABOUT SECTION ─────────────────────────────────────────────────────
    gsap.from('.about__photo', {
      clipPath: 'inset(100% 0 0 0)',
      duration: 1.1,
      ease: 'power4.out',
      scrollTrigger: { trigger: '.about__photo', start: 'top 80%' },
    });
    gsap.from('.about p, .about__side', {
      y: 20,
      opacity: 0,
      stagger: 0.1,
      duration: 0.65,
      ease: 'power2.out',
      scrollTrigger: { trigger: '.about', start: 'top 75%' },
    });

    // ── SKILL ROWS — staggered entrance ──────────────────────────────────
    document.querySelectorAll('.skill-row').forEach((row, i) => {
      const label = row.querySelector('.skill-row__label');
      const chips = row.querySelectorAll('.chip');
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: row,
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
      });
      if (label) tl.from(label, { x: -20, opacity: 0, duration: 0.5, ease: 'power2.out' });
      if (chips.length) {
        tl.from(chips, {
          opacity: 0,
          scale: 0.85,
          stagger: 0.04,
          duration: 0.4,
          ease: 'back.out(1.4)',
        }, '-=0.2');
      }
    });

    // ── PINNED HORIZONTAL WORK SECTION ───────────────────────────────────
    (function initHorizontalWork() {
      const wrapper = document.querySelector('.work-pin-wrapper');
      const container = document.querySelector('.work-pin-container');
      const panels = gsap.utils.toArray('.work-panel');
      if (!wrapper || !container || panels.length < 2) return;

      // On mobile: native scroll handles it, no GSAP pin
      const mq = window.matchMedia('(max-width: 767px)');
      if (mq.matches) return;

      // Horizontal scroll tween — panels slide left as user scrolls
      const horizontalTween = gsap.to(panels, {
        xPercent: -100 * (panels.length - 1),
        ease: 'none',
        scrollTrigger: {
          trigger: wrapper,
          pin: true,
          scrub: 1,
          // 'top top': pin fires when wrapper top hits viewport top.
          // 'bottom bottom' was wrong — it pinned mid-page before the section
          // was fully in view, causing About/Skills to bleed behind the panels.
          start: 'top top',
          snap: {
            snapTo: 1 / (panels.length - 1),
            duration: { min: 0.3, max: 0.6 },
            delay: 0.05,
            ease: 'power2.inOut',
          },
          end: () => '+=' + (container.scrollWidth - window.innerWidth),
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });

      // Per-panel nested entrance animations
      // Panel[0] is special: it's already visible when the pin fires, so play
      // its content immediately on pin entry — not on 'left center' (which
      // only fires once the user has already scrolled horizontally past center,
      // leaving the first panel's details invisible on initial load).
      panels.forEach((panel, idx) => {
        const title = panel.querySelector('.work-panel__title');
        const desc = panel.querySelector('.work-panel__desc');
        const chips = panel.querySelectorAll('.work-panel__chips .chip');
        const links = panel.querySelector('.work-panel__links');
        const cover = panel.querySelector('.work-panel__cover');

        const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });

        if (title) {
          const titleSplit = new SplitText(title, { type: 'lines', linesClass: 'line' });
          tl.from(titleSplit.lines, { yPercent: 100, duration: 0.65, stagger: 0.08 });
        }
        if (desc) tl.from(desc, { y: 16, opacity: 0, duration: 0.5 }, '-=0.3');
        if (chips.length) tl.from(chips, { opacity: 0, stagger: 0.05, duration: 0.35 }, '-=0.3');
        if (links) tl.from(links, { opacity: 0, y: 10, duration: 0.4 }, '-=0.2');
        if (cover) tl.from(cover, { scale: 0.94, opacity: 0, duration: 0.75 }, 0.1);

        if (idx === 0) {
          // First panel is already in view the moment the section pins — play
          // its content as soon as the wrapper enters the viewport.
          ScrollTrigger.create({
            trigger: wrapper,
            start: 'top 80%',
            onEnter: () => tl.play(),
            onLeaveBack: () => tl.restart(),
          });
        } else {
          // Subsequent panels: fire as soon as the panel's left edge crosses 85%
          // of the viewport width — content appears while the panel is still
          // sliding in, not after it's already half-visible.
          ScrollTrigger.create({
            trigger: panel,
            containerAnimation: horizontalTween,
            start: 'left 85%',
            onEnter: () => tl.play(),
            // Keep panels visible after they've animated in — do NOT reverse onLeave.
            onEnterBack: () => tl.play(),
            onLeaveBack: () => tl.restart(),
          });
        }
      });

      // Work-section transition cue (rotate / scale hint before pin)
      const transitionTop = document.querySelector('.work-transition--top');
      const transitionBot = document.querySelector('.work-transition--bottom');

      if (transitionTop) {
        gsap.from(transitionTop.querySelector('.arrow'), {
          x: -8,
          repeat: -1,
          yoyo: true,
          duration: 0.7,
          ease: 'power1.inOut',
        });
      }
      if (transitionBot) {
        gsap.from(transitionBot.querySelector('.arrow'), {
          x: 8,
          repeat: -1,
          yoyo: true,
          duration: 0.7,
          ease: 'power1.inOut',
        });
      }

      // Refresh ScrollTrigger after images load (images affect panel widths)
      document.querySelectorAll('.work-panel img').forEach((img) => {
        img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
      });
    })();

    // ── EXPERIMENTS ───────────────────────────────────────────────────────
    document.querySelectorAll('.exp').forEach((card, i) => {
      gsap.from(card, {
        y: 30,
        opacity: 0,
        duration: 0.65,
        ease: 'power2.out',
        delay: i * 0.1,
        scrollTrigger: { trigger: card, start: 'top 88%' },
      });
    });

    // ── TIMELINE — scrub-driven progress line ─────────────────────────────
    (function initTimeline() {
      const fill = document.querySelector('.timeline-progress__fill');
      const timelineEl = document.querySelector('.timeline');
      if (!fill || !timelineEl) return;

      gsap.to(fill, {
        scaleY: 1,
        transformOrigin: 'top center',
        ease: 'none',
        scrollTrigger: {
          trigger: timelineEl,
          start: 'top 70%',
          end: 'bottom 60%',
          scrub: 0.5,
        },
      });

      // Initial state — scaleY 0
      gsap.set(fill, { scaleY: 0 });

      // Row entrances staggered
      document.querySelectorAll('.timeline__row').forEach((row, i) => {
        gsap.from(row, {
          x: -20,
          opacity: 0,
          duration: 0.55,
          ease: 'power2.out',
          scrollTrigger: { trigger: row, start: 'top 88%' },
        });
      });
    })();

    // ── CONTACT ───────────────────────────────────────────────────────────
    gsap.from('.contact .lede', {
      y: 20,
      opacity: 0,
      duration: 0.7,
      ease: 'power2.out',
      scrollTrigger: { trigger: '.contact', start: 'top 80%' },
    });
    gsap.from('.contact .btn', {
      y: 15,
      opacity: 0,
      stagger: 0.1,
      duration: 0.55,
      ease: 'power2.out',
      scrollTrigger: { trigger: '.contact .row', start: 'top 85%' },
    });

    // ── MICRO-INTERACTIONS — buttons ──────────────────────────────────────
    // GSAP hover on buttons so timing is unified with the animation system
    document.querySelectorAll('.btn').forEach((btn) => {
      btn.addEventListener('mouseenter', () => {
        gsap.to(btn, { scale: 1.03, duration: 0.2, ease: 'power1.out' });
      });
      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, { scale: 1, duration: 0.25, ease: 'power2.out' });
      });
    });

    // ── MICRO-INTERACTIONS — chips ────────────────────────────────────────
    document.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('mouseenter', () => {
        gsap.to(chip, { scale: 1.06, duration: 0.18, ease: 'power1.out' });
      });
      chip.addEventListener('mouseleave', () => {
        gsap.to(chip, { scale: 1, duration: 0.2, ease: 'power2.out' });
      });
    });

    // ── FOOTER ────────────────────────────────────────────────────────────
    gsap.from('.footer-inner', {
      opacity: 0,
      duration: 0.7,
      scrollTrigger: { trigger: 'footer', start: 'top 90%' },
    });

  }); // end gsap.context

} // end if (!prefersReduced)
