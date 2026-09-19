// Motion layer. Bundled by build.js (esbuild) into animation.bundle.js.
//
// Motion budget, on purpose:
//   1. One page-load sequence: counter loader -> hero words rise -> highlighter wipes in.
//   2. Project cards stack as you scroll (CSS sticky + a small scale-back).
//   3. The About statement fills in letter by letter as you read it.
//   Everything else answers an action (hover, click, scroll direction).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

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
const tickClock = () => {
  const t = clockFmt.format(new Date());
  clocks.forEach((el) => (el.textContent = t));
};
tickClock();
setInterval(tickClock, 1000);

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
  if (lenis) lenis.scrollTo(el, { offset: -navH() + 1, duration: 1.2 });
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
   Nav: scrolled state, scroll-spy, sliding highlighter, mobile menu
   ------------------------------------------------------------ */
const nav = $('[data-nav]');
const navLinks = $$('.nav__links a');
const indicator = $('.nav__indicator');
const toggle = $('.nav__toggle');
const menu = $('#menu');

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
    const on = a.getAttribute('href') === `#${id}`;
    if (on) {
      a.setAttribute('aria-current', 'true');
      active = a;
    } else {
      a.removeAttribute('aria-current');
    }
  });
  moveIndicator(active);
}

const spySections = ['work', 'about', 'skills', 'contact'].map((id) => document.getElementById(id));
let currentSpy = null;
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
spySections.forEach((s) => s && spy.observe(s));

window.addEventListener('resize', () => {
  const on = $('.nav__links a[aria-current="true"]');
  if (on) moveIndicator(on);
});

// A plain scroll listener, not a ScrollTrigger: a trigger that ends at 'max' turns itself
// off at the very bottom of the page, which made the bar transparent over the black contact section.
const syncNav = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
window.addEventListener('scroll', syncNav, { passive: true });
syncNav();

function openMenu() {
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
  if (!nav.classList.contains('is-open')) return;
  nav.classList.remove('is-open');
  menu.hidden = true;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open menu');
  lenis && lenis.start();
  document.documentElement.style.overflow = '';
}
toggle.addEventListener('click', () => (nav.classList.contains('is-open') ? closeMenu() : openMenu()));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenu();
});
window.matchMedia('(min-width: 900px)').addEventListener('change', closeMenu);

/* ------------------------------------------------------------
   Scroll progress bar
   ------------------------------------------------------------ */
if (!reduceMotion) {
  gsap.to('.progress__bar', {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: 0.2 },
  });
}

/* ------------------------------------------------------------
   Intro: loader counter -> panel wipe -> hero words -> highlighter
   ------------------------------------------------------------ */
const loader = $('.loader');
const words = $$('.hero__h1 .w__in');
const hl = $('.hl');
const heroBits = $$('.hero__status, .hero__foot');

function endIntro() {
  if (loader) loader.remove();
}

function runIntro() {
  const seen = sessionStorage.getItem('intro-seen') === '1';
  const skipLoader = reduceMotion || seen;

  if (reduceMotion) {
    endIntro();
    return;
  }

  gsap.set(words, { yPercent: 115 });
  gsap.set(hl, { clipPath: 'inset(-12px 100% -16px -12px)' });
  gsap.set(heroBits, { opacity: 0, y: 16 });

  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

  if (!skipLoader && loader) {
    const count = $('.loader__count');
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
  tl.to(hl, { clipPath: 'inset(-12px -16px -16px -12px)', duration: 0.7, ease: 'power3.inOut' }, '-=0.45');
  tl.to(heroBits, { opacity: 1, y: 0, duration: 0.8, stagger: 0.12 }, '-=0.6');

  sessionStorage.setItem('intro-seen', '1');
}
runIntro();

/* ------------------------------------------------------------
   Ticker: loops forever, speeds up and reverses with scroll
   ------------------------------------------------------------ */
const track = $('.ticker__track');
if (track && !reduceMotion) {
  const group = $('.ticker__group', track);
  // Repeat the group until one copy is wider than the viewport, then duplicate for the loop.
  const unit = group.innerHTML;
  while (group.scrollWidth < window.innerWidth) group.insertAdjacentHTML('beforeend', unit);
  track.appendChild(group.cloneNode(true));

  const loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: 40, repeat: -1 });
  ScrollTrigger.create({
    onUpdate: (self) => {
      const v = self.getVelocity();
      const dir = self.direction;
      gsap.to(loop, { timeScale: dir * (1 + Math.min(Math.abs(v) / 250, 5)), duration: 0.2, overwrite: true });
      gsap.to(loop, { timeScale: dir, duration: 0.8, delay: 0.2, overwrite: false });
    },
  });
}

/* ------------------------------------------------------------
   Work: cards stack, previous one recedes as the next covers it
   ------------------------------------------------------------ */
const mm = gsap.matchMedia();
mm.add('(min-width: 900px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)', () => {
  const projects = $$('.project');
  projects.forEach((p, i) => {
    const next = projects[i + 1];
    if (!next) return;
    gsap.to($('.project__card', p), {
      scale: 0.94,
      ease: 'none',
      scrollTrigger: {
        trigger: next,
        start: () => `top ${Math.round(window.innerHeight * 0.9)}`,
        end: () => `top ${navH() + 20 + (i + 1) * 16}`,
        scrub: true,
      },
    });
  });
});

/* ------------------------------------------------------------
   About: statement fills in as you read
   ------------------------------------------------------------ */
const statement = $('[data-scrub]');
if (statement && !reduceMotion) {
  const split = SplitText.create(statement, { type: 'words,chars', charsClass: 'char' });
  gsap.fromTo(
    split.chars,
    { opacity: 0.16 },
    {
      opacity: 1,
      ease: 'none',
      stagger: 0.5,
      scrollTrigger: {
        trigger: statement,
        start: 'top 82%',
        end: 'bottom 55%',
        scrub: 0.4,
      },
    }
  );
}

/* ------------------------------------------------------------
   Contact: copy email
   ------------------------------------------------------------ */
const copyBtn = $('[data-copy]');
const copyStatus = $('[data-copy-status]');
const mail = $('[data-email]');
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
      ta.style.opacity = '0';
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
    el.addEventListener('mouseleave', () => {
      qx(0);
      qy(0);
    });
  });

  const ring = $('.cursor');
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
    const hot = e.target.closest('a, button, .frame');
    gsap.to(ring, { scale: hot ? 1.9 : 1, duration: 0.3, ease: 'power3.out' });
  });
  document.addEventListener('mouseleave', () => gsap.to(ring, { opacity: 0, duration: 0.2 }));
}

/* ------------------------------------------------------------
   Layout settles after webfonts + images
   ------------------------------------------------------------ */
document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
window.addEventListener('load', () => ScrollTrigger.refresh());
