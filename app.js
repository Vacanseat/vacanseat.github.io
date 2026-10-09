(function () {
  'use strict';
  const VS = window.VS;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const view = $('#view');
  const sheet = $('#sheet');
  const rnd = (a, b) => a + Math.random() * (b - a);

  const state = { q: '', filter: 'all' };
  let current = { type: 'list' };
  let sheetCtx = null;
  let listScroll = 0;
  let fromList = false;
  let ro = null;

  /* ---------- simulated sensors ---------- */

  // Occupied reads 105 to 235 lb. A bag now and then reads 14 to 38 lb, so it stays open.
  const reading = (occ) => (occ ? Math.round(rnd(105, 235)) : Math.random() < 0.1 ? Math.round(rnd(14, 38)) : 0);

  function seed(p) {
    p.base = p.busy;
    p.tables = p.t.map(([label, x, y, rows, cols]) => ({
      label, x, y, rows, cols,
      seats: Array.from({ length: rows * cols }, () => reading(Math.random() < p.busy))
    }));
  }

  function reroll(p, busy) {
    p.busy = busy;
    p.tables.forEach((t) => { t.seats = t.seats.map(() => reading(Math.random() < busy)); });
  }

  function tick() {
    VS.PLACES.forEach((p) => {
      const arrive = 0.05 * p.busy, leave = 0.05 * (1 - p.busy);
      p.tables.forEach((t) => {
        t.seats = t.seats.map((lb) => {
          const occ = VS.isOcc(lb);
          if (occ && Math.random() < leave) return reading(false);
          if (!occ && Math.random() < arrive) return reading(true);
          return lb;
        });
      });
    });
  }

  /* ---------- list ---------- */

  function renderList() {
    view.innerHTML = `
      <header class="bar"><div class="brand">${VS.I.logo}<span>Vacantseat</span></div><button class="iconbtn" data-help aria-label="How it works">${VS.I.help}</button></header>
      <div class="wrap">
        <h1 class="title">Find a seat</h1>
        <label class="search"><span class="sr">Search places</span>${VS.I.search}<input id="q" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Search places" value="${VS.esc(state.q)}"></label>
        <div class="seg" role="group" aria-label="Show places">
          ${['all', 'public', 'private'].map((f) => `<button data-filter="${f}" aria-pressed="${state.filter === f}">${f[0].toUpperCase() + f.slice(1)}</button>`).join('')}
        </div>
        <div id="cards"></div>
        <p class="foot">Demo data. Sensor readings are simulated for this class project.</p>
      </div>`;
    drawCards();
    window.scrollTo(0, listScroll);
  }

  function drawCards() {
    const q = state.q.trim().toLowerCase();
    const items = VS.PLACES.filter((p) => (state.filter === 'all' || p.mode === state.filter) && (!q || (p.name + ' ' + p.kind).toLowerCase().includes(q)));
    items.sort((a, b) => (a.mode !== b.mode ? (a.mode === 'public' ? -1 : 1) : a.mode === 'public' ? VS.counts(b).open - VS.counts(a).open : a.name.localeCompare(b.name)));
    $('#cards').innerHTML = items.length
      ? items.map((p) => VS.cardHTML(p)).join('')
      : '<p class="sub" style="padding:18px 4px">No places match. Try a building or a cafe name.</p>';
  }

  /* ---------- place ---------- */

  function renderPlace(p, staff) {
    const c = VS.counts(p);
    view.innerHTML = `
      <header class="bar">
        <button class="iconbtn" data-back aria-label="Back to places">${VS.I.back}</button>
        <div class="bar-title"><h1>${VS.esc(p.name)}</h1><p>${VS.esc(p.kind)}, ${VS.esc(p.hours)}</p></div>
        <span class="tag ${staff ? 'staff' : 'pub'}">${staff ? 'Staff view' : 'Public'}</span>
      </header>
      <div class="wrap">
        ${staff ? '<div class="banner">Staff preview. Visitors only see a locked card for this place.</div>' : ''}
        <div class="sum"><div class="o"><strong id="nOpen">${c.open}</strong>open</div><div class="t"><strong id="nTaken">${c.taken}</strong>taken</div><span class="live"><i></i>Live, simulated</span></div>
        <div class="legend"><span><i class="seat open"></i>Open</span><span><i class="seat occ"></i>Taken</span><span><i class="hub"></i>Table hub</span></div>
        <div class="floor" id="floor">
          ${p.tables.map((t, ti) => `<button class="tbl" data-t="${ti}" style="left:calc(var(--u)*${t.x});top:calc(var(--u)*${t.y});grid-template-columns:repeat(${t.cols},calc(var(--u)*6))">
            ${t.seats.map((lb, si) => `<span class="seat ${VS.isOcc(lb) ? 'occ' : 'open'}" data-s="${si}"></span>`).join('')}<i class="hub"></i>
            <span class="tlabel"><b>${VS.esc(t.label)}</b>${t.seats.length > 1 ? '<em data-tc></em>' : ''}</span></button>`).join('')}
        </div>
        <div class="lvl"><p>Demo controls. Change how busy the room is.</p>
          <div class="seg" role="group" aria-label="Room busyness">
            ${[['Quiet', 0.2], ['Steady', p.base], ['Packed', 0.93]].map(([n, v]) => `<button data-level="${v}" aria-pressed="${Math.abs(p.busy - v) < 0.01}">${n}</button>`).join('')}
          </div>
        </div>
        <p class="foot">Demo data. Tap a table to see each seat's reading.</p>
      </div>`;
    fit();
    paint(p, false);
  }

  function fit() {
    const floor = $('#floor');
    if (!floor || current.type !== 'place') return;
    const u = floor.clientWidth / 100;
    floor.style.setProperty('--u', u + 'px');
    floor.style.height = current.p.h * u + 'px';
  }

  function tableCounts(t) {
    const open = t.seats.filter((lb) => !VS.isOcc(lb)).length;
    return { open, total: t.seats.length };
  }

  function paint(p, animate) {
    const c = VS.counts(p);
    const no = $('#nOpen'), nt = $('#nTaken');
    if (no) no.textContent = c.open;
    if (nt) nt.textContent = c.taken;
    $$('#floor .tbl').forEach((el) => {
      const t = p.tables[+el.dataset.t];
      $$('.seat', el).forEach((s, i) => {
        const occ = VS.isOcc(t.seats[i]);
        if (occ !== s.classList.contains('occ')) {
          s.classList.toggle('occ', occ);
          s.classList.toggle('open', !occ);
          if (animate) { s.classList.remove('flip'); void s.offsetWidth; s.classList.add('flip'); }
        }
      });
      const tc = tableCounts(t);
      const em = $('[data-tc]', el);
      if (em) em.textContent = tc.open + ' open';
      el.setAttribute('aria-label', `Table ${t.label}, ${t.rows}x${t.cols}, ${tc.open} of ${tc.total} seats open`);
    });
  }

  /* ---------- sheets ---------- */

  function showSheet(html) {
    sheet.innerHTML = `<div class="scrim" data-close></div><div class="panel" role="dialog" aria-modal="true">${html}</div>`;
    sheet.classList.add('on');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lock');
    const b = $('[data-close]:not(.scrim)', sheet) || $('.btn', sheet);
    if (b) b.focus({ preventScroll: true });
  }

  function closeSheet() {
    sheetCtx = null;
    sheet.classList.remove('on');
    sheet.setAttribute('aria-hidden', 'true');
    if (!VS.tutorialOpen()) document.body.classList.remove('lock');
  }

  VS.tutorialOpen = () => !$('#tutorial').hidden;

  function tableSheetHTML(p, t) {
    const tc = tableCounts(t);
    return `<div class="grab"></div>
      <div class="sh-head"><div><h2>Table ${VS.esc(t.label)}</h2><p class="sub">${t.rows}x${t.cols}, ${tc.total} seat${tc.total > 1 ? 's' : ''}</p></div><button class="iconbtn" data-close aria-label="Close">${VS.I.close}</button></div>
      <p class="sh-big"><strong>${tc.open}</strong>of ${tc.total} open</p>
      <div class="sgrid">${t.seats.map((lb, i) => `<div class="cell"><span class="seat ${VS.isOcc(lb) ? 'occ' : 'open'}"></span><small>${lb}<span class="sr"> pounds, seat ${i + 1}, ${VS.isOcc(lb) ? 'taken' : 'open'}</span></small></div>`).join('')}</div>
      <p class="note">Numbers are pounds on each seat. ${VS.THRESHOLD} lb or more counts as taken, so a backpack reads open. The hub under this table adds the seats up.</p>`;
  }

  function openTable(ti) {
    const p = current.p, t = p.tables[ti];
    sheetCtx = { p, ti };
    showSheet(tableSheetHTML(p, t));
  }

  function openLocked(id) {
    const p = VS.PLACES.find((x) => x.id === id);
    showSheet(`<div class="grab"></div>
      <div class="lockicon">${VS.I.lock(28)}</div>
      <h2>${VS.esc(p.name)} is private</h2>
      <p class="note" style="font-size:16px;margin-top:10px">The owner picks who sees the floor when they buy the seating. Staff see open tables so they can seat guests faster. Everyone else sees this locked card.</p>
      <div class="btnrow"><button class="btn ghost" data-close>Close</button><button class="btn" data-staff="${p.id}">Preview staff view</button></div>`);
  }

  /* ---------- routing ---------- */

  function route() {
    const m = (location.hash || '#/').match(/^#\/p\/([\w-]+)(\?staff)?$/);
    closeSheet();
    if (current.type === 'list') listScroll = window.scrollY;
    if (m) {
      const p = VS.PLACES.find((x) => x.id === m[1]);
      if (p && (p.mode === 'public' || m[2])) {
        current = { type: 'place', p, staff: !!m[2] };
        renderPlace(p, !!m[2]);
        window.scrollTo(0, 0);
        return;
      }
    }
    current = { type: 'list' };
    renderList();
  }

  /* ---------- events ---------- */

  document.addEventListener('click', (e) => {
    const t = e.target;
    let el;
    if ((el = t.closest('[data-close]'))) return closeSheet();
    if ((el = t.closest('[data-help]'))) return VS.tutorial.open();
    if ((el = t.closest('[data-go]'))) { fromList = true; location.hash = '#/p/' + el.dataset.go; return; }
    if ((el = t.closest('[data-lock]'))) return openLocked(el.dataset.lock);
    if ((el = t.closest('[data-staff]'))) { closeSheet(); fromList = true; location.hash = '#/p/' + el.dataset.staff + '?staff'; return; }
    if ((el = t.closest('[data-back]'))) { if (fromList) history.back(); else location.hash = '#/'; fromList = false; return; }
    if ((el = t.closest('[data-filter]'))) { state.filter = el.dataset.filter; $$('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === el))); return drawCards(); }
    if ((el = t.closest('[data-level]'))) {
      reroll(current.p, +el.dataset.level);
      $$('[data-level]').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
      paint(current.p, true);
      return;
    }
    if ((el = t.closest('#floor .tbl'))) return openTable(+el.dataset.t);
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'q') { state.q = e.target.value; drawCards(); }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sheet.classList.contains('on')) closeSheet();
  });

  window.addEventListener('hashchange', route);
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => setTimeout(fit, 250));

  /* ---------- live loop ---------- */

  function loop() {
    tick();
    if (current.type === 'place') {
      paint(current.p, true);
      if (sheetCtx) {
        const t = sheetCtx.p.tables[sheetCtx.ti];
        const panel = $('.panel', sheet);
        const y = panel.scrollTop;
        panel.innerHTML = tableSheetHTML(sheetCtx.p, t);
        panel.scrollTop = y;
      }
    } else {
      VS.updateCards(document);
    }
    VS.updateCards($('#tutorial'));
  }
  let timer = null;
  const start = () => { if (!timer) timer = setInterval(loop, 2600); };
  const stop = () => { clearInterval(timer); timer = null; };
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  /* ---------- boot ---------- */

  VS.PLACES.forEach(seed);
  route();
  start();
  if (!VS.tutorial.seen()) VS.tutorial.open();
})();
