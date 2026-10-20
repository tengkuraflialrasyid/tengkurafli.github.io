// Slider berita: baris atas geser ke kanan tiap 2 detik, baris bawah geser ke kiri tiap 3 detik.
    // Tombol ‹ › menggeser kedua baris secara manual.
    (function () {
        var wrap = document.querySelector('.berita-wrap');
        if (!wrap) return;
        var rows = [].slice.call(wrap.querySelectorAll('.berita-track'));
        var prev = document.getElementById('beritaPrev');
        var next = document.getElementById('beritaNext');
        var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var paused = false, visible = false;

        function stepSize(track) {
            var card = track.querySelector('.berita-card');
            var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
            return card.getBoundingClientRect().width + gap;
        }
        // dir > 0: ke kanan, dir < 0: ke kiri; di ujung akan berputar ke sisi seberang
        function move(track, dir) {
            var max = track.scrollWidth - track.clientWidth;
            if (dir > 0) {
                if (track.scrollLeft >= max - 4) track.scrollTo({ left: 0, behavior: 'smooth' });
                else track.scrollBy({ left: stepSize(track), behavior: 'smooth' });
            } else {
                if (track.scrollLeft <= 4) track.scrollTo({ left: max, behavior: 'smooth' });
                else track.scrollBy({ left: -stepSize(track), behavior: 'smooth' });
            }
        }

        rows.forEach(function (track) {
            // baris yang bergerak ke kiri dimulai dari ujung kanan
            if (track.dataset.start === 'end') {
                track.style.scrollBehavior = 'auto';
                track.scrollLeft = track.scrollWidth;
                track.style.scrollBehavior = '';
            }
            track._timer = null;
        });

        function startRow(track) {
            if (reduceMotion || track._timer) return;
            track._timer = setInterval(function () {
                if (!paused && visible && !document.hidden) move(track, parseInt(track.dataset.dir, 10));
            }, parseInt(track.dataset.delay, 10));
        }
        function restartAll() {
            rows.forEach(function (t) { clearInterval(t._timer); t._timer = null; startRow(t); });
        }

        next.addEventListener('click', function () { rows.forEach(function (t) { move(t, 1); }); restartAll(); });
        prev.addEventListener('click', function () { rows.forEach(function (t) { move(t, -1); }); restartAll(); });

        // Jeda saat kursor / fokus / jari berada di slider
        wrap.addEventListener('mouseenter', function () { paused = true; });
        wrap.addEventListener('mouseleave', function () { paused = false; });
        wrap.addEventListener('focusin', function () { paused = true; });
        wrap.addEventListener('focusout', function () { paused = false; });
        wrap.addEventListener('touchstart', function () { paused = true; }, { passive: true });
        wrap.addEventListener('touchend', function () {
            setTimeout(function () { paused = false; }, 3000);
        }, { passive: true });

        // Hanya berjalan saat terlihat di layar
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                visible = entries[0].isIntersecting;
            }, { threshold: 0.2 }).observe(wrap);
        } else {
            visible = true;
        }
        rows.forEach(startRow);
    })();


// ---------------------------------------------------------------
// Pencarian: cari teks di seluruh halaman, lalu lompat ke hasilnya
// ---------------------------------------------------------------
(function () {
    var modalEl = document.getElementById('modalCari');
    if (!modalEl) return;
    var input = document.getElementById('cariInput');
    var list = document.getElementById('cariHasil');

    var LABELS = {
        home: 'Beranda', tentang: 'Tentang Kami', prodi: 'Program Studi', kurikulum: 'Akademik',
        penelitian: 'Penelitian', pengabdian: 'Pengabdian', berita: 'Berita', kontak: 'Kontak'
    };
    var ICONS = {
        'Beranda': 'bi-house', 'Tentang Kami': 'bi-info-circle', 'Program Studi': 'bi-mortarboard',
        'Akademik': 'bi-calendar3', 'Penelitian': 'bi-lightbulb', 'Pengabdian': 'bi-heart',
        'Berita': 'bi-newspaper', 'Kontak': 'bi-envelope'
    };
    var CARD_SELECTOR = '.card, .tentang-card, .riset-card, .pub-card, .kegiatan-card, .berita-card, .roadmap-step, .kontak-item';

    var index = null, results = [], active = -1;

    function clean(s) { return (s || '').replace(/\s+/g, ' ').trim(); }
    function norm(s) { return clean(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
    function escapeHtml(s) {
        return s.replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function highlight(text, tokens) {
        var parts = tokens.filter(Boolean).map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
        if (!parts.length) return escapeHtml(text);
        var re = new RegExp('(' + parts.join('|') + ')', 'gi'), out = '', last = 0, m;
        while ((m = re.exec(text))) {
            out += escapeHtml(text.slice(last, m.index)) + '<mark>' + escapeHtml(m[0]) + '</mark>';
            last = m.index + m[0].length;
        }
        return out + escapeHtml(text.slice(last));
    }
    function snippet(text, tokens) {
        var lower = text.toLowerCase(), pos = -1;
        tokens.forEach(function (t) {
            var i = lower.indexOf(t);
            if (i !== -1 && (pos === -1 || i < pos)) pos = i;
        });
        var start = Math.max(0, (pos === -1 ? 0 : pos) - 40);
        // mulai dari awal kata, bukan di tengah kata
        if (start > 0) {
            var sp = text.indexOf(' ', start);
            if (sp !== -1 && sp < pos) start = sp + 1;
        }
        var end = Math.min(text.length, start + 120);
        var lastSpace = text.lastIndexOf(' ', end);
        if (end < text.length && lastSpace > start + 60) end = lastSpace;
        return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
    }
    function labelOf(el) {
        var sec = el.closest('section[id]');
        if (sec) return LABELS[sec.id] || clean((sec.querySelector('h2') || {}).textContent) || sec.id;
        return el.closest('header.hero') ? 'Beranda' : '';
    }

    // Kumpulkan isi halaman yang bisa dicari (sekali saja)
    function build() {
        var items = [], seen = [];
        function add(scrollEl, hitEl, title, text, label, isSection) {
            title = clean(title);
            if (!title || seen.indexOf(scrollEl) !== -1) return;
            seen.push(scrollEl);
            items.push({ el: scrollEl, hit: hitEl, title: title, text: clean(text), label: label, section: !!isSection });
        }
        var hero = document.querySelector('header.hero');
        if (hero) {
            var h1 = hero.querySelector('h1');
            add(hero, h1 || hero, h1 ? h1.textContent : 'Beranda', hero.textContent, 'Beranda', true);
        }
        [].forEach.call(document.querySelectorAll('section[id]'), function (sec) {
            var h2 = sec.querySelector('h2');
            var label = LABELS[sec.id] || clean(h2 && h2.textContent);
            var p = sec.querySelector('p');
            add(sec, h2 || sec, (h2 && h2.textContent) || label, p ? p.textContent : '', label, true);
        });
        [].forEach.call(document.querySelectorAll(CARD_SELECTOR), function (card) {
            if (card.closest('nav, footer, .modal')) return;
            var t = card.querySelector('h3, h4, h5, h6, strong');
            if (!t) return;
            var full = clean(card.textContent);
            add(card, card, t.textContent, full.replace(clean(t.textContent), ''), labelOf(card), false);
        });
        return items;
    }

    function search(q) {
        var tokens = norm(q).split(' ').filter(Boolean);
        if (!tokens.length) return { tokens: tokens, list: [] };
        var found = [];
        index.forEach(function (it, order) {
            var ht = norm(it.title), hx = norm(it.text + ' ' + it.label), score = it.section ? 2 : 0, ok = true;
            tokens.forEach(function (t) {
                var inT = ht.indexOf(t) !== -1, inX = hx.indexOf(t) !== -1;
                if (!inT && !inX) { ok = false; return; }
                if (inT) score += ht.indexOf(t) === 0 ? 8 : 5;
                if (inX) score += 1;
            });
            if (ok) found.push({ it: it, score: score, order: order });
        });
        found.sort(function (a, b) { return b.score - a.score || a.order - b.order; });
        return { tokens: tokens, list: found.slice(0, 12).map(function (f) { return f.it; }) };
    }

    function row(it, i, tokens, withSnippet) {
        var icon = ICONS[it.label] || 'bi-search';
        var sn = withSnippet && it.text ? '<small>' + highlight(snippet(it.text, tokens), tokens) + '</small>' : '';
        return '<button type="button" class="cari-item" role="option" id="cari-opt-' + i + '" data-i="' + i + '">' +
            '<span class="cari-ikon"><i class="bi ' + icon + '"></i></span>' +
            '<span class="cari-teks"><strong>' + highlight(it.title, tokens) + '</strong>' + sn + '</span>' +
            (it.label ? '<span class="cari-label">' + escapeHtml(it.label) + '</span>' : '') +
            '</button>';
    }

    function render() {
        var q = input.value;
        active = -1;
        if (!norm(q)) {
            results = index.filter(function (it) { return it.section; });
            list.innerHTML = '<p class="cari-judul">Pintasan</p>' +
                results.map(function (it, i) { return row(it, i, [], false); }).join('');
            return;
        }
        var r = search(q);
        results = r.list;
        if (!results.length) {
            list.innerHTML = '<p class="cari-kosong"><i class="bi bi-emoji-frown"></i> Tidak ada hasil untuk “' +
                escapeHtml(clean(q)) + '”. Coba kata kunci lain, misalnya <em>magang</em>, <em>jaringan</em>, atau <em>kontak</em>.</p>';
            return;
        }
        list.innerHTML = '<p class="cari-judul">' + results.length + ' hasil</p>' +
            results.map(function (it, i) { return row(it, i, r.tokens, true); }).join('');
        setActive(0);
    }

    function setActive(i) {
        var opts = list.querySelectorAll('.cari-item');
        if (!opts.length) return;
        active = (i + opts.length) % opts.length;
        [].forEach.call(opts, function (o, n) {
            o.classList.toggle('active', n === active);
            o.setAttribute('aria-selected', n === active ? 'true' : 'false');
        });
        opts[active].scrollIntoView({ block: 'nearest' });
        input.setAttribute('aria-activedescendant', opts[active].id);
    }

    function jump(it) {
        var target = it.el;
        var top = target.matches('header, section');
        if (target.matches('header.hero')) window.scrollTo({ top: 0, behavior: 'smooth' });
        else target.scrollIntoView({ behavior: 'smooth', block: top ? 'start' : 'center', inline: 'center' });
        var hit = it.hit || target;
        hit.classList.remove('search-hit');
        void hit.offsetWidth;
        hit.classList.add('search-hit');
        setTimeout(function () { hit.classList.remove('search-hit'); }, 2800);
    }
    function go(it) {
        if (!it) return;
        var modal = bootstrap.Modal.getInstance(modalEl);
        var after = function () { modalEl.removeEventListener('hidden.bs.modal', after); jump(it); };
        modalEl.addEventListener('hidden.bs.modal', after);
        modal.hide();
    }

    input.addEventListener('input', render);
    input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
        else if (e.key === 'Enter') { e.preventDefault(); go(results[active >= 0 ? active : 0]); }
    });
    list.addEventListener('click', function (e) {
        var b = e.target.closest('.cari-item');
        if (b) go(results[parseInt(b.dataset.i, 10)]);
    });
    list.addEventListener('mousemove', function (e) {
        var b = e.target.closest('.cari-item');
        if (b && parseInt(b.dataset.i, 10) !== active) setActive(parseInt(b.dataset.i, 10));
    });

    modalEl.addEventListener('show.bs.modal', function () {
        if (!index) index = build();
        input.value = '';
        render();
        // tutup menu navbar (mode HP) agar tidak menumpuk dengan pencarian
        var nav = document.getElementById('menu');
        if (nav && nav.classList.contains('show')) bootstrap.Collapse.getOrCreateInstance(nav).hide();
    });
    modalEl.addEventListener('shown.bs.modal', function () { input.focus(); });

    // Pintasan keyboard: "/" atau Ctrl/Cmd + K
    document.addEventListener('keydown', function (e) {
        var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
        if ((e.key === '/' && !typing && !e.ctrlKey && !e.metaKey) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
            e.preventDefault();
            bootstrap.Modal.getOrCreateInstance(modalEl).show();
        }
    });
})();

const scriptURL = 'https://script.google.com/macros/s/AKfycbwixfozdtreoQnVrDL4oboVVemzUkwoA-dY4ln1Inr8v-ZiXhRh6WItQPS0M2GTHuqU/exec';
const form = document.forms['submit-to-google-sheet'];
const btnKirim = document.querySelector('.btn-kirim');
const btnLoading = document.querySelector('.btn-loading');
const alertSukses = document.querySelector('.alert-sukses');
const alertGagal = document.querySelector('.alert-gagal');
let alertTimer = null;

function tampilAlert(el) {
    clearTimeout(alertTimer);
    alertSukses.classList.add('d-none');
    alertGagal.classList.add('d-none');
    el.classList.remove('d-none');
    // restart animasi muncul
    el.classList.remove('alert-muncul');
    void el.offsetWidth;
    el.classList.add('alert-muncul');
    alertTimer = setTimeout(function () { el.classList.add('d-none'); }, 6000);
}

// Tombol X hanya menyembunyikan alert (bukan menghapusnya), jadi alert tetap bisa muncul lagi
[].forEach.call(document.querySelectorAll('.alert-tutup'), function (btn) {
    btn.addEventListener('click', function () { btn.closest('.alert').classList.add('d-none'); });
});

function setLoading(on) {
    btnLoading.classList.toggle('d-none', !on);
    btnKirim.classList.toggle('d-none', on);
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    setLoading(true);
    alertSukses.classList.add('d-none');
    alertGagal.classList.add('d-none');
    fetch(scriptURL, { method: 'POST', body: new FormData(form) })
        .then((response) => {
            setLoading(false);
            tampilAlert(alertSukses);
            form.reset();
            console.log('Success!', response);
        })
        .catch((error) => {
            setLoading(false);
            tampilAlert(alertGagal);
            console.error('Error!', error.message);
        });
});

// ---------------------------------------------------------------
// Saat halaman dibuka / di-refresh: mulai dari atas, lalu isi muncul berurutan atas -> bawah
// ---------------------------------------------------------------
(function () {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hasHash = !!location.hash;

    // Cegah browser memulihkan posisi scroll lama saat refresh
    if (!hasHash && 'scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (!hasHash) window.scrollTo(0, 0);

    if (reduce || !('IntersectionObserver' in window)) return;

    var items = [];
    function add(list) { [].forEach.call(list, function (el) { if (items.indexOf(el) === -1) items.push(el); }); }

    add(document.querySelectorAll('header.hero .container-xl .col-lg-6 > *'));
    add(document.querySelectorAll('header.hero .building'));
    add(document.querySelectorAll('section .container-xl > *'));
    add(document.querySelectorAll('section .container-xl > .row > [class*="col-"]'));

    // Hindari elemen bersarang ganda & isi slider berita (digeser horizontal)
    items = items.filter(function (el) { return !el.closest('.berita-rows'); });

    items.forEach(function (el) { el.classList.add('reveal'); });

    var io = new IntersectionObserver(function (entries) {
        // urutkan dari yang paling atas, beri jeda bertahap
        var masuk = entries.filter(function (en) { return en.isIntersecting; })
            .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
        masuk.forEach(function (en, i) {
            en.target.style.transitionDelay = Math.min(i, 8) * 110 + 'ms';
            en.target.classList.add('reveal-in');
            io.unobserve(en.target);
            // bersihkan delay setelah selesai supaya tidak mengganggu efek hover
            setTimeout(function () { en.target.style.transitionDelay = ''; }, 1400);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    items.forEach(function (el) { io.observe(el); });
})();
