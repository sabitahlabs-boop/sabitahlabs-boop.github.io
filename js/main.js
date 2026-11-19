/* Sabitah Labs: nav drawer, film loop, film player, one reveal, studio clocks. No dependencies. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Mobile nav drawer */
  var nav = document.querySelector('.nav');
  var toggle = document.querySelector('.nav__toggle');
  if (nav && toggle) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? 'Close' : 'Menu';
    });
    nav.querySelectorAll('.nav__links a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = 'Menu';
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { toggle.click(); toggle.focus(); }
    });
  }

  var loopSyncs = [];
  var dialog = document.getElementById('player');

  /* Muted film loop: plays only on screen, pauses on hover and focus, visible pause control */
  document.querySelectorAll('[data-loop]').forEach(function (el) {
    var btn = el.querySelector('[data-loop-toggle]');
    var video = el.querySelector('video');
    if (!video) return;
    /* the hero's blurred spill plays in step with its sharp frame */
    var scene = el.closest('.hero');
    var ambient = scene ? scene.querySelector('.hero__ambient video') : null;
    var vids = ambient ? [video, ambient] : [video];
    var s = { seen: false, hover: false, focus: false, held: reduce };
    var sync = function () {
      var run = s.seen && !s.hover && !s.focus && !s.held && !(dialog && dialog.open);
      el.classList.toggle('is-running', run);
      vids.forEach(function (v) {
        if (run) {
          if (v === ambient && video.currentTime) { try { v.currentTime = video.currentTime; } catch (err) {} }
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else { v.pause(); }
      });
      if (btn) {
        btn.querySelector('span').textContent = s.held ? 'Play loop' : 'Pause loop';
        btn.setAttribute('aria-pressed', s.held ? 'true' : 'false');
      }
    };
    loopSyncs.push(sync);
    if (btn) btn.addEventListener('click', function () { s.held = !s.held; sync(); });
    el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { s.hover = true; sync(); } });
    el.addEventListener('pointerleave', function () { s.hover = false; sync(); });
    el.addEventListener('focusin', function () { s.focus = true; sync(); });
    el.addEventListener('focusout', function () { s.focus = false; sync(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { s.seen = entries[0].isIntersecting; sync(); }, { threshold: 0.25 }).observe(el);
    } else { s.seen = true; sync(); }
  });

  /* Film player: a native dialog with sound and controls */
  if (dialog && typeof dialog.showModal === 'function') {
    var pv = dialog.querySelector('video');
    var titleEl = dialog.querySelector('[data-player-title]') || dialog.querySelector('.player__bar span');
    var srcEl = pv.querySelector('source');
    var dflt = { src: srcEl ? srcEl.getAttribute('src') : '', poster: pv.getAttribute('poster') || '', title: titleEl ? titleEl.textContent : '' };
    var opener = null;
    document.querySelectorAll('[data-play]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        opener = b;
        var src = b.getAttribute('data-src') || dflt.src;
        var poster = b.getAttribute('data-poster') || dflt.poster;
        if (pv.getAttribute('data-current') !== src) {
          pv.querySelectorAll('source').forEach(function (x) { x.remove(); });
          pv.src = src;
          pv.setAttribute('data-current', src);
        }
        if (poster) pv.setAttribute('poster', poster);
        if (titleEl) titleEl.textContent = b.getAttribute('data-title') || dflt.title;
        dialog.setAttribute('aria-label', titleEl ? titleEl.textContent : 'Film player');
        document.querySelectorAll('[data-loop] video, .hero__ambient video').forEach(function (v) { v.pause(); });
        dialog.showModal();
        pv.currentTime = 0;
        var p = pv.play(); if (p && p.catch) p.catch(function () {});
      });
    });
    var close = function () { pv.pause(); if (dialog.open) dialog.close(); };
    dialog.querySelector('[data-close]').addEventListener('click', close);
    dialog.addEventListener('click', function (e) { if (e.target === dialog) close(); });
    dialog.addEventListener('close', function () { pv.pause(); if (opener) opener.focus(); loopSyncs.forEach(function (f) { f(); }); });
  }

  /* Film cards with a short silent preview on hover (mouse only) */
  if (window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.film-card__play[data-hover]').forEach(function (b) {
      var v = null;
      b.addEventListener('pointerenter', function () {
        if (!v) {
          v = document.createElement('video');
          v.className = 'hover-loop'; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
          v.setAttribute('aria-hidden', 'true');
          v.src = b.getAttribute('data-hover');
          b.insertBefore(v, b.querySelector('.chip'));
        }
        b.classList.add('is-previewing');
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      });
      b.addEventListener('pointerleave', function () { b.classList.remove('is-previewing'); if (v) v.pause(); });
    });
  }

  /* ---------- Motion layer (motiondivision/motion) ----------
     Runs only when Motion loaded and the visitor has not asked for reduced motion.
     Start states are set here, by script, so nothing is hidden without it. */
  var M = window.Motion;
  if (M && M.animate && !reduce) {
    var animate = M.animate, inView = M.inView, scroll = M.scroll, stagger = M.stagger;
    var EASE = [0.16, 1, 0.3, 1];
    var vh = window.innerHeight;
    var below = function (el) { return el.getBoundingClientRect().top > vh * 0.92; };

    /* Split a display head into words that rise out of their own line */
    var splitWords = function (el) {
      if (!el || el.dataset.split) return [];
      el.dataset.split = '1';
      el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
      var words = el.textContent.replace(/\s+/g, ' ').trim().split(' ');
      el.textContent = '';
      var inner = [];
      words.forEach(function (w, i) {
        var outer = document.createElement('span');
        outer.className = 'split-word';
        outer.setAttribute('aria-hidden', 'true');
        var s = document.createElement('span');
        s.textContent = w;
        outer.appendChild(s);
        el.appendChild(outer);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
        inner.push(s);
      });
      return inner;
    };

    /* 1. Page head: words rise, then the lede, actions and facts settle */
    var headline = document.querySelector('.hero h1, .case-hero h1');
    var words = splitWords(headline);
    if (words.length) {
      animate(words, { y: ['110%', '0%'] }, { duration: 0.9, ease: EASE, delay: stagger(0.06) });
    }
    var settle = document.querySelectorAll('.hero__lede, .hero__actions, .hero__film .credits, .case-hero__city, .case-hero__lede, .crumb, .case-facts > div');
    if (settle.length) {
      animate(settle, { opacity: [0, 1], y: [16, 0] }, { duration: 0.7, ease: EASE, delay: stagger(0.07, { startDelay: 0.25 }) });
    }

    /* 2. The hero film opens like a screen, then recedes as the page scrolls past it */
    var heroFilm = document.querySelector('.hero__film .film');
    if (heroFilm) {
      animate(heroFilm, { opacity: [0, 1], scale: [0.94, 1], clipPath: ['inset(12% 0% 12% 0%)', 'inset(0% 0% 0% 0%)'] }, { duration: 1.1, ease: EASE, delay: 0.15 });
      var hero = document.querySelector('.hero');
      if (scroll && hero) {
        scroll(animate(heroFilm, { scale: [1, 0.9], y: [0, 60] }, { ease: 'linear' }), { target: hero, offset: ['start start', 'end start'] });
        scroll(animate('.hero__copy', { opacity: [1, 0.25], y: [0, -40] }, { ease: 'linear' }), { target: hero, offset: ['start start', 'end start'] });
      }
    }

    /* 3. City names rise out of a clipped line as each flagship enters */
    document.querySelectorAll('.flag').forEach(function (flag) {
      var city = flag.querySelector('.flag__city');
      var imgs = flag.querySelectorAll('.flag__media img');
      var rest = flag.querySelectorAll('.flag__body > :not(.flag__city)');
      if (!below(flag)) return;
      if (city && !city.firstElementChild) { var sp = document.createElement('span'); sp.textContent = city.textContent; city.textContent = ''; city.appendChild(sp); }
      var cityInner = city ? city.firstElementChild : null;
      if (cityInner) cityInner.style.transform = 'translateY(105%)';
      imgs.forEach(function (i) { i.style.opacity = '0'; });
      rest.forEach(function (r) { r.style.opacity = '0'; });
      inView(flag, function () {
        if (cityInner) animate(cityInner, { y: ['105%', '0%'] }, { duration: 1, ease: EASE });
        animate(imgs, { opacity: [0, 1], scale: [1.06, 1] }, { duration: 1.1, ease: EASE, delay: stagger(0.12) });
        animate(rest, { opacity: [0, 1], y: [20, 0] }, { duration: 0.8, ease: EASE, delay: stagger(0.06, { startDelay: 0.2 }) });
      }, { amount: 0.25 });
    });

    /* 4. Section heads: words rise when the section arrives */
    document.querySelectorAll('.section__head h2, .scope h2, .stage__notes h2, .stories__text h2').forEach(function (h) {
      if (!below(h)) return;
      var w = splitWords(h);
      w.forEach(function (s) { s.style.transform = 'translateY(110%)'; });
      inView(h, function () { animate(w, { y: ['110%', '0%'] }, { duration: 0.8, ease: EASE, delay: stagger(0.045) }); }, { amount: 0.6 });
    });

    /* 5. Groups: rows, posts and plates arrive in sequence */
    var groups = [
      ['.index', ':scope > li'],
      ['.gallery', ':scope > figure'],
      ['.films', ':scope > .film-card'],
      ['.mascots', ':scope > figure'],
      ['.plates', ':scope > figure'],
      ['.services', ':scope > .service'],
      ['.hours', ':scope > div'],
      ['.scope ol', ':scope > li'],
      ['.ledger', ':scope > div'],
      ['.reach', ':scope > div'],
      ['.stories', ':scope > figure'],
      ['.rail', ':scope > figure, :scope > .film-card']
    ];
    groups.forEach(function (g) {
      document.querySelectorAll(g[0]).forEach(function (wrap) {
        if (!below(wrap)) return;
        var kids = wrap.querySelectorAll(g[1]);
        if (!kids.length) return;
        var isRail = wrap.classList.contains('rail');
        kids.forEach(function (k) { k.style.opacity = '0'; });
        inView(wrap, function () {
          animate(kids, isRail ? { opacity: [0, 1], x: [60, 0] } : { opacity: [0, 1], y: [28, 0] }, { duration: 0.8, ease: EASE, delay: stagger(0.07) });
        }, { amount: 0.15 });
      });
    });

    /* 6. The case film settles in its well */
    var stageFilm = document.querySelector('.stage__film');
    if (stageFilm && below(stageFilm)) {
      stageFilm.style.opacity = '0';
      inView(stageFilm, function () { animate(stageFilm, { opacity: [0, 1], scale: [0.95, 1] }, { duration: 1, ease: EASE }); }, { amount: 0.3 });
    }

    /* 7. Contact address and next project draw in */
    document.querySelectorAll('.contact__mail, .next strong').forEach(function (el) {
      if (!below(el)) return;
      el.style.opacity = '0';
      inView(el, function () { animate(el, { opacity: [0, 1], x: [-30, 0] }, { duration: 0.9, ease: EASE }); }, { amount: 0.5 });
    });

    /* 9. Case title card: the cover opens like the hero film */
    var cover = document.querySelector('.case-hero__cover');
    if (cover) {
      animate(cover, { opacity: [0, 1], scale: [0.94, 1], clipPath: ['inset(10% 0% 10% 0%)', 'inset(0% 0% 0% 0%)'] }, { duration: 1.1, ease: EASE, delay: 0.2 });
      var ch = document.querySelector('.case-hero');
      if (scroll && ch) scroll(animate(cover, { y: [0, 80], scale: [1, 0.94] }, { ease: 'linear' }), { target: ch, offset: ['start start', 'end start'] });
    }

    /* 10. Work index: a preview of each project rides beside the cursor (mouse only, wide screens) */
    var rows = document.querySelectorAll('.index__row[data-peek]');
    if (rows.length && window.matchMedia('(pointer: fine) and (min-width: 60rem)').matches) {
      var peek = document.createElement('div');
      peek.className = 'peek';
      peek.setAttribute('aria-hidden', 'true');
      var peekIn = document.createElement('div');
      peekIn.className = 'peek__in';
      peek.appendChild(peekIn);
      document.body.appendChild(peek);
      var cache = {};
      var current = null;
      var px = 0, py = 0, tx = 0, ty = 0, raf = 0;
      var follow = function () {
        px += (tx - px) * 0.16; py += (ty - py) * 0.16;
        peek.style.transform = 'translate(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px)';
        if (Math.abs(tx - px) > 0.3 || Math.abs(ty - py) > 0.3) raf = requestAnimationFrame(follow); else raf = 0;
      };
      var mediaFor = function (src) {
        if (cache[src]) return cache[src];
        var m;
        if (/\.mp4$/.test(src)) { m = document.createElement('video'); m.muted = true; m.loop = true; m.playsInline = true; m.preload = 'auto'; m.src = src; }
        else { m = document.createElement('img'); m.src = src; m.alt = ''; }
        cache[src] = m; return m;
      };
      rows.forEach(function (row) {
        row.addEventListener('pointerenter', function (e) {
          var m = mediaFor(row.getAttribute('data-peek'));
          if (current && current !== m && current.pause) current.pause();
          if (peekIn.firstChild !== m) { peekIn.textContent = ''; peekIn.appendChild(m); }
          current = m;
          if (m.play) { var pp = m.play(); if (pp && pp.catch) pp.catch(function () {}); }
          tx = e.clientX + 32; ty = e.clientY - 200;
          if (!raf) { px = tx; py = ty + 30; raf = requestAnimationFrame(follow); }
          animate(peekIn, { opacity: [0, 1], scale: [0.9, 1], rotate: [-3, 0] }, { duration: 0.45, ease: EASE });
        });
        row.addEventListener('pointermove', function (e) {
          tx = Math.min(e.clientX + 32, window.innerWidth - 270); ty = Math.max(16, Math.min(e.clientY - 200, window.innerHeight - 440));
          if (!raf) raf = requestAnimationFrame(follow);
        });
        row.addEventListener('pointerleave', function () {
          animate(peekIn, { opacity: 0, scale: 0.94 }, { duration: 0.25, ease: [0.7, 0, 0.84, 0] });
          if (current && current.pause) current.pause();
        });
      });
    }

    /* 11. ADDP walk-through: pin the four frames and let the scroll walk the building */
    var walk = document.querySelector('.walk');
    if (walk && scroll && window.matchMedia('(min-width: 60rem)').matches) {
      var frames = walk.querySelectorAll('.stills figure');
      var names = Array.prototype.map.call(frames, function (f) { return f.querySelector('figcaption').textContent; });
      var nameEl = walk.querySelector('[data-walk-name]');
      var countEl = walk.querySelector('[data-walk-count]');
      var meter = walk.querySelector('.walk__meter i');
      walk.classList.add('is-pinned');
      var active = 0;
      scroll(function (progress) {
        var n = frames.length;
        var idx = Math.min(n - 1, Math.floor(progress * n));
        frames.forEach(function (f, i) {
          var local = Math.max(0, Math.min(1, progress * n - i));
          f.style.opacity = i === 0 ? '1' : String(Math.min(1, local * 3));
          f.querySelector('img').style.transform = 'scale(' + (1.08 - 0.08 * local).toFixed(3) + ')';
        });
        if (meter) meter.style.transform = 'scaleY(' + progress.toFixed(3) + ')';
        if (idx !== active) {
          active = idx;
          nameEl.textContent = names[idx];
          countEl.textContent = (idx + 1) + ' of ' + n;
          animate(nameEl, { opacity: [0, 1], y: [14, 0] }, { duration: 0.5, ease: EASE });
        }
      }, { target: walk.querySelector('.walk__stage').parentElement.parentElement, offset: ['start start', 'end end'] });
    }

    /* 8. Reading progress on case pages */
    if (document.querySelector('.case-hero') && scroll) {
      var bar = document.createElement('div');
      bar.className = 'progress';
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
      scroll(animate(bar, { scaleX: [0, 1] }, { ease: 'linear' }));
    }
  }

  /* Studio clocks: the local time in Jakarta, Singapore and Seoul */
  var clocks = document.querySelectorAll('[data-tz]');
  if (clocks.length && window.Intl) {
    var tick = function () {
      var now = new Date();
      clocks.forEach(function (c) {
        try {
          c.textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: c.getAttribute('data-tz') }).format(now);
        } catch (err) { /* keep the static UTC offset */ }
      });
    };
    tick();
    setInterval(tick, 30000);
  }
})();
