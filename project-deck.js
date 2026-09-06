// project-deck.js
// Single-card project deck overlay. Reads data from window.PROJECT_DECK_DATA.
(function () {
  var data = window.PROJECT_DECK_DATA || [];
  if (!data.length) return;

  var deck = document.getElementById('project-deck');
  var card = document.getElementById('project-deck-card');
  var counter = document.getElementById('project-deck-counter');
  var openBtn = document.getElementById('project-deck-open');
  var countLabel = document.getElementById('project-deck-count');
  if (!deck || !card || !openBtn) return;

  if (countLabel) countLabel.textContent = String(data.length);

  var state = { isOpen: false, index: 0 };
  var scrollY = 0;
  var wheelLock = false;
  var WHEEL_THRESHOLD = 40; // px of deltaY before counting as one "step"

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderCard(index) {
    var p = data[index];
    card.innerHTML =
      '<span class="project__index">' + escapeHtml(p.indexLabel) + '</span>' +
      '<img src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(p.alt) + '" loading="eager" decoding="async">' +
      '<h3>' + escapeHtml(p.title) + '</h3>' +
      '<p>' + escapeHtml(p.blurb) + '</p>' +
      '<div class="project__chips">' +
      p.chips.map(function (c) { return '<span class="chip">' + escapeHtml(c) + '</span>'; }).join('') +
      '</div>' +
      '<a class="btn btn-primary" href="' + escapeHtml(p.githubUrl) + '" rel="noopener" target="_blank">View on GitHub &#8599;</a>';
    counter.textContent = (index + 1) + ' / ' + data.length;
  }

  function open() {
    state.isOpen = true;
    state.index = 0;
    renderCard(state.index);
    scrollY = window.pageYOffset;
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + scrollY + 'px';
    document.body.style.width = '100%';
    deck.classList.add('is-open');
    deck.setAttribute('aria-hidden', 'false');
    deck.querySelector('.project-deck__close').focus({ preventScroll: true });
    document.addEventListener('keydown', onKeydown);
  }

  function close() {
    state.isOpen = false;
    deck.classList.remove('is-open');
    deck.setAttribute('aria-hidden', 'true');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    // The site sets `scroll-behavior: smooth` globally, which would otherwise
    // turn this restore into a visible animated scroll. Force an instant jump.
    var prevScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, scrollY);
    document.documentElement.style.scrollBehavior = prevScrollBehavior;
    document.removeEventListener('keydown', onKeydown);
    openBtn.focus({ preventScroll: true });
  }

  // direction: +1 (forward/next) or -1 (backward/prev)
  function goTo(direction) {
    var next = state.index + direction;

    if (next >= data.length) { close(); return; }     // forward past last -> close
    if (next < 0) { close(); return; }                // backward past first -> close
    // ^ to clamp instead of closing on the backward case, replace the line
    //   above with: `next = 0; }` and remove the `return;`

    state.index = next;
    card.classList.add('is-leaving');
    setTimeout(function () {
      renderCard(state.index);
      card.classList.remove('is-leaving');
    }, 150);
  }

  function onKeydown(e) {
    if (!state.isOpen) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowRight') { goTo(1); return; }
    if (e.key === 'ArrowLeft') { goTo(-1); return; }
    if (e.key === 'Tab') {
      // simple focus trap: keep tabbing within the panel
      var focusable = deck.querySelectorAll('button, a[href]');
      if (!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  openBtn.addEventListener('click', open);

  deck.querySelectorAll('[data-deck-close]').forEach(function (el) {
    el.addEventListener('click', close);
  });
  deck.querySelector('[data-deck-next]').addEventListener('click', function () { goTo(1); });
  deck.querySelector('[data-deck-prev]').addEventListener('click', function () { goTo(-1); });

  deck.querySelector('.project-deck__panel').addEventListener('wheel', function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (wheelLock) return;
    if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return;
    wheelLock = true;
    goTo(e.deltaY > 0 ? 1 : -1);
    setTimeout(function () { wheelLock = false; }, 350);
  }, { passive: false });

  // basic touch swipe support
  var touchStartX = null;
  deck.querySelector('.project-deck__panel').addEventListener('touchstart', function (e) {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  deck.querySelector('.project-deck__panel').addEventListener('touchend', function (e) {
    if (touchStartX === null) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(dx) < 40) return;
    goTo(dx < 0 ? 1 : -1);
  }, { passive: true });
})();
