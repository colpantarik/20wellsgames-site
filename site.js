(function () {
  const body = document.body;
  // Old links may still carry .html; show the clean path without reloading.
  if (/\/(index|ringer|support|privacy)\.html$/.test(location.pathname) && history.replaceState) {
    const clean = location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    history.replaceState(null, '', clean + location.search + location.hash);
  }
  // Flip to true the day Ringer is approved: shows App Store buttons and "out now" stamps everywhere.
  const RINGER_LIVE = true;
  if (RINGER_LIVE) body.classList.add('live');
  document.querySelectorAll('.when-live').forEach(e => { e.hidden = !RINGER_LIVE; });
  document.querySelectorAll('.when-soon').forEach(e => { e.hidden = RINGER_LIVE; });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SUPABASE_URL = 'https://tjnqhvfmtbsiwjzhcpie.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqbnFodmZtdGJzaXdqemhjcGllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyODAyNTcsImV4cCI6MjA5Mjg1NjI1N30.N7d9ndpt5-wc4cjSJY48zwBsSqlY3QCNwJEOxikkdf4';
  const withTimeout = ms => {
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) return AbortSignal.timeout(ms);
    if (typeof AbortController === 'undefined') return undefined;
    const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal;
  };
  const sbHeaders = { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };

  /* ---------- card frames ---------- */
  function sizeFrames() {
    document.querySelectorAll('.card').forEach(card => {
      const r = card.querySelector('.card-frame rect');
      if (!r) return;
      r.setAttribute('x', 2); r.setAttribute('y', 2);
      r.setAttribute('width', Math.max(0, card.clientWidth - 4));
      r.setAttribute('height', Math.max(0, card.clientHeight - 4));
    });
  }
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => sizeFrames());
    document.querySelectorAll('.card').forEach(c => ro.observe(c));
  }
  sizeFrames();

  /* ---------- panels reveal ---------- */
  const panels = document.querySelectorAll('.panel');
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('reached'); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    panels.forEach(p => io.observe(p));
  } else {
    panels.forEach(p => p.classList.add('reached'));
  }

  /* ---------- intro (home only) ---------- */
  const hero = document.querySelector('.hero');
  if (hero) {
    function finishIntro() {
      const skipBtn = document.querySelector('.skip');
      const hadFocus = skipBtn && document.activeElement === skipBtn;
      body.classList.add('done');
      try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}
      if (hadFocus) { const first = document.querySelector('.nav a'); if (first) first.focus(); }
    }
    let seen = false;
    try { seen = sessionStorage.getItem('introSeen') === '1'; } catch (e) {}
    if (seen || reduced) body.classList.add('done');
    const skip = document.querySelector('.skip');
    if (skip) skip.addEventListener('click', finishIntro);
    setTimeout(finishIntro, 3600);
    window.addEventListener('scroll', function onFirstScroll() {
      if (window.scrollY > hero.offsetHeight * 0.5) { finishIntro(); window.removeEventListener('scroll', onFirstScroll); }
    }, { passive: true });
  }

  /* ---------- scroll-drawn road (home only) ---------- */
  const roadmap = document.querySelector('.roadmap');
  let buildRoad = () => {};
  if (roadmap) {
    const roadSvg = roadmap.querySelector('.road');
    const maskPath = roadSvg.querySelector('.road-mask');
    const roadPaths = roadSvg.querySelectorAll('.road-edge, .road-fill, .road-center');
    const milestones = Array.from(roadmap.querySelectorAll('.milestone'));
    const roadEnd = roadmap.querySelector('.road-end');
    let samples = [], totalLen = 0, stops = [], endY = 0;

    function localRect(el) {
      const r = el.getBoundingClientRect(), m = roadmap.getBoundingClientRect();
      return { x: r.left - m.left + r.width / 2, y: r.top - m.top + r.height / 2, top: r.top - m.top };
    }

    buildRoad = function () {
      const W = roadmap.clientWidth, H = roadmap.clientHeight;
      roadSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      roadSvg.setAttribute('width', W); roadSvg.setAttribute('height', H);
      const title = roadmap.querySelector('.section-title');
      const t = title.getBoundingClientRect(), mr = roadmap.getBoundingClientRect();
      stops = [];
      const marks = milestones.map(m => { const p = localRect(m.querySelector('.marker')); stops.push(p.y); return { x: p.x, y: p.y }; });
      // on phones the markers share one left-hand column; keep the road in it so it never crosses a card
      const narrow = W <= 1000 && marks.length;
      const pts = [{ x: narrow ? marks[0].x : W / 2, y: t.bottom - mr.top + 8 }, ...marks];
      const e = localRect(roadEnd); endY = e.top;
      pts.push({ x: narrow ? marks[marks.length - 1].x : W / 2, y: e.top - 30 });
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i - 1], q = pts[i], my = (p.y + q.y) / 2;
        d += ` C ${p.x} ${my}, ${q.x} ${my}, ${q.x} ${q.y}`;
      }
      maskPath.setAttribute('d', d);
      roadPaths.forEach(p => p.setAttribute('d', d));
      totalLen = maskPath.getTotalLength();
      samples = [];
      const N = 240;
      for (let i = 0; i <= N; i++) { const len = totalLen * i / N; samples.push({ len, y: maskPath.getPointAtLength(len).y }); }
      sizeFrames();
      update();
    };

    function update() {
      if (!totalLen) return;
      const m = roadmap.getBoundingClientRect();
      let tipY = window.innerHeight * 0.65 - m.top;
      // at the very bottom of the page the chalk finishes the road no matter how tall the window is
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atEnd) tipY = Math.max(tipY, endY + 1000);
      let frac = 0;
      if (tipY > 0) {
        let i = samples.findIndex(s => s.y >= tipY);
        if (i < 0) i = samples.length - 1;
        frac = samples[i].len / totalLen;
      }
      if (reduced) frac = 1;
      maskPath.setAttribute('stroke-dashoffset', (1 - frac).toFixed(4));
      milestones.forEach((el, i) => { if ((reduced || tipY >= stops[i] - 8) && !el.classList.contains('reached')) el.classList.add('reached'); });
      if ((reduced || tipY >= endY - 40) && !roadEnd.classList.contains('reached')) roadEnd.classList.add('reached');
    }

    // keyboard users: focusing inside a milestone reveals it (and everything before it)
    roadmap.addEventListener('focusin', e => {
      const m = e.target.closest('.milestone');
      if (m) milestones.slice(0, milestones.indexOf(m) + 1).forEach(el => el.classList.add('reached'));
    });

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => { update(); ticking = false; });
    }, { passive: true });
    let rafId = 0;
    const scheduleBuild = () => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(buildRoad); };
    if ('ResizeObserver' in window) {
      const rro = new ResizeObserver(scheduleBuild);
      rro.observe(roadmap); milestones.forEach(m => rro.observe(m));
    } else {
      let rt;
      window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(buildRoad, 120); });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildRoad);
    window.addEventListener('load', buildRoad);
    buildRoad();
  }

  /* ---------- nudge-me form ---------- */
  const notify = document.querySelector('.notify');
  if (notify) {
    const input = notify.querySelector('input[type="email"]');
    const trap = notify.querySelector('input[name="website"]');
    const msg = notify.querySelector('.notify-msg');
    const btn = notify.querySelector('button');
    let sending = false;
    notify.addEventListener('submit', async ev => {
      ev.preventDefault();
      if (sending) return;
      const email = input.value.trim();
      msg.className = 'notify-msg';
      if (trap && trap.value) { msg.textContent = 'chalked in. we\'ll email you once, at launch.'; msg.classList.add('ok'); input.value = ''; return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        msg.textContent = 'that doesn\'t look like an email address. typo?'; msg.classList.add('err');
        input.setAttribute('aria-invalid', 'true'); input.focus(); return;
      }
      input.removeAttribute('aria-invalid');
      sending = true; btn.setAttribute('aria-busy', 'true'); msg.textContent = 'writing it down…';
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/subscribe`, {
          method: 'POST', headers: sbHeaders, body: JSON.stringify({ p_email: email, p_source: 'site' }),
          signal: withTimeout(10000)
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        msg.textContent = 'chalked in. we\'ll email you once, at launch.'; msg.classList.add('ok'); input.value = '';
      } catch (e) {
        msg.innerHTML = 'couldn\'t save that just now. <a href="mailto:tcolpan@20wellsgames.com?subject=Nudge%20me">email us</a> and we\'ll add you by hand.';
        msg.classList.add('err');
      } finally { sending = false; btn.removeAttribute('aria-busy'); }
    });
  }

  /* ---------- Ringer leaderboard (game page) ---------- */
  const lbList = document.querySelector('.lb-list');
  if (lbList) {
    const lbUpdated = document.querySelector('.lb-updated');
    const lbRefresh = document.querySelector('.lb-refresh');
    let lastFetch = 0;
    const flag = cc => (!cc || !/^[A-Za-z]{2}$/.test(cc)) ? '🏳️' : String.fromCodePoint(...cc.toUpperCase().split('').map(ch => 0x1F1E6 + ch.charCodeAt(0) - 65));
    const esc = s => String(s).replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    const fmt = n => Number(n || 0).toLocaleString();

    let regionNames = null;
    try { regionNames = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) {}
    const countryName = cc => { if (!cc || !/^[A-Za-z]{2}$/.test(cc)) return 'unknown country'; try { return regionNames ? regionNames.of(cc.toUpperCase()) : cc; } catch (e) { return cc; } };
    const status = text => `<tr><td class="lb-status" colspan="5" role="status">${text}</td></tr>`;
    let lastJson = '';
    function renderRows(rows) {
      const json = JSON.stringify(rows);
      if (json === lastJson) return;
      lastJson = json;
      const scroller = lbList.closest('.lb-scroll'); const st = scroller ? scroller.scrollTop : 0;
      if (!rows.length) { lbList.innerHTML = status('no scores yet. finish an endless run and your name goes up first.'); return; }
      lbList.innerHTML = rows.map((r, i) =>
        `<tr><td class="lb-rank">${i + 1}</td>` +
        `<td class="lb-name"><span class="lb-flag" role="img" aria-label="${esc(countryName(r.country))}">${flag(r.country)}</span><span class="who">${esc(String(r.username || '').trim() || 'anonymous')}</span></td>` +
        `<td class="lb-score">${fmt(r.score)}</td><td class="lb-level">${fmt(r.level)}</td><td class="lb-hooks">${fmt(r.hooks)}</td></tr>`
      ).join('');
      if (scroller) scroller.scrollTop = st;
    }
    function tickUpdated() {
      if (!lastFetch) return;
      const s = Math.round((Date.now() - lastFetch) / 1000);
      lbUpdated.textContent = s < 10 ? 'updated just now' : s < 60 ? `updated ${s}s ago` : `updated ${Math.round(s / 60)} min ago`;
    }
    let inFlight = null;
    function loadLeaderboard() {
      if (inFlight) return inFlight;
      lbRefresh.disabled = true;
      inFlight = (async () => {
        try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/public_scores?select=username,score,level,hooks,country&order=score.desc,level.desc&limit=50`, { headers: sbHeaders, signal: withTimeout(10000) });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const rows = await res.json();
          if (!Array.isArray(rows)) throw new Error('bad payload');
          renderRows(rows.filter(r => r && typeof r === 'object'));
          lastFetch = Date.now(); tickUpdated();
        } catch (e) {
          if (!lastFetch) { lastJson = ''; lbList.innerHTML = status('couldn\'t reach the leaderboard. hit refresh, or try again in a minute.'); }
          lastFetch = 0; lbUpdated.textContent = 'couldn\'t refresh just now';
        } finally { lbRefresh.disabled = false; inFlight = null; sizeFrames(); }
      })();
      return inFlight;
    }
    lbRefresh.addEventListener('click', loadLeaderboard);
    loadLeaderboard();
    setInterval(() => { if (!document.hidden) loadLeaderboard(); }, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) loadLeaderboard(); });
    setInterval(tickUpdated, 5000);
  }

})();
