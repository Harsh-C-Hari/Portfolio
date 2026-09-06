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
  var prevBtn = deck && deck.querySelector('[data-deck-prev]');
  var nextBtn = deck && deck.querySelector('[data-deck-next]');
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
    card.scrollTop = 0;
    updateArrows(index);
  }

  // Disable/"block" the prev arrow on the first project and the next arrow
  // on the last project, instead of letting them wrap or close the deck.
  function updateArrows(index) {
    if (prevBtn) prevBtn.disabled = index <= 0;
    if (nextBtn) nextBtn.disabled = index >= data.length - 1;
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

    // Blocked at the edges: first project has no prev, last has no next.
    // (Use the close/X button, Escape, or the backdrop to exit instead.)
    if (next < 0 || next >= data.length) return;

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

  // Only treat the wheel gesture as "next/prev project" once the card's
  // own scroll has hit its top/bottom edge — otherwise let the browser
  // scroll the (possibly tall) card content normally.
  function cardAtScrollBoundary(deltaY) {
    if (card.scrollHeight <= card.clientHeight + 1) return true; // nothing to scroll
    if (deltaY < 0) return card.scrollTop <= 0;
    return card.scrollTop + card.clientHeight >= card.scrollHeight - 1;
  }

  deck.querySelector('.project-deck__panel').addEventListener('wheel', function (e) {
    if (!cardAtScrollBoundary(e.deltaY)) return; // let the card scroll natively
    if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return;
    e.preventDefault();
    e.stopPropagation();
    if (wheelLock) return;
    wheelLock = true;
    goTo(e.deltaY > 0 ? 1 : -1);
    setTimeout(function () { wheelLock = false; }, 350);
  }, { passive: false });

  // Touch swipe support (mobile): the card follows the finger as it's dragged
  // horizontally, snaps to the next/prev project past a distance/velocity
  // threshold, or springs back if the swipe was too short. A short vertical
  // move at the start of the gesture is left alone so the card's own
  // scrolling (for long project descriptions) still works normally.
  var panelEl = deck.querySelector('.project-deck__panel');
  var touch = null; // { startX, startY, lastX, startTime, locked }
  var SWIPE_DISTANCE_THRESHOLD = 60; // px of horizontal drag to commit
  var SWIPE_VELOCITY_THRESHOLD = 0.35; // px/ms — fast flicks commit even if short
  var DIRECTION_LOCK_THRESHOLD = 10; // px before deciding horizontal vs vertical

  function setCardDrag(dx, animate) {
    if (!dx && !animate) {
      // Fully hand control back to the stylesheet (used right before goTo(),
      // whose own .is-leaving transition must not be blocked by an inline one).
      card.style.transition = '';
      card.style.transform = '';
      return;
    }
    card.style.transition = animate ? 'transform .25s cubic-bezier(.4, 0, .2, 1)' : 'none';
    card.style.transform = dx ? 'translateX(' + dx + 'px)' : '';
    if (animate) {
      setTimeout(function () {
        card.style.transition = '';
        card.style.transform = '';
      }, 260);
    }
  }

  panelEl.addEventListener('touchstart', function (e) {
    if (!state.isOpen || e.touches.length !== 1) return;
    var t = e.touches[0];
    touch = { startX: t.clientX, startY: t.clientY, lastX: t.clientX, startTime: Date.now(), locked: null };
  }, { passive: true });

  panelEl.addEventListener('touchmove', function (e) {
    if (!touch || e.touches.length !== 1) return;
    var t = e.touches[0];
    var dx = t.clientX - touch.startX;
    var dy = t.clientY - touch.startY;

    if (touch.locked === null) {
      if (Math.abs(dx) < DIRECTION_LOCK_THRESHOLD && Math.abs(dy) < DIRECTION_LOCK_THRESHOLD) return;
      touch.locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (touch.locked !== 'x') return; // vertical gesture: let the card scroll natively

    // Rubber-band resistance at the ends of the deck, where there's no
    // next/prev project to swipe to.
    if ((state.index === 0 && dx > 0) || (state.index === data.length - 1 && dx < 0)) {
      dx *= 0.35;
    }

    e.preventDefault();
    touch.lastX = t.clientX;
    setCardDrag(dx, false);
  }, { passive: false });

  panelEl.addEventListener('touchend', function () {
    if (!touch) return;
    var dx = touch.lastX - touch.startX;
    var elapsed = Math.max(1, Date.now() - touch.startTime);
    var velocity = Math.abs(dx) / elapsed;
    var wasHorizontal = touch.locked === 'x';
    touch = null;
    if (!wasHorizontal) return;

    var direction = dx < 0 ? 1 : -1;
    var canMove = direction === 1 ? state.index < data.length - 1 : state.index > 0;
    var committed = canMove && (Math.abs(dx) > SWIPE_DISTANCE_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD);

    if (committed) {
      setCardDrag(0, false);
      goTo(direction);
    } else {
      setCardDrag(0, true);
    }
  }, { passive: true });

  panelEl.addEventListener('touchcancel', function () {
    if (!touch) return;
    touch = null;
    setCardDrag(0, true);
  }, { passive: true });
})();