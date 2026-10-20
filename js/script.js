/* =========================================================
   Portofolio T. Rafli Al Rasyid
   1) Navbar + scrollspy   (tanpa GSAP, selalu jalan)
   2) Form kontak          (tanpa GSAP, selalu jalan)
   3) Animasi GSAP         (hanya bila gerak tidak dikurangi)
   ========================================================= */
(function () {
    'use strict';

    var $ = function (s, c) { return (c || document).querySelector(s); };
    var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
    var root = document.documentElement;
    var hasGsap = !!(window.gsap && window.ScrollTrigger);

    /* ---------------------------------------------------------
       1) Navbar: kelas "is-scrolled" + link aktif
       --------------------------------------------------------- */
    var nav = $('#siteNav');
    var ticking = false;
    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
            nav.classList.toggle('is-scrolled', window.scrollY > 24);
            ticking = false;
        });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var links = $$('.site-nav .nav-link');
    function setActive(id) {
        links.forEach(function (a) {
            var on = a.getAttribute('data-spy') === id;
            a.classList.toggle('active', on);
            if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
    }
    setActive('home');
    if ('IntersectionObserver' in window) {
        var spy = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) setActive(en.target.getAttribute('data-spy-id'));
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        var hero = $('.hero');
        hero.setAttribute('data-spy-id', 'home');
        spy.observe(hero);
        ['about', 'certificate', 'contact'].forEach(function (id) {
            var el = document.getElementById(id);
            el.setAttribute('data-spy-id', id);
            spy.observe(el);
        });
    }

    // Tutup menu mobile setelah memilih tautan
    var menu = $('#navMenu');
    links.forEach(function (a) {
        a.addEventListener('click', function () {
            if (menu.classList.contains('show') && window.bootstrap) {
                window.bootstrap.Collapse.getOrCreateInstance(menu).hide();
            }
        });
    });

    /* ---------------------------------------------------------
       2) Form kontak
       --------------------------------------------------------- */
    var scriptURL = 'https://script.google.com/macros/s/AKfycbwixfozdtreoQnVrDL4oboVVemzUkwoA-dY4ln1Inr8v-ZiXhRh6WItQPS0M2GTHuqU/exec';
    var form = document.forms['submit-to-google-sheet'];
    var btnKirim = $('.btn-kirim');
    var btnLoading = $('.btn-loading');
    var noticeOk = $('.notice-ok');
    var noticeErr = $('.notice-err');
    var noticeTimer = null;
    var sending = false;
    var animate = hasGsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hideNotice(el, instant) {
        if (el.hidden) return;
        if (!animate || instant) { el.hidden = true; return; }
        gsap.to(el, {
            height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0, borderWidth: 0, autoAlpha: 0,
            duration: .35, ease: 'power2.in',
            onComplete: function () { el.hidden = true; gsap.set(el, { clearProps: 'all' }); }
        });
    }
    function showNotice(el) {
        clearTimeout(noticeTimer);
        hideNotice(el === noticeOk ? noticeErr : noticeOk, true);
        el.hidden = false;
        if (animate) {
            gsap.from(el, {
                height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0, borderWidth: 0, autoAlpha: 0, y: -8,
                duration: .5, ease: 'power3.out', clearProps: 'all'
            });
        }
        noticeTimer = setTimeout(function () { hideNotice(el); }, 7000);
    }
    $$('.notice-close').forEach(function (b) {
        b.addEventListener('click', function () { clearTimeout(noticeTimer); hideNotice(b.closest('.notice')); });
    });

    function setLoading(on) {
        btnLoading.classList.toggle('d-none', !on);
        btnKirim.classList.toggle('d-none', on);
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (sending) return;
        sending = true;
        setLoading(true);
        hideNotice(noticeOk, true);
        hideNotice(noticeErr, true);

        fetch(scriptURL, { method: 'POST', body: new FormData(form) })
            .then(function (response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                form.reset();
                showNotice(noticeOk);
                console.log('Success!', response);
            })
            .catch(function (error) {
                showNotice(noticeErr);
                console.error('Error!', error.message);
            })
            .then(function () {
                sending = false;
                setLoading(false);
            });
    });

    /* ---------------------------------------------------------
       3) GSAP
       --------------------------------------------------------- */
    if (!hasGsap) { root.classList.remove('has-js'); return; }

    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: 'power3.out', duration: .8 });

    // Progress scroll (ringan, selalu aktif)
    gsap.to('.scroll-progress span', {
        scaleX: 1, ease: 'none',
        scrollTrigger: { start: 0, end: 'max', scrub: .2 }
    });

    var mm = gsap.matchMedia();

    mm.add({
        ok: '(prefers-reduced-motion: no-preference)',
        fine: '(hover: hover) and (pointer: fine)'
    }, function (ctx) {
        var ok = ctx.conditions.ok;
        var fine = ctx.conditions.fine;
        if (!ok) { root.classList.remove('has-js'); return; }

        var alive = true;

        /* ---------- util: pecah teks ---------- */
        function splitChars(el) {
            var frag = document.createDocumentFragment();
            var words = el.textContent.split(' ');
            words.forEach(function (w, i) {
                var word = document.createElement('span');
                word.className = 'w';
                w.split('').forEach(function (c) {
                    var s = document.createElement('span');
                    s.className = 'ch';
                    s.textContent = c;
                    word.appendChild(s);
                });
                frag.appendChild(word);
                if (i < words.length - 1) frag.appendChild(document.createTextNode(' '));
            });
            el.textContent = '';
            el.appendChild(frag);
            return $$('.ch', el);
        }
        function splitWords(el) {
            var words = el.textContent.trim().split(/\s+/);
            el.textContent = '';
            return words.map(function (w, i) {
                var s = document.createElement('span');
                s.textContent = w;
                el.appendChild(s);
                if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
                return s;
            });
        }

        /* ---------- HERO: satu momen utama ---------- */
        var chars = [];
        $$('[data-split]').forEach(function (el) { chars = chars.concat(splitChars(el)); });

        var core = $('.net-avatar');
        var chips = $$('.chip');
        var spokes = $$('.net-spokes line');
        var ring = $$('.net-ring line');
        var sats = $$('.net-sats circle');

        var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.set(['.hero-name', '.net'], { autoAlpha: 1 }, 0)
          .from('.site-nav', { yPercent: -100, autoAlpha: 0, duration: .7 }, 0)
          .to('.hero-status', { autoAlpha: 1, startAt: { y: 14 }, y: 0, duration: .7 }, .1)
          .from(chars, { yPercent: 118, duration: 1, ease: 'expo.out', stagger: { each: .035 } }, .2)
          .from(core, { scale: .4, autoAlpha: 0, duration: 1, ease: 'back.out(1.6)' }, .25)
          .from(spokes, {
              attr: { x2: function (i, t) { return t.getAttribute('x1'); }, y2: function (i, t) { return t.getAttribute('y1'); } },
              duration: .9, stagger: .09, ease: 'power2.out'
          }, .45)
          .from(ring, {
              attr: { x2: function (i, t) { return t.getAttribute('x1'); }, y2: function (i, t) { return t.getAttribute('y1'); } },
              duration: .7, stagger: .06, ease: 'power2.out'
          }, .85)
          .from(sats, { scale: 0, transformOrigin: '50% 50%', duration: .5, stagger: .07, ease: 'back.out(3)' }, 1.0)
          .from(chips, { scale: 0, autoAlpha: 0, duration: .6, stagger: .1, ease: 'back.out(2.2)' }, .75)
          .to(['.hero-lead', '.hero-actions'], { autoAlpha: 1, startAt: { y: 18 }, y: 0, duration: .8, stagger: .12 }, .65);

        /* ---------- HERO: paket data mengalir ---------- */
        var nodePos = { core: [260, 260] };
        var nodeEl = { core: core };
        chips.forEach(function (c) { nodeEl[c.getAttribute('data-node')] = c; });
        var routes = $$('.net-svg line').map(function (l) {
            var a = [+l.getAttribute('x1'), +l.getAttribute('y1')];
            var b = [+l.getAttribute('x2'), +l.getAttribute('y2')];
            return { a: a, b: b, na: l.getAttribute('data-a'), nb: l.getAttribute('data-b'), learning: l.classList.contains('is-learning') };
        });

        var packetLayer = $('.net-packets');
        var heroVisible = true;
        var NS = 'http://www.w3.org/2000/svg';

        function pulse(key) {
            var el = nodeEl[key];
            if (!el) return;
            gsap.fromTo(el, { scale: 1 }, { scale: key === 'core' ? 1.05 : 1.12, duration: .16, yoyo: true, repeat: 1, ease: 'power2.out', overwrite: 'auto' });
        }

        function launch(p) {
            if (!alive) return;
            if (!heroVisible || document.hidden) { gsap.delayedCall(.8, function () { launch(p); }); return; }
            var r = gsap.utils.random(routes);
            var rev = Math.random() < .5;
            var from = rev ? r.b : r.a, to = rev ? r.a : r.b;
            var toKey = rev ? r.na : r.nb;
            gsap.set(p, { attr: { cx: from[0], cy: from[1], r: 5 }, autoAlpha: 1 });
            gsap.to(p, {
                attr: { cx: to[0], cy: to[1] },
                duration: gsap.utils.random(1.2, 1.9) * (r.learning ? 1.25 : 1),
                ease: 'power1.inOut',
                onComplete: function () {
                    pulse(toKey);
                    gsap.to(p, { autoAlpha: 0, duration: .2 });
                    gsap.delayedCall(gsap.utils.random(.15, .8), function () { launch(p); });
                }
            });
        }

        tl.call(function () {
            for (var i = 0; i < 3; i++) {
                var p = document.createElementNS(NS, 'circle');
                p.setAttribute('r', 5);
                p.style.opacity = 0;
                packetLayer.appendChild(p);
                gsap.delayedCall(i * .55, (function (q) { return function () { launch(q); }; })(p));
            }
        }, null, 1.5);

        ScrollTrigger.create({
            trigger: '.hero', start: 'top bottom', end: 'bottom top',
            onToggle: function (self) { heroVisible = self.isActive; }
        });

        // Diagram bergeser sedikit saat di-scroll
        gsap.to('.net', {
            yPercent: -7, ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
        });

        /* ---------- Judul seksi ---------- */
        $$('.sec-title').forEach(function (t) {
            var inner = $('.mask > span', t);
            var st = gsap.timeline({ scrollTrigger: { trigger: t, start: 'top 86%', once: true } });
            st.from(inner, { yPercent: 115, duration: 1, ease: 'expo.out' })
              .fromTo(t, { '--bar': 0 }, { '--bar': 1, duration: .8 }, .25);
        });
        gsap.from('.sec-sub', {
            autoAlpha: 0, y: 18, duration: .8,
            scrollTrigger: { trigger: '.sec-sub', start: 'top 90%', once: true }
        });

        /* ---------- About: kata menyala saat di-scroll ---------- */
        var lead = $('.reveal-words');
        var words = splitWords(lead);
        gsap.fromTo(words, { opacity: .16 }, {
            opacity: 1, ease: 'none', stagger: .12,
            scrollTrigger: { trigger: lead, start: 'top 82%', end: 'bottom 50%', scrub: .4 }
        });
        gsap.from('.about-copy', {
            autoAlpha: 0, y: 24, duration: .9,
            scrollTrigger: { trigger: '.about-copy', start: 'top 90%', once: true }
        });
        $$('.skills-row').forEach(function (row) {
            var st = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 92%', once: true } });
            st.from(row, { autoAlpha: 0, y: 16, duration: .6 })
              .from($$('li', row), { scale: .6, autoAlpha: 0, duration: .5, stagger: .07, ease: 'back.out(2.4)' }, .15);
        });

        /* ---------- Sertifikat: tirai + tilt ---------- */
        var cards = $$('.cert-card');
        var figs = $$('.cert-fig');
        var imgs = $$('.cert-fig img');
        gsap.set(cards, { autoAlpha: 0, y: 48 });
        gsap.set(figs, { clipPath: 'inset(0% 0% 100% 0%)' });

        ScrollTrigger.batch(cards, {
            start: 'top 90%', once: true,
            onEnter: function (batch) {
                gsap.to(batch, { autoAlpha: 1, y: 0, duration: .9, stagger: .13, overwrite: 'auto' });
                var f = batch.map(function (c) { return $('.cert-fig', c); });
                var im = batch.map(function (c) { return $('img', c); });
                gsap.to(f, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, stagger: .13, delay: .1, ease: 'expo.inOut', clearProps: 'clipPath' });
                gsap.fromTo(im, { scale: 1.25 }, { scale: 1, duration: 1.5, stagger: .13, delay: .1, ease: 'expo.out', clearProps: 'transform' });
            }
        });

        if (fine) {
            cards.forEach(function (card) {
                gsap.set(card, { transformPerspective: 900 });
                var rx = gsap.quickTo(card, 'rotationX', { duration: .5, ease: 'power3' });
                var ry = gsap.quickTo(card, 'rotationY', { duration: .5, ease: 'power3' });
                card.addEventListener('pointermove', function (e) {
                    var b = card.getBoundingClientRect();
                    var px = (e.clientX - b.left) / b.width - .5;
                    var py = (e.clientY - b.top) / b.height - .5;
                    ry(px * 7); rx(-py * 7);
                });
                card.addEventListener('pointerleave', function () { rx(0); ry(0); });
            });
        }

        /* ---------- Gelombang naik saat di-scroll ---------- */
        $$('.wave').forEach(function (w, i) {
            if (i === 0) return; // gelombang hero langsung terlihat penuh
            gsap.fromTo(w, { scaleY: .25 }, {
                scaleY: 1, ease: 'none',
                scrollTrigger: { trigger: w, start: 'top bottom', end: 'top 65%', scrub: true }
            });
        });

        /* ---------- Kontak + footer ---------- */
        gsap.from('.contact-lead, .contact-ig', {
            autoAlpha: 0, y: 20, duration: .8, stagger: .12,
            scrollTrigger: { trigger: '.contact-lead', start: 'top 90%', once: true }
        });
        var cf = gsap.timeline({ scrollTrigger: { trigger: '.form-card', start: 'top 88%', once: true } });
        cf.from('.form-card', { autoAlpha: 0, y: 44, duration: .9 })
          .from('.form-card .field', { autoAlpha: 0, y: 18, duration: .6, stagger: .09 }, .25);

        gsap.from('.footer-inner > *', {
            autoAlpha: 0, y: 16, duration: .7, stagger: .1,
            scrollTrigger: { trigger: '.site-footer', start: 'top 96%', once: true }
        });

        return function () { alive = false; };
    });

    // Posisi trigger bergantung pada tinggi gambar dan font
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
