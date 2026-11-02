// Motion layer. Bundled by build.js (esbuild) into animation.bundle.js.
// Runs on every page. Every feature early-returns when its required element
// is absent, so sub-pages (case studies, docs) don't throw.
//
// Motion budget:
//   1. One page-load sequence: counter loader -> hero words rise -> highlighter wipes in.
//   2. Project cards stack as you scroll (CSS sticky + scale-back). HOME ONLY.
//   3. The About statement fills in letter by letter while the page holds still (pinned). HOME ONLY.
//   Everything else answers an action (hover, click, scroll direction).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer  = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const isHome       = !document.documentElement.dataset.page; // layout-page.html sets data-page

/* ------------------------------------------------------------
   Set intro-seen flag on every page so the loader is skipped
   if the visitor lands on a case page first, then goes home.
   ------------------------------------------------------------ */
try { sessionStorage.setItem('intro-seen', '1'); } catch (e) { /* private browsing */ }

/* ------------------------------------------------------------
   Live IST clock (hero + footer)
   ------------------------------------------------------------ */
const clockFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  hour12: false,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
const clocks = $$('[data-clock]');
if (clocks.length) {
  const tickClock = () => {
    const t = clockFmt.format(new Date());
    clocks.forEach((el) => (el.textContent = t));
  };
  tickClock();
  setInterval(tickClock, 1000);
}

const year = $('#year');
if (year) year.textContent = new Date().getFullYear();

/* ------------------------------------------------------------
   Smooth scroll
   ------------------------------------------------------------ */
let lenis = null;
if (!reduceMotion) {
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

const navH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 68;

function getTargetElement(hash) {
  if (!hash || hash === '#') return null;
  const rawId = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!rawId) return null;

  // 1. Direct getElementById with raw ID (handles dots, colons, percent signs, numbers)
  let el = document.getElementById(rawId);
  if (el) return el;

  // 2. Direct getElementById with decoded component
  try {
    const decoded = decodeURIComponent(rawId);
    if (decoded !== rawId) {
      el = document.getElementById(decoded);
      if (el) return el;
    }
  } catch (_) {}

  // 3. Direct getElementById with encoded component
  try {
    const encoded = encodeURIComponent(rawId);
    if (encoded !== rawId) {
      el = document.getElementById(encoded);
      if (el) return el;
    }
  } catch (_) {}

  // 4. Fallback using CSS.escape if available
  if (typeof CSS !== 'undefined' && CSS.escape) {
    try {
      el = document.querySelector('#' + CSS.escape(rawId));
      if (el) return el;
    } catch (_) {}
    try {
      el = document.querySelector('#' + CSS.escape(decodeURIComponent(rawId)));
      if (el) return el;
    } catch (_) {}
  }

  // 5. QuerySelector fallback
  try {
    el = $(hash.startsWith('#') ? hash : '#' + hash);
    if (el) return el;
  } catch (_) {}

  return null;
}

function scrollToTarget(hash) {
  if (hash === '#top') {
    lenis ? lenis.scrollTo(0) : window.scrollTo({ top: 0 });
    return;
  }
  const el = getTargetElement(hash);
  if (!el) return;
  // About pins the page while its text fills in; land right where that begins.
  if (hash === '#about' && aboutST && lenis) {
    lenis.scrollTo(aboutST.start, { duration: 1.2 });
    return;
  }
  const offset = 0;
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.0 });
  else el.scrollIntoView({ block: 'start' });
}

document.addEventListener('click', (e) => {
  const a = e.target?.closest ? e.target.closest('a[href^="#"]') : null;
  if (!a || a.getAttribute('href') === '#') return;
  e.preventDefault();
  closeMenu();
  scrollToTarget(a.getAttribute('href'));
});

/* ------------------------------------------------------------
   Page transition
   Two layers (pink leads, ink follows) rise on leave and lift
   on arrive. Spec section 6.
   ------------------------------------------------------------ */
/* ------------------------------------------------------------
   Page transition
   Deterministic two-act architecture:
     Act 1: Cover (pink 0.45s, ink +0.12s for 0.5s) -> label fades in (0.2s) -> navigate
     Hold:  Guaranteed >= PT_MIN_HOLD_MS with destination label + sweeping pink line
     Act 2: Reveal once ready (DOM, fonts, hero image, hold) -> label fades out (0.15s)
            -> ink lifts (0.6s) -> pink trails at t=0.16 -> pt:reveal at t=0.25
   ------------------------------------------------------------ */
(function setupPageTransition() {
  const PT_MIN_HOLD_MS    = 300;
  const PT_READY_CAP_MS   = 4000;
  const PT_FONT_CAP_MS    = 700;
  const PT_IMG_CAP_MS     = 600;
  const PT_NAV_TIMEOUT_MS = 8000;

  const ptEl   = $('.pt');
  const ptPink = $('.pt__pink');
  const ptInk  = $('.pt__ink');

  // Detect reload or history traversal
  const navEntry = window.performance && performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  const navType = navEntry ? navEntry.type : (window.performance && performance.navigation ? (performance.navigation.type === 1 ? 'reload' : (performance.navigation.type === 2 ? 'back_forward' : 'navigate')) : 'navigate');
  const isReloadOrBack = (navType === 'reload' || navType === 'back_forward');

  if (isReloadOrBack) {
    document.documentElement.classList.remove('pt-enter', 'pt-label-in', 'pt-label-out');
    document.documentElement.style.removeProperty('--pt-label');
    try {
      sessionStorage.removeItem('pt');
      sessionStorage.removeItem('pt_t');
      sessionStorage.removeItem('pt_label');
    } catch (e) { /* */ }
    if (ptPink) gsap.set(ptPink, { yPercent: 100 });
    if (ptInk)  gsap.set(ptInk,  { yPercent: 100 });
    if (ptEl)   ptEl.style.pointerEvents = 'none';
  }

  // Arrive: if the head script set pt-enter, run the cover-off animation.
  if (!isReloadOrBack && document.documentElement.classList.contains('pt-enter')) {
    // Focus main immediately (tabindex=-1, no scroll)
    const mainEl = $('#main-content');
    if (mainEl) mainEl.focus({ preventScroll: true });

    // Handle hash-based scroll BEFORE cover lifts
    const doHashScroll = () => {
      const hash = window.location.hash;
      if (!hash || hash === '#') return;
      const target = getTargetElement(hash);
      if (!target) return;
      const offset = 0;
      if (lenis) lenis.scrollTo(target, { offset, immediate: true });
      else target.scrollIntoView({ block: 'start' });
    };

    if (!reduceMotion && ptPink && ptInk && ptEl) {
      let pt_t = 0;
      try {
        pt_t = parseInt(sessionStorage.getItem('pt_t') || '0', 10);
      } catch (e) { /* */ }

      // Ready gates: DOM ready, fonts ready (cap 700ms), first img decoded (cap 600ms), min hold elapsed
      const domPromise = (document.readyState !== 'loading')
        ? Promise.resolve()
        : new Promise((r) => document.addEventListener('DOMContentLoaded', r, { once: true }));

      const fontPromise = document.fonts
        ? Promise.race([
            document.fonts.ready,
            new Promise((r) => setTimeout(r, PT_FONT_CAP_MS)),
          ])
        : Promise.resolve();

      const imgPromise = domPromise.then(() => {
        const img = document.querySelector('main img[fetchpriority="high"], main img:not([loading="lazy"])');
        if (!img) return Promise.resolve();
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return Promise.race([
          img.decode ? img.decode().catch(() => {}) : Promise.resolve(),
          new Promise((r) => setTimeout(r, PT_IMG_CAP_MS)),
        ]);
      });

      const getHoldRemaining = () => {
        if (!pt_t) return 0;
        const elapsed = Date.now() - pt_t;
        return Math.max(0, PT_MIN_HOLD_MS - elapsed);
      };

      const holdPromise = new Promise((r) => {
        const rem = getHoldRemaining();
        if (rem <= 0) r();
        else setTimeout(r, rem);
      });

      let revealStarted = false;

      const startReveal = (isShortened = false) => {
        if (revealStarted) return;
        revealStarted = true;
        window.__pt_hold_elapsed = pt_t ? (Date.now() - pt_t) : PT_MIN_HOLD_MS;

        // Apply hash scroll immediately BEFORE reveal starts (still covered)
        doHashScroll();

        // Label fades out (0.15s)
        document.documentElement.classList.add('pt-label-out');

        const dur = isShortened ? 0.4 : 0.6;
        const pinkDelay = isShortened ? 0.1 : 0.16;
        const revealEventTime = isShortened ? 0.16 : 0.25;

        const tl = gsap.timeline({
          onComplete: () => {
            document.documentElement.classList.remove('pt-enter', 'pt-label-in', 'pt-label-out');
            document.documentElement.style.removeProperty('--pt-label');
            try {
              sessionStorage.removeItem('pt');
              sessionStorage.removeItem('pt_t');
              sessionStorage.removeItem('pt_label');
            } catch (e) { /* */ }
            if (ptPink) gsap.set(ptPink, { yPercent: -100 });
            if (ptInk)  gsap.set(ptInk,  { yPercent: -100 });
            if (ptEl)   ptEl.style.pointerEvents = 'none';
          },
        });

        // Ink lifts over dur, pink trails by pinkDelay (pink is the last edge)
        tl.to(ptInk,  { yPercent: -100, duration: dur, ease: 'power3.inOut' }, 0);
        tl.to(ptPink, { yPercent: -100, duration: dur, ease: 'power3.inOut' }, pinkDelay);
        tl.call(() => {
          document.dispatchEvent(new CustomEvent('pt:reveal'));
        }, null, revealEventTime);
      };

      // Absolute failsafe at PT_READY_CAP_MS: do not snap, run shortened animated reveal
      const failsafe = setTimeout(() => {
        startReveal(true);
      }, PT_READY_CAP_MS);

      Promise.all([domPromise, fontPromise, imgPromise, holdPromise]).then(() => {
        clearTimeout(failsafe);
        startReveal(false);
      });
    } else {
      // Reduced motion: no animation, just remove class and scroll
      document.documentElement.classList.remove('pt-enter', 'pt-label-in', 'pt-label-out');
      document.documentElement.style.removeProperty('--pt-label');
      try {
        sessionStorage.removeItem('pt');
        sessionStorage.removeItem('pt_t');
        sessionStorage.removeItem('pt_label');
      } catch (e) { /* */ }
      if (ptEl) ptEl.style.pointerEvents = 'none';
      doHashScroll();
    }
  }

  // Leave: intercept clicks and animate cover-in before navigating.
  let navigating = false;
  let leaveFailsafeTimer = null;
  let leaveTimeoutTimer  = null;

  const resetLeaveState = () => {
    navigating = false;
    if (leaveFailsafeTimer) {
      clearTimeout(leaveFailsafeTimer);
      leaveFailsafeTimer = null;
    }
    if (leaveTimeoutTimer) {
      clearTimeout(leaveTimeoutTimer);
      leaveTimeoutTimer = null;
    }
  };

  // bfcache / history traversal restore: reset layers, flags, and cancel pending timers
  window.addEventListener('pageshow', (e) => {
    resetLeaveState();
    if (!e.persisted) return;
    document.documentElement.classList.remove('pt-enter', 'pt-label-in', 'pt-label-out');
    document.documentElement.style.removeProperty('--pt-label');
    try {
      sessionStorage.removeItem('pt');
      sessionStorage.removeItem('pt_t');
      sessionStorage.removeItem('pt_label');
    } catch (e2) { /* */ }
    if (ptPink) gsap.set(ptPink, { yPercent: 100 });
    if (ptInk)  gsap.set(ptInk,  { yPercent: 100 });
    if (ptEl)   ptEl.style.pointerEvents = 'none';
  });

  window.addEventListener('pagehide', () => {
    resetLeaveState();
  });

  window.addEventListener('popstate', () => {
    resetLeaveState();
  });

  function shouldIntercept(a) {
    if (!a)                             return false;
    if (a.dataset.noTransition != null) return false;
    const href = a.getAttribute('href');
    if (!href)                          return false;

    // External links, mailto, tel, download
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download'))        return false;
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return false;

    // Pure same-page anchors — Lenis owns those
    if (href.startsWith('#')) return false;

    // Hash-only change on same path (e.g. /work/pcgo#docs -> /work/pcgo#overview)
    try {
      const dest = new URL(href, window.location.href);
      if (dest.origin !== window.location.origin) return false;
      if (dest.pathname === window.location.pathname && dest.hash) return false;
      if (dest.href === window.location.href) return false;

      // Skip files with extensions (except .html)
      const ext = dest.pathname.match(/\.([^./]+)$/);
      if (ext && ext[1].toLowerCase() !== 'html') return false;

      // Intra-docs navigation: do not run heavy full-screen transition when switching between doc pages
      const isCurrentDocs = /^\/work\/[^/]+\/docs/.test(window.location.pathname);
      const isDestDocs    = /^\/work\/[^/]+\/docs/.test(dest.pathname);
      if (isCurrentDocs && isDestDocs) return false;
    } catch (e) {
      return false;
    }

    return true;
  }

  document.addEventListener('click', (e) => {
    if (navigating) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const a = e.target?.closest ? e.target.closest('a[href]') : null;
    if (!shouldIntercept(a)) return;

    // Skip if it's a hash-only link (already handled by the Lenis listener above)
    const href = a.getAttribute('href');
    const dest = new URL(href, window.location.href);
    if (dest.pathname === window.location.pathname && dest.hash) return;

    e.preventDefault();
    navigating = true;
    let navigated = false;

    // Resolve destination label
    let label = a.dataset.ptLabel;
    if (!label) {
      const visibleText = (a.innerText || a.textContent || '').trim().replace(/\s+/g, ' ');
      label = visibleText.slice(0, 40);
    }
    if (!label) label = 'Loading';
    if (label.length > 40) label = label.slice(0, 40);

    const navigate = () => {
      if (navigated) return;
      navigated = true;
      try {
        sessionStorage.setItem('pt', '1');
        sessionStorage.setItem('pt_t', String(Date.now()));
        sessionStorage.setItem('pt_label', label);
      } catch (ssErr) {
        // sessionStorage unavailable — reset cover and navigate
        gsap.set(ptPink, { yPercent: 100 });
        gsap.set(ptInk,  { yPercent: 100 });
        document.documentElement.classList.remove('pt-label-in');
        document.documentElement.style.removeProperty('--pt-label');
        if (ptEl) ptEl.style.pointerEvents = 'none';
        navigating = false;
        location.assign(dest.href);
        return;
      }
      location.assign(dest.href);
    };

    if (reduceMotion || !ptPink || !ptInk || !ptEl) {
      // Reduced motion: no animation, no flags in sessionStorage
      navigating = false;
      location.assign(dest.href);
      return;
    }

    ptEl.style.pointerEvents = 'auto';

    // Set the label CSS property so pseudo-element has the destination name
    document.documentElement.style.setProperty('--pt-label', JSON.stringify(label));

    // Cover-in: pink leads (0.45s), ink starts +0.12s (0.5s)
    const tl = gsap.timeline();
    tl.fromTo(ptPink, { yPercent: 100 }, { yPercent: 0, duration: 0.45, ease: 'power3.inOut' }, 0);
    tl.fromTo(ptInk,  { yPercent: 100 }, { yPercent: 0, duration: 0.5,  ease: 'power3.inOut' }, 0.12);

    // Once ink fully covers (at t=0.62), fade label in (0.2s)
    tl.call(() => {
      document.documentElement.classList.add('pt-label-in');
    }, null, 0.62);

    // Act 1 ends on label + black; navigate at t=0.82
    tl.call(() => {
      navigate();
    }, null, 0.82);

    // Failsafe: only call navigate if timeline hasn't navigated yet
    leaveFailsafeTimer = setTimeout(() => {
      if (!navigated) navigate();
    }, 1400);

    // Timeout: if navigation has not committed after PT_NAV_TIMEOUT_MS (offline / slow)
    leaveTimeoutTimer = setTimeout(() => {
      if (navigating) {
        document.documentElement.classList.remove('pt-label-in');
        gsap.to([ptPink, ptInk], {
          yPercent: 100,
          duration: 0.4,
          ease: 'power3.inOut',
          onComplete: () => {
            if (ptEl) ptEl.style.pointerEvents = 'none';
            document.documentElement.style.removeProperty('--pt-label');
            try {
              sessionStorage.removeItem('pt');
              sessionStorage.removeItem('pt_t');
              sessionStorage.removeItem('pt_label');
            } catch (e) { /* */ }
            navigating = false;
            navigated = false;
          },
        });
      }
    }, PT_NAV_TIMEOUT_MS);
  });

  window.addEventListener('pagehide', () => {
    clearTimeout(leaveFailsafeTimer);
    clearTimeout(leaveTimeoutTimer);
  });

  // Prefetch on pointer/focus enter (desktop only, skip saveData)
  if (finePointer && !navigator.connection?.saveData) {
    const prefetched = new Set();
    const maybePrefetch = (a) => {
      const href = a?.getAttribute('href');
      if (!href || prefetched.has(href)) return;
      if (a.target && a.target !== '_self') return;
      if (a.hasAttribute('download')) return;
      if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
      try {
        const dest = new URL(href, window.location.href);
        if (dest.origin !== window.location.origin) return;
        if (dest.pathname === window.location.pathname) return;
        const ext = dest.pathname.match(/\.([^./]+)$/);
        if (ext && ext[1].toLowerCase() !== 'html') return;

        prefetched.add(href);
        const link = document.createElement('link');
        link.rel  = 'prefetch';
        link.href = dest.href;
        document.head.appendChild(link);
      } catch (e) { /* */ }
    };
    document.addEventListener('pointerenter', (e) => {
      const a = e.target?.closest ? e.target.closest('a[href]') : null;
      if (a) maybePrefetch(a);
    }, true);
    document.addEventListener('focusin', (e) => {
      const a = e.target?.closest ? e.target.closest('a[href]') : null;
      if (a) maybePrefetch(a);
    }, true);
  }
})();

/* ------------------------------------------------------------
   Nav: scrolled state, scroll-spy, sliding highlighter, mobile menu
   ------------------------------------------------------------ */
const nav      = $('[data-nav]');
const navLinks = $$('.nav__links a');
const indicator = $('.nav__indicator');
const toggle   = $('.nav__toggle');
const menu     = $('#menu');

function moveIndicator(link) {
  if (!indicator) return;
  if (!link) {
    gsap.to(indicator, { opacity: 0, duration: 0.2 });
    return;
  }
  const first = indicator.style.opacity === '' || indicator.style.opacity === '0';
  gsap.to(indicator, {
    x: link.offsetLeft,
    width: link.offsetWidth,
    opacity: 1,
    duration: first ? 0 : 0.45,
    ease: 'power3.out',
  });
}

function setActive(id) {
  let active = null;
  navLinks.forEach((a) => {
    const href = a.getAttribute('href');
    const on   = href === `#${id}` || href === `/#${id}`;
    if (on) {
      a.setAttribute('aria-current', 'true');
      active = a;
    } else {
      a.removeAttribute('aria-current');
    }
  });
  moveIndicator(active);
}

// Continuous scroll-spy: partition-based to guarantee no flicker or gap between sections
const spySections = ['work', 'about', 'skills', 'contact']
  .map((id) => document.getElementById(id))
  .filter(Boolean);
let currentSpy = null;

function updateScrollSpy() {
  if (!spySections.length) return;
  const isBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 30;
  if (isBottom) {
    const last = spySections[spySections.length - 1];
    if (currentSpy !== last.id) {
      currentSpy = last.id;
      setActive(currentSpy);
    }
    return;
  }

  const triggerY = Math.round(window.innerHeight * 0.35);
  let activeSection = null;

  for (let i = 0; i < spySections.length; i++) {
    const sec = spySections[i];
    const top = sec.getBoundingClientRect().top;
    if (top <= triggerY) {
      activeSection = sec.id;
    } else {
      break;
    }
  }

  if (currentSpy !== activeSection) {
    currentSpy = activeSection;
    setActive(currentSpy);
  }
}

if (spySections.length) {
  if (lenis) lenis.on('scroll', updateScrollSpy);
  window.addEventListener('scroll', updateScrollSpy, { passive: true });
  updateScrollSpy();
}

window.addEventListener('resize', () => {
  const on = $('.nav__links a[aria-current="true"]');
  if (on) moveIndicator(on);
  updateScrollSpy();
});

if (nav) {
  const syncNav = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', syncNav, { passive: true });
  syncNav();
}

function openMenu() {
  if (!nav || !menu || !toggle) return;
  nav.classList.add('is-open');
  menu.hidden = false;
  toggle.setAttribute('aria-expanded', 'true');
  toggle.setAttribute('aria-label', 'Close menu');
  lenis && lenis.stop();
  document.documentElement.style.overflow = 'hidden';
  if (!reduceMotion) {
    gsap.fromTo(menu.children, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out' });
  }
}
function closeMenu() {
  if (!nav || !nav.classList.contains('is-open')) return;
  nav.classList.remove('is-open');
  if (menu) menu.hidden = true;
  if (toggle) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
  }
  lenis && lenis.start();
  document.documentElement.style.overflow = '';
}
if (toggle) toggle.addEventListener('click', () => (nav.classList.contains('is-open') ? closeMenu() : openMenu()));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
window.matchMedia('(min-width: 900px)').addEventListener('change', closeMenu);

/* ------------------------------------------------------------
   Scroll progress bar
   ------------------------------------------------------------ */
if (!reduceMotion && $('.progress__bar')) {
  const docArticle = $('.doc-article');
  if (docArticle) {
    gsap.to('.progress__bar', {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: docArticle,
        start: 'top top+=68',
        end: 'bottom bottom',
        scrub: 0.2,
      },
    });
  } else {
    gsap.to('.progress__bar', {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.2 },
    });
  }
}

/* ------------------------------------------------------------
   Intro: loader counter -> panel wipe -> hero words -> highlighter
   HOME ONLY
   ------------------------------------------------------------ */
const loader   = $('.loader');
const words    = $$('.hero__h1 .w__in');
const hl       = $('.hl');
const heroBits = $$('.hero__status, .hero__foot');

function endIntro() {
  if (loader) loader.remove();
}

function runIntro() {
  // Guard: only run if hero elements actually exist
  if (!words.length && !hl && !heroBits.length) {
    endIntro();
    return;
  }

  const seen       = sessionStorage.getItem('intro-seen-home') === '1';
  const isPtEnter  = document.documentElement.classList.contains('pt-enter');
  const skipLoader = reduceMotion || seen || isPtEnter;

  if (reduceMotion) {
    endIntro();
    return;
  }

  // Set initial hidden states synchronously
  gsap.set(words, { yPercent: 115 });
  const hlClosedRight = hl ? Math.ceil(hl.getBoundingClientRect().width) + 40 : 0;
  if (hl) gsap.set(hl, { clipPath: `inset(-12px ${hlClosedRight}px -16px -12px)` });
  gsap.set(heroBits, { opacity: 0, y: 16 });

  const playHeroIntro = () => {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.to(words, { yPercent: 0, duration: 1, stagger: 0.07 }, 0);
    if (hl) tl.to(hl, { clipPath: 'inset(-12px -16px -16px -12px)', duration: 0.7, ease: 'power3.inOut' }, '-=0.45');
    tl.to(heroBits, { opacity: 1, y: 0, duration: 0.8, stagger: 0.12 }, '-=0.6');
    try { sessionStorage.setItem('intro-seen-home', '1'); } catch (e) { /* */ }
  };

  if (isPtEnter) {
    endIntro();
    // Wait for pt:reveal before animating hero
    document.addEventListener('pt:reveal', playHeroIntro, { once: true });
    return;
  }

  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

  if (!skipLoader && loader) {
    const count   = $('.loader__count');
    const counter = { v: 0 };
    tl.to(counter, {
      v: 100,
      duration: 1.1,
      ease: 'power2.inOut',
      onUpdate: () => (count.textContent = String(Math.round(counter.v)).padStart(3, '0')),
    });
    tl.to(loader, { yPercent: -100, duration: 0.8, ease: 'power4.inOut', onComplete: endIntro }, '+=0.15');
  } else {
    endIntro();
  }

  tl.to(words, { yPercent: 0, duration: 1, stagger: 0.07 }, skipLoader ? 0 : '-=0.35');
  if (hl) tl.to(hl, { clipPath: 'inset(-12px -16px -16px -12px)', duration: 0.7, ease: 'power3.inOut' }, '-=0.45');
  tl.to(heroBits, { opacity: 1, y: 0, duration: 0.8, stagger: 0.12 }, '-=0.6');

  try { sessionStorage.setItem('intro-seen-home', '1'); } catch (e) { /* */ }
}

// Only run intro on home page
if (isHome) {
  runIntro();
}

/* ------------------------------------------------------------
   Case & Doc Page Entrance Animation
   Synchronously stages initial hidden state if arriving via pt-enter,
   and animates in when pt:reveal fires. If landing directly, plays immediately.
   ------------------------------------------------------------ */
(function setupPageEntrance() {
  if (reduceMotion) return;

  const isCase = document.querySelector('.cs-hero');
  const isDoc  = document.querySelector('.doc-header');

  if (!isCase && !isDoc) return;

  const targets = isCase
    ? $$('.cs-hero__meta, .cs-hero__title-block, .cs-lead, .cs-hero__actions, .cs-hero__media')
    : $$('.doc-header__reading-time, .doc-header__title, .doc-header__summary');

  if (!targets.length) return;

  const playEntrance = () => {
    gsap.to(targets, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      stagger: 0.08,
      ease: 'power3.out',
    });
  };

  if (document.documentElement.classList.contains('pt-enter')) {
    gsap.set(targets, { opacity: 0, y: 20 });
    document.addEventListener('pt:reveal', playEntrance, { once: true });
  } else {
    gsap.fromTo(targets,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }
    );
  }
})();

/* ------------------------------------------------------------
   Ticker: loops forever, speeds up and reverses with scroll
   ------------------------------------------------------------ */
const track = $('.ticker__track');
if (track && !reduceMotion) {
  const group = $('.ticker__group', track);
  if (group) {
    const unit = group.innerHTML;
    while (group.scrollWidth < window.innerWidth) group.insertAdjacentHTML('beforeend', unit);
    track.appendChild(group.cloneNode(true));

    const loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: 40, repeat: -1 });
    ScrollTrigger.create({
      onUpdate: (self) => {
        const v   = self.getVelocity();
        const dir = self.direction;
        gsap.to(loop, { timeScale: dir * (1 + Math.min(Math.abs(v) / 250, 5)), duration: 0.2, overwrite: true });
        gsap.to(loop, { timeScale: dir, duration: 0.8, delay: 0.2, overwrite: false });
      },
    });
  }
}

/* ------------------------------------------------------------
   Work list index (.wrow) & Sticky Preview Panel (.wpanel) — HOME ONLY
   Desktop: 2-column layout with fixed-height rows and sticky preview.
   Row hover/focus activates corresponding preview and caption.
   Pointer leave keeps last active.
   ------------------------------------------------------------ */
(function setupWorkPanel() {
  const workIndex = $('.work-index');
  const rows = $$('.wrow');
  const panelImgs = $$('.wpanel__img');
  const captionItems = $$('.wpanel__caption-item');

  if (!workIndex || !rows.length) return;

  function activate(slug) {
    rows.forEach((r) => r.classList.toggle('is-active', r.dataset.slug === slug));
    panelImgs.forEach((img) => img.classList.toggle('is-active', img.dataset.slug === slug));
    captionItems.forEach((cap) => cap.classList.toggle('is-active', cap.dataset.slug === slug));
  }

  // Default active = row 1 on load
  if (rows[0] && rows[0].dataset.slug) {
    activate(rows[0].dataset.slug);
  }

  // Bind desktop interaction only for fine pointer
  if (finePointer) {
    rows.forEach((row) => {
      const slug = row.dataset.slug;
      row.addEventListener('pointerenter', () => activate(slug));
      row.addEventListener('focusin', () => activate(slug));
    });
  }
})();

/* ------------------------------------------------------------
   Case study tabs  (.cs-tabs / .cs-tab / .cs-tab-panel)
   ARIA tab pattern. Keyboard: Left/Right arrow, Home, End.
   ------------------------------------------------------------ */
(function setupCSTabs() {
  const tabLists = $$('.cs-tabs[role="tablist"]');
  if (!tabLists.length) return;

  tabLists.forEach((tabList) => {
    const tabs   = $$('.cs-tab', tabList);
    const panels = tabs.map((t) => $(('#' + t.getAttribute('aria-controls').replace(/^#/, ''))));

    function activate(tab) {
      tabs.forEach((t, i) => {
        const isTarget = t === tab;
        t.setAttribute('aria-selected', String(isTarget));
        t.classList.toggle('is-active', isTarget);
        t.tabIndex = isTarget ? 0 : -1;
        const panel = panels[i];
        if (panel) panel.hidden = !isTarget;
      });
      tab.focus();
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => activate(tab));
      tab.addEventListener('keydown', (e) => {
        const idx = tabs.indexOf(tab);
        if (e.key === 'ArrowRight') { e.preventDefault(); activate(tabs[(idx + 1) % tabs.length]); }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); activate(tabs[(idx - 1 + tabs.length) % tabs.length]); }
        if (e.key === 'Home')       { e.preventDefault(); activate(tabs[0]); }
        if (e.key === 'End')        { e.preventDefault(); activate(tabs[tabs.length - 1]); }
      });
    });
  });
})();

/* ------------------------------------------------------------
   About: pin + fill-in — HOME ONLY
   Do not refactor or touch the About pin logic.
   ------------------------------------------------------------ */
const aboutLead = $('.about__lead');
const statement  = $('[data-scrub]');
let aboutST      = null;

if (aboutLead && statement && !reduceMotion) {
  const split  = SplitText.create(statement, { type: 'words,chars', charsClass: 'char', aria: 'none' });
  let aboutTL  = null;
  let aboutW   = 0;

  const teardownAbout = () => {
    if (aboutTL) {
      if (aboutTL.scrollTrigger) aboutTL.scrollTrigger.kill(true);
      aboutTL.kill();
    }
    aboutTL = null;
    aboutST = null;
    gsap.set(split.chars, { opacity: 0.16 });
  };

  const setupAbout = () => {
    teardownAbout();
    aboutW = window.innerWidth;
    const pinned   = aboutLead.offsetHeight + navH() + 32 <= window.innerHeight;
    const distance = () => Math.round(Math.max(window.innerHeight * 1.4, 800));

    aboutTL = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: pinned
        ? {
            trigger: aboutLead,
            start:   () => `center ${Math.round(window.innerHeight / 2 + navH() / 2)}px`,
            end:     () => `+=${distance()}`,
            pin:     true,
            scrub:   0.4,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          }
        : {
            trigger: statement.closest('.about__statement'),
            start:   'top 82%',
            end:     'bottom 55%',
            scrub:   0.4,
          },
    });

    aboutTL.fromTo(
      split.chars,
      { opacity: 0.16 },
      { opacity: 1, duration: 0.06, stagger: { amount: 0.9 } }
    );
    aboutTL.to({}, { duration: pinned ? 0.1 : 0.001 });
    aboutST = aboutTL.scrollTrigger;
  };

  setupAbout();

  let aboutResizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(aboutResizeTimer);
    aboutResizeTimer = setTimeout(() => {
      if (window.innerWidth !== aboutW) {
        setupAbout();
        ScrollTrigger.refresh();
      }
    }, 200);
  });

  const resetAbout = () => { setupAbout(); ScrollTrigger.refresh(); };
  document.fonts && document.fonts.ready.then(resetAbout);
  window.addEventListener('load', resetAbout);
}

/* ------------------------------------------------------------
   Contact: copy email
   ------------------------------------------------------------ */
const copyBtn    = $('[data-copy]');
const copyStatus = $('[data-copy-status]');
const mail       = $('[data-email]');
if (copyBtn && mail) {
  const label = copyBtn.textContent;
  let timer;
  copyBtn.addEventListener('click', async () => {
    const value = mail.dataset.email;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity  = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    copyBtn.textContent = 'Copied';
    if (copyStatus) copyStatus.textContent = 'Email address copied to clipboard';
    clearTimeout(timer);
    timer = setTimeout(() => {
      copyBtn.textContent = label;
      if (copyStatus) copyStatus.textContent = '';
    }, 1800);
  });

  const press   = () => copyBtn.classList.add('is-pressed');
  const release = () => copyBtn.classList.remove('is-pressed');
  copyBtn.addEventListener('pointerdown', press);
  copyBtn.addEventListener('pointerup', release);
  copyBtn.addEventListener('pointercancel', release);
  copyBtn.addEventListener('pointerleave', release);
}

/* ------------------------------------------------------------
   Magnetic buttons + cursor ring (mouse only)
   ------------------------------------------------------------ */
if (finePointer && !reduceMotion) {
  $$('[data-magnetic]').forEach((el) => {
    const qx = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' });
    const qy = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' });
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      qx((e.clientX - (r.left + r.width / 2)) * 0.25);
      qy((e.clientY - (r.top + r.height / 2)) * 0.25);
    });
    el.addEventListener('mouseleave', () => { qx(0); qy(0); });
  });

  const ring = $('.cursor');
  if (ring) {
    document.body.classList.add('has-cursor');
    const rx = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3.out' });
    const ry = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3.out' });
    let shown = false;
    window.addEventListener('mousemove', (e) => {
      if (!shown) {
        shown = true;
        gsap.set(ring, { x: e.clientX, y: e.clientY });
        gsap.to(ring, { opacity: 1, duration: 0.3 });
      }
      rx(e.clientX);
      ry(e.clientY);
    });
    document.addEventListener('mouseover', (e) => {
      const hot  = e.target?.closest ? e.target.closest('a, button, .frame') : null;
      const size = hot ? 68.4 : 36;
      gsap.to(ring, {
        width:      size,
        height:     size,
        marginTop:  -size / 2,
        marginLeft: -size / 2,
        duration:   0.3,
        ease:       'power3.out',
      });
    });
    document.addEventListener('mouseleave', () => gsap.to(ring, { opacity: 0, duration: 0.2 }));
  }
}

/* ------------------------------------------------------------
   Layout settles after webfonts + images — HOME ONLY
   ------------------------------------------------------------ */
if (isHome) {
  document.fonts && document.fonts.ready.then(() => {
    ScrollTrigger.refresh();
  });
  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
  });
}

/* ------------------------------------------------------------
   Doc reader: TOC rail & details active link observer
   ------------------------------------------------------------ */
(function setupDocTocObserver() {
  const allLinks = Array.from(document.querySelectorAll('.doc-toc-rail a[href^="#"], .doc-toc-details a[href^="#"]'));
  if (!allLinks.length) return;

  const headingItems = [];
  const seenTargets = new Set();

  allLinks.forEach((a) => {
    const href = a.getAttribute('href');
    const target = getTargetElement(href);
    if (target && !seenTargets.has(target)) {
      seenTargets.add(target);
      headingItems.push({ target, href });
    }
  });

  if (!headingItems.length) return;

  // Sort headings in visual document position
  headingItems.sort((a, b) => {
    const pos = a.target.compareDocumentPosition(b.target);
    return (pos & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
  });

  const tocRail = document.querySelector('.doc-toc-rail');

  function scrollActiveTocIntoView() {
    if (!tocRail || tocRail.scrollHeight <= tocRail.clientHeight) return;
    const activeLinks = tocRail.querySelectorAll('a.is-active');
    if (!activeLinks.length) return;
    const activeLink = activeLinks[activeLinks.length - 1];

    const railRect = tocRail.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();

    if (linkRect.bottom > railRect.bottom) {
      tocRail.scrollTop += (linkRect.bottom - railRect.bottom) + 24;
    } else if (linkRect.top < railRect.top) {
      tocRail.scrollTop -= (railRect.top - linkRect.top) + 24;
    }
  }

  function setActiveHrefs(hrefs) {
    const activeSet = new Set(Array.isArray(hrefs) ? hrefs : [hrefs]);
    allLinks.forEach((l) => {
      const h = l.getAttribute('href');
      if (activeSet.has(h)) {
        l.classList.add('is-active');
        l.setAttribute('aria-current', 'true');
      } else {
        l.classList.remove('is-active');
        l.removeAttribute('aria-current');
      }
    });
    scrollActiveTocIntoView();
  }

  // Set initial active link
  setActiveHrefs(headingItems[0].href);

  // When a TOC link is clicked, keep it active until the user manually initiates scroll (wheel / touch / keyboard / outside click).
  // Avoid arbitrary timeouts that snap back while smooth scroll or reading is underway.
  let userClickedHref = null;

  allLinks.forEach((a) => {
    a.addEventListener('click', () => {
      const href = a.getAttribute('href');
      userClickedHref = href;
      setActiveHrefs(href);
    });
  });

  const clearUserClick = () => {
    userClickedHref = null;
  };

  window.addEventListener('wheel', clearUserClick, { passive: true });
  window.addEventListener('touchmove', clearUserClick, { passive: true });
  document.addEventListener('pointerdown', (e) => {
    if (!e.target?.closest || !e.target.closest('.doc-toc-rail, .doc-toc-details')) {
      userClickedHref = null;
    }
  }, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Space', 'Home', 'End'].includes(e.code)) {
      userClickedHref = null;
    }
  }, { passive: true });

  function updateActiveHeading() {
    if (userClickedHref) return;

    const scrollY = window.scrollY || window.pageYOffset || 0;
    const innerHeight = window.innerHeight;
    const scrollHeight = document.documentElement.scrollHeight;
    const maxScroll = scrollHeight - innerHeight;
    const headerH = navH();

    // Bottom of page check: if scrolled near or at the bottom (within 40px),
    // check visible concluding headings. If multiple are in view (e.g. "Lessons Learned" and "Impact"
    // on concise documents), highlight both. If only one is visible, highlight that one.
    if (maxScroll > 0 && scrollY >= maxScroll - 40) {
      const visibleAtBottom = headingItems.filter((item) => {
        const top = item.target.getBoundingClientRect().top;
        return top >= headerH && top <= innerHeight * 0.75;
      });

      if (visibleAtBottom.length >= 2) {
        setActiveHrefs(visibleAtBottom.map((v) => v.href));
        return;
      } else if (visibleAtBottom.length === 1) {
        setActiveHrefs(visibleAtBottom[0].href);
        return;
      } else {
        setActiveHrefs(headingItems[headingItems.length - 1].href);
        return;
      }
    }

    const threshold = headerH + 50;

    // Find the last heading whose top position is <= threshold
    let activeIndex = 0;
    for (let i = 0; i < headingItems.length; i++) {
      const top = headingItems[i].target.getBoundingClientRect().top;
      if (top <= threshold) {
        activeIndex = i;
      } else {
        break;
      }
    }

    // Tail reading focus check: for short concluding sections that cannot scroll all the way to threshold,
    // if the second-to-last heading is in reading view (top <= 45% viewport) and we haven't reached lastItem,
    // focus stays on the second-to-last heading (never falling back to an earlier heading like third-last).
    const secondLastIdx = headingItems.length - 2;
    if (secondLastIdx >= 0 && activeIndex < secondLastIdx) {
      const secondLastTop = headingItems[secondLastIdx].target.getBoundingClientRect().top;
      if (secondLastTop <= innerHeight * 0.45) {
        activeIndex = secondLastIdx;
      }
    }

    setActiveHrefs(headingItems[activeIndex].href);
  }

  window.addEventListener('scroll', updateActiveHeading, { passive: true });
  window.addEventListener('resize', updateActiveHeading, { passive: true });
  if (lenis) {
    lenis.on('scroll', updateActiveHeading);
  }

  updateActiveHeading();
})();

/* ------------------------------------------------------------
   Doc reader: auto-scroll active sidebar link into view
   ------------------------------------------------------------ */
(function setupDocSidebarAutoScroll() {
  const sidebar = document.querySelector('.doc-layout__sidebar');
  if (!sidebar) return;

  const scrollActiveLink = () => {
    const activeLink = sidebar.querySelector('a[aria-current="page"]');
    if (!activeLink) return;
    const sidebarRect = sidebar.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();

    if (linkRect.bottom > sidebarRect.bottom) {
      sidebar.scrollTop += (linkRect.bottom - sidebarRect.bottom) + 32;
    } else if (linkRect.top < sidebarRect.top) {
      sidebar.scrollTop -= (sidebarRect.top - linkRect.top) + 32;
    }
  };

  scrollActiveLink();
  requestAnimationFrame(scrollActiveLink);
  window.addEventListener('load', scrollActiveLink, { once: true });
})();

