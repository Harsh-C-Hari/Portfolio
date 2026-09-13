/**
 * animation.js — Harsh C Hari Portfolio
 * GSAP-driven motion system: hero entrance, scroll reveals,
 * marquee (velocity-linked), horizontal pinned work, smooth scroll.
 *
 * Bundled by esbuild -> animation.bundle.js
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Observer } from 'gsap/Observer';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText, Observer);

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

  // Add scrolled class for backdrop blur
  ScrollTrigger.create({
    start: 'top -60',
    onToggle: ({ isActive }) => nav.classList.toggle('is-scrolled', isActive),
  });

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
          if (lenis) {
            lenis.scrollTo(target, { offset: -64, duration: 1.4 });
          } else {
            const offsetTop = target.getBoundingClientRect().top + window.pageYOffset - 64;
            window.scrollTo({ top: offsetTop < 0 ? 0 : offsetTop, behavior: 'smooth' });
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

    // ── HERO ENTRANCE — SplitText char animation ──────────────────────────
    (function heroEntrance() {
      const heroH1 = document.querySelector('.hero-h1');
      if (!heroH1) return;

      // Split by chars, wrapping each line for clip
      const split = new SplitText(heroH1, {
        type: 'chars,lines',
        linesClass: 'line',
      });

      gsap.from(split.chars, {
        yPercent: 110,
        opacity: 0,
        duration: 0.85,
        ease: 'power4.out',
        stagger: { amount: 0.55, from: 'start' },
        delay: 0.15,
        onComplete: () => {
          // Revert the split so the DOM is clean for resize / copy-paste
          // Keep the chars in place visually — don't revert, just leave.
        },
      });

      // Hero sub + meta fade up
      gsap.from(['.hero-sub', '.hero-meta', '.hero-rule'], {
        y: 24,
        opacity: 0,
        duration: 0.75,
        ease: 'power3.out',
        stagger: 0.12,
        delay: 0.6,
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

    // ── MARQUEE — velocity-linked GSAP loop ───────────────────────────────
    // The marquee HTML has one set of words. We duplicate the track content
    // once in JS, then animate xPercent -50 on repeat with GSAP.
    // Scroll velocity modulates the playback rate — original, not in any template.
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
      // This is the original motion idea — not in any reference source.
      let velocityTarget = 1;
      let currentVelocity = 1;

      ScrollTrigger.create({
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          // Map scroll velocity (px/s) to a timeline scale multiplier
          const rawVelocity = Math.abs(self.getVelocity());
          velocityTarget = gsap.utils.clamp(1, 6, 1 + rawVelocity / 800);
        },
      });

      // Smooth interpolation of the speed multiplier
      gsap.ticker.add(() => {
        currentVelocity = gsap.utils.interpolate(currentVelocity, velocityTarget, 0.08);
        tl.timeScale(currentVelocity);
        // Decay back toward 1 when not scrolling
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
          start: 'bottom bottom',
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

      // Per-panel nested entrance animations (triggered when panel reaches center)
      panels.forEach((panel) => {
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

        ScrollTrigger.create({
          trigger: panel,
          containerAnimation: horizontalTween,
          start: 'left center',
          onEnter: () => tl.play(),
          onEnterBack: () => tl.play(),
          onLeave: () => tl.reverse(),
        });
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
