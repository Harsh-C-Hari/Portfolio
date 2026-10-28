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

function scrollToTarget(hash) {
  if (hash === '#top') {
    lenis ? lenis.scrollTo(0) : window.scrollTo({ top: 0 });
    return;
  }
  const el = $(hash);
  if (!el) return;
  // About pins the page while its text fills in; land right where that begins.
  if (hash === '#about' && aboutST && lenis) {
    lenis.scrollTo(aboutST.start, { duration: 1.2 });
    return;
  }
  if (lenis) lenis.scrollTo(el, { duration: 1.2 });
  else el.scrollIntoView({ block: 'start' });
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
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
(function setupPageTransition() {
  const ptEl   = $('.pt');
  const ptPink = $('.pt__pink');
  const ptInk  = $('.pt__ink');

  // Arrive: if the head script set pt-enter, run the cover-off animation.
  // Runs immediately so we don't wait for DOMContentLoaded (cover is visible now).
  if (document.documentElement.classList.contains('pt-enter')) {
    // Focus main immediately (tabindex=-1, no scroll)
    const mainEl = $('#main-content');
    if (mainEl) mainEl.focus({ preventScroll: true });

    // Handle hash-based scroll after cover lifts
    const doHashScroll = () => {
      const hash = window.location.hash;
      if (!hash || hash === '#') return;
      const target = $(hash);
      if (!target) return;
      if (lenis) lenis.scrollTo(target, { immediate: true });
      else target.scrollIntoView({ block: 'start' });
    };

    if (!reduceMotion && ptPink && ptInk && ptEl) {
      // Wait for fonts (cap 700ms) then lift the cover
      const lift = () => {
        const tl = gsap.timeline({
          onComplete: () => {
            document.documentElement.classList.remove('pt-enter');
            try { sessionStorage.removeItem('pt'); } catch (e) { /* */ }
            if (ptEl) ptEl.style.pointerEvents = 'none';
            doHashScroll();
          },
        });
        // Ink lifts first, pink trails by 0.1s
        tl.to(ptInk,  { yPercent: -100, duration: 0.6, ease: 'power3.inOut' }, 0);
        tl.to(ptPink, { yPercent: -100, duration: 0.6, ease: 'power3.inOut' }, 0.1);
      };

      // Failsafe: force cover off at 1.5s
      const failsafe = setTimeout(() => {
        document.documentElement.classList.remove('pt-enter');
        try { sessionStorage.removeItem('pt'); } catch (e) { /* */ }
        if (ptPink) gsap.set(ptPink, { yPercent: -100 });
        if (ptInk)  gsap.set(ptInk,  { yPercent: -100 });
        if (ptEl)   ptEl.style.pointerEvents = 'none';
        doHashScroll();
      }, 1500);

      document.addEventListener('DOMContentLoaded', () => {
        const fontPromise = document.fonts
          ? Promise.race([
              document.fonts.ready,
              new Promise((r) => setTimeout(r, 700)),
            ])
          : Promise.resolve();
        fontPromise.then(() => { clearTimeout(failsafe); lift(); });
      }, { once: true });

      // If DOMContentLoaded already fired
      if (document.readyState !== 'loading') {
        const fontPromise = document.fonts
          ? Promise.race([
              document.fonts.ready,
              new Promise((r) => setTimeout(r, 700)),
            ])
          : Promise.resolve();
        fontPromise.then(() => { clearTimeout(failsafe); lift(); });
      }
    } else {
      // Reduced motion: no animation, just remove class and scroll
      document.documentElement.classList.remove('pt-enter');
      try { sessionStorage.removeItem('pt'); } catch (e) { /* */ }
      doHashScroll();
    }
  }

  // bfcache restore: reset layers and clear flag
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    document.documentElement.classList.remove('pt-enter');
    try { sessionStorage.removeItem('pt'); } catch (e2) { /* */ }
    if (ptPink) gsap.set(ptPink, { yPercent: 100 });
    if (ptInk)  gsap.set(ptInk,  { yPercent: 100 });
    if (ptEl)   ptEl.style.pointerEvents = 'none';
  });

  // Leave: intercept clicks and animate cover-in before navigating.
  let navigating = false;

  function shouldIntercept(a) {
    if (!a)                            return false;
    if (a.dataset.noTransition != null) return false;
    const href = a.getAttribute('href');
    if (!href)                         return false;

    // External links, mailto, tel, download
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download'))       return false;
    if (href.startsWith('mailto:') || href.startsWith('tel:'))       return false;

    // Pure same-page anchors — Lenis owns those
    if (href.startsWith('#'))             return false;

    // Hash-only change on same path (e.g. /work/pcgo#docs -> /work/pcgo#overview)
    try {
      const dest = new URL(href, window.location.href);
      if (dest.origin !== window.location.origin) return false;
      if (dest.pathname === window.location.pathname && dest.hash) return false;
      if (dest.href === window.location.href)      return false;

      // Skip files with extensions (except .html)
      const ext = dest.pathname.match(/\.([^./]+)$/);
      if (ext && ext[1].toLowerCase() !== 'html')  return false;
    } catch (e) {
      return false;
    }

    return true;
  }

  document.addEventListener('click', (e) => {
    if (navigating) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const a = e.target.closest('a[href]');
    if (!shouldIntercept(a)) return;

    // Skip if it's a hash-only link (already handled by the Lenis listener above)
    const href = a.getAttribute('href');
    const dest = new URL(href, window.location.href);
    if (dest.pathname === window.location.pathname && dest.hash) return;

    e.preventDefault();
    navigating = true;

    const navigate = () => { location.assign(dest.href); };

    if (reduceMotion || !ptPink || !ptInk || !ptEl) {
      // No animation for reduced motion or missing elements
      try { sessionStorage.setItem('pt', '1'); } catch (ssErr) { /* */ }
      navigate();
      return;
    }

    ptEl.style.pointerEvents = 'auto';

    // Cover-in: pink leads (0.45s), ink starts +0.12s (0.5s)
    const tl = gsap.timeline();
    tl.fromTo(ptPink, { yPercent: 100 }, { yPercent: 0, duration: 0.45, ease: 'power3.inOut' }, 0);
    tl.fromTo(ptInk,  { yPercent: 100 }, { yPercent: 0, duration: 0.5,  ease: 'power3.inOut' }, 0.12);
    tl.call(() => {
      try { sessionStorage.setItem('pt', '1'); } catch (ssErr) {
        // sessionStorage unavailable — navigate without the cover
        gsap.set(ptPink, { yPercent: 100 });
        gsap.set(ptInk,  { yPercent: 100 });
        ptEl.style.pointerEvents = 'none';
        navigating = false;
        navigate();
        return;
      }
      navigate();
    });

    // Failsafe: if timeline hasn't fired navigate after 1.2s
    setTimeout(() => {
      if (navigating) navigate();
    }, 1200);
  });

  // Prefetch on pointer/focus enter (desktop only, skip saveData)
  if (finePointer && !navigator.connection?.saveData) {
    const prefetched = new Set();
    const maybePrefetch = (a) => {
      if (!shouldIntercept(a)) return;
      const href = a.getAttribute('href');
      if (!href || prefetched.has(href)) return;
      prefetched.add(href);
      try {
        const dest = new URL(href, window.location.href);
        const link = document.createElement('link');
        link.rel  = 'prefetch';
        link.href = dest.href;
        document.head.appendChild(link);
      } catch (e) { /* */ }
    };
    document.addEventListener('pointerenter', (e) => {
      const a = e.target.closest('a[href]');
      if (a) maybePrefetch(a);
    }, true);
    document.addEventListener('focusin', (e) => {
      const a = e.target.closest('a[href]');
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

// Only observe spy sections that actually exist on this page (home only)
const spySections = ['work', 'about', 'skills', 'contact']
  .map((id) => document.getElementById(id))
  .filter(Boolean);
let currentSpy = null;

if (spySections.length) {
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          currentSpy = en.target.id;
          setActive(currentSpy);
        } else if (currentSpy === en.target.id) {
          currentSpy = null;
          setActive(null);
        }
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  spySections.forEach((s) => spy.observe(s));
}

window.addEventListener('resize', () => {
  const on = $('.nav__links a[aria-current="true"]');
  if (on) moveIndicator(on);
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
  gsap.to('.progress__bar', {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: 0.2 },
  });
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
  const skipLoader = reduceMotion || seen;

  if (reduceMotion) {
    endIntro();
    return;
  }

  gsap.set(words, { yPercent: 115 });
  const hlClosedRight = hl ? Math.ceil(hl.getBoundingClientRect().width) + 40 : 0;
  if (hl) gsap.set(hl, { clipPath: `inset(-12px ${hlClosedRight}px -16px -12px)` });
  gsap.set(heroBits, { opacity: 0, y: 16 });

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
   Work: cards stack — HOME ONLY
   (Removed in Phase 3 when the new work list lands)
   ------------------------------------------------------------ */
const stackEl = $('.work__stack');
const stackMQ  = window.matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)');
let stackTweens = [];

function teardownStack() {
  stackTweens.forEach((t) => {
    if (t.scrollTrigger) t.scrollTrigger.kill();
    t.kill();
  });
  stackTweens = [];
  if (stackEl) stackEl.classList.remove('is-stacking');
  gsap.set($$('.project__card'), { clearProps: 'transform,scale' });
}

function setupStack() {
  teardownStack();
  if (!stackEl || !stackMQ.matches) return;
  const projects = $$('.project');
  if (!projects.length) return;
  const fits = projects.every((p, i) => {
    const card = $('.project__card', p);
    return card && card.offsetHeight + navH() + 20 + i * 16 + 12 <= window.innerHeight;
  });
  if (!fits) return;

  stackEl.classList.add('is-stacking');
  projects.forEach((p, i) => {
    const next = projects[i + 1];
    if (!next) return;
    stackTweens.push(
      gsap.to($('.project__card', p), {
        scale: 0.94,
        ease: 'none',
        scrollTrigger: {
          trigger: next,
          start: () => `top ${Math.round(window.innerHeight * 0.9)}`,
          end:   () => `top ${navH() + 20 + (i + 1) * 16}`,
          scrub: true,
        },
      })
    );
  });
}

if (isHome && stackEl) {
  setupStack();
  let stackResizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(stackResizeTimer);
    stackResizeTimer = setTimeout(setupStack, 200);
  });
  stackMQ.addEventListener('change', setupStack);
}

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
      const hot  = e.target.closest('a, button, .frame');
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
if (isHome && stackEl) {
  document.fonts && document.fonts.ready.then(() => {
    setupStack();
    ScrollTrigger.refresh();
  });
  window.addEventListener('load', () => {
    setupStack();
    ScrollTrigger.refresh();
  });
}
