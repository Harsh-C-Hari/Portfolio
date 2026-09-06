    // tiny, dependency-free, defer until DOM ready
    (function () {
      var y = document.getElementById('year');
      if (y) y.textContent = new Date().getFullYear();

      // gentle reveal on scroll
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              e.target.classList.add('in');
              io.unobserve(e.target);
            }
          });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
        document.querySelectorAll('section, article, .skill-row, .timeline__row').forEach(function (el) {
          el.classList.add('reveal');
          io.observe(el);
        });
      }

      // scroll-spy: highlight the nav link for whichever section is in view.
      // Recomputed on every scroll frame from actual current geometry (rather
      // than relying on IntersectionObserver enter/exit events for a thin
      // trigger band) so it can't get stuck on a stale section — this matters
      // most on mobile, where Contact is the last section and the page can't
      // scroll much past it, so a fixed trigger band could stay satisfied by
      // Contact even after scrolling back up. The hero counts as "home" —
      // while it's closest to center, the brand name highlights and no
      // section link stays active.
      (function () {
        var navBrand = document.querySelector('.nav-brand');
        var spyZones = [];
        var heroEl = document.getElementById('hero');
        if (heroEl) spyZones.push({ el: heroEl, href: '#top' });
        document.querySelectorAll('.nav-links a[href^="#"]').forEach(function (a) {
          var href = a.getAttribute('href');
          if (spyZones.some(function (z) { return z.href === href; })) return;
          var target = document.querySelector(href);
          if (target) spyZones.push({ el: target, href: href });
        });
        if (!spyZones.length) return;

        function setActiveHref(href) {
          document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(function (a) {
            a.classList.toggle('is-active', a.getAttribute('href') === href);
          });
          if (navBrand) navBrand.classList.toggle('is-active', href === '#top');
        }

        function updateActiveSection() {
          var viewportMid = window.innerHeight * 0.5;
          var current = null;
          var currentDist = Infinity;
          spyZones.forEach(function (z) {
            var rect = z.el.getBoundingClientRect();
            if (rect.bottom <= 0 || rect.top >= window.innerHeight) return; // off-screen, skip
            var mid = (rect.top + rect.bottom) / 2;
            var dist = Math.abs(mid - viewportMid);
            if (dist < currentDist) {
              currentDist = dist;
              current = z;
            }
          });
          if (current) setActiveHref(current.href);
        }

        var ticking = false;
        window.addEventListener('scroll', function () {
          if (ticking) return;
          ticking = true;
          requestAnimationFrame(function () {
            updateActiveSection();
            ticking = false;
          });
        }, { passive: true });
        window.addEventListener('resize', updateActiveSection);

        updateActiveSection();
      })();

      // hamburger toggle
      var toggle = document.querySelector('.nav-toggle');
      var mobileNav = document.getElementById('nav-mobile');
      if (toggle && mobileNav) {
        toggle.addEventListener('click', function () {
          var open = mobileNav.classList.toggle('is-open');
          toggle.setAttribute('aria-expanded', String(open));
        });
        mobileNav.querySelectorAll('a').forEach(function (a) {
          a.addEventListener('click', function (e) {
            e.preventDefault();
            var href = this.getAttribute('href');
            // close menu first, then scroll after transition (300ms) finishes
            mobileNav.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
            setTimeout(function () {
              var target = href === '#top' ? document.getElementById('top') : document.querySelector(href);
              if (!target) return;
              var offsetTop = target.getBoundingClientRect().top + window.pageYOffset - 64;
              window.scrollTo({ top: offsetTop < 0 ? 0 : offsetTop, behavior: 'smooth' });
            }, 310); // wait for menu max-height transition (300ms) + tiny buffer
          });
        });
        document.addEventListener('click', function (e) {
          if (!e.target.closest('.nav') && mobileNav.classList.contains('is-open')) {
            mobileNav.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
          }
        });
      }

      // ------------------------------------------------------------
      // MARQUEE — infinite-loop safety
      //
      // The seamless-loop trick (duplicate the content once, animate
      // translateX 0 -> -50%) only works if a single copy is at least
      // as wide as the marquee itself. On any screen wider than one
      // copy (which, at this font's clamped max size, is well under
      // most laptop/desktop widths) the animation runs out of
      // duplicated content before it reaches the loop point, so a
      // blank gap opens up on the right edge and the next words only
      // "catch up" once the track snaps back to 0%.
      //
      // Fix: keep a single canonical set of words in the HTML, then
      // repeat it in script — as many times as needed to comfortably
      // out-width the marquee — before duplicating that block once
      // for the loop. Recomputed on resize so it stays correct at
      // any viewport size. Animation duration scales with the repeat
      // count so playback speed (px/sec) stays constant.
      function initMarquee(marqueeEl) {
        var track = marqueeEl.querySelector('.marquee__track');
        if (!track || !track.children.length) return;

        var baseHTML = Array.prototype.map.call(track.children, function (el) {
          return el.outerHTML;
        }).join('');
        var baseDuration = parseFloat(getComputedStyle(track).animationDuration) || 28;

        function rebuild() {
          track.innerHTML = baseHTML;
          var unitWidth = track.getBoundingClientRect().width;
          if (!unitWidth) return;
          var viewportWidth = marqueeEl.clientWidth || window.innerWidth;
          // +1 extra repeat as a safety margin beyond the bare minimum
          var repeats = Math.max(1, Math.ceil(viewportWidth / unitWidth) + 1);
          var half = new Array(repeats + 1).join(baseHTML);
          track.innerHTML = half + half;
          track.style.animationDuration = (baseDuration * repeats) + 's';
        }

        rebuild();

        var resizeTimer;
        window.addEventListener('resize', function () {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(rebuild, 200);
        });

        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(rebuild);
        }
      }

      document.querySelectorAll('.marquee').forEach(initMarquee);
    })();
