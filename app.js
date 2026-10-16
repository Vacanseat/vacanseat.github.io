(function () {
  'use strict';
  const VS = window.VS;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const view = $('#view');
  const sheet = $('#sheet');

  const state = { q: '', filter: 'all' };
  let current = { type: 'list' };
  let sheetCtx = null;
  let listScroll = 0;
  let fromList = false;

  const setCur = (c) => { current = c; VS.cur = c.type; };

  // Demo-only access control. The real product checks these on a server.
  const DEMO_VENUE_PIN = '1234';
  VS.unlocked = {};
  try { VS.admin = sessionStorage.getItem('vs_admin') === '1'; } catch (e) { VS.admin = false; }
  const getSaved = () => { const v = VS.store.get('vs_saved_v1'); return Array.isArray(v) ? v : []; };
  const isSaved = (id) => getSaved().indexOf(id) > -1;
  const toggleSaved = (id) => {
    const a = getSaved(), i = a.indexOf(id);
    if (i > -1) a.splice(i, 1); else a.push(id);
    VS.store.set('vs_saved_v1', a);
    return i === -1;
  };
  const pinOf = (p) => p.pin || DEMO_VENUE_PIN;

  /* ---------- list ---------- */

  function renderList() {
    view.innerHTML = `
      <header class="bar"><div class="brand">${VS.I.logo}<span>Vacanseat</span></div><button class="iconbtn" data-help aria-label="How it works">${VS.I.help}</button></header>
      <div class="wrap">
        <h1 class="title">Find a seat</h1>
        <label class="search"><span class="sr">Search places</span>${VS.I.search}<input id="q" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Search places" value="${VS.esc(state.q)}"></label>
        <div class="seg" role="group" aria-label="Show places">
          ${['all', 'saved', 'public', 'private'].map((f) => `<button data-filter="${f}" aria-pressed="${state.filter === f}">${f[0].toUpperCase() + f.slice(1)}</button>`).join('')}
        </div>
        <div id="cards"></div>
        <div class="biz"><h3>Run a library, cafe or restaurant?</h3><p>Venue staff set up and publish the floor. Visitors can only look. Sign in with the demo PIN to try it.</p><button class="btn block" data-biz>Set up your floor</button></div>
        <p class="foot">Demo data. Sensor readings are simulated for this class project.</p>
      </div>`;
    drawCards();
    window.scrollTo(0, listScroll);
  }

  function drawCards() {
    const q = state.q.trim().toLowerCase();
    const saved = getSaved();
    const items = VS.PLACES.filter((p) => (state.filter === 'all' || (state.filter === 'saved' ? saved.indexOf(p.id) > -1 : p.mode === state.filter)) && (!q || (p.name + ' ' + p.kind).toLowerCase().includes(q)));
    const rank = (p) => (p.id === 'custom' ? 0 : p.mode === 'public' ? 1 : 2);
    items.sort((a, b) => rank(a) - rank(b) || (a.mode === 'public' ? VS.counts(b).open - VS.counts(a).open : a.name.localeCompare(b.name)));
    $('#cards').innerHTML = items.length
      ? items.map((p) => VS.cardHTML(p)).join('')
      : state.filter === 'saved' && !q
        ? '<p class="sub" style="padding:18px 4px">Nothing saved yet. Open a place and tap Save to My locations.</p>'
        : '<p class="sub" style="padding:18px 4px">No places match. If a venue uses Vacanseat, search its name or type. If it does not show up, it has not set up yet.</p>';
  }

  /* ---------- place ---------- */

  function bkLine(p) {
    const b = VS.boothCounts(p);
    return b.total ? `<p class="bksum" id="bk-sum">Booth benches: <b>${b.open}</b> open of ${b.total}</p>` : '';
  }

  function renderPlace(p, staff) {
    const c = VS.counts(p);
    view.innerHTML = `
      <header class="bar">
        <button class="iconbtn" data-back aria-label="Back">${VS.I.back}</button>
        <div class="bar-title"><h1>${VS.esc(p.name)}</h1><p>${VS.esc(p.kind)}, ${VS.esc(p.hours)}</p></div>
        <span class="tag ${staff ? 'staff' : 'pub'}">${staff ? 'Staff view' : 'Public'}</span>
      </header>
      <div class="wrap">
        ${staff ? '<div class="banner">Staff view. You unlocked this with the PIN. Visitors see a locked card.</div>' : ''}
        <div class="sum"><div class="o"><strong id="nOpen">${c.open}</strong>open</div><div class="t"><strong id="nTaken">${c.taken}</strong>taken</div><span class="live"><i></i>Live, simulated</span></div>
        ${bkLine(p)}
        <button class="btn ghost block savebtn" data-save="${p.id}" aria-pressed="${isSaved(p.id)}">${isSaved(p.id) ? 'Saved to My locations' : 'Save to My locations'}</button>
        <div class="details"><div><span>Hours</span><b>${VS.esc(p.hours)}</b></div><div><span>Setup</span><b>${p.tables.filter((t) => !t.bk).length} tables, ${c.total} chairs${p.tables.some((t) => t.bk) ? ', ' + p.tables.filter((t) => t.bk).length + ' booths' : ''}</b></div><div><span>Access</span><b>${p.mode === 'public' ? 'Public' : 'Private, PIN'}</b></div></div>
        <p class="managed">${/college/i.test(p.kind) ? 'Managed by college staff. Students can view the floor but cannot change it.' : 'Managed by the venue. Visitors can view the floor but cannot change it.'}</p>
        <div class="legend"><span><i class="seat open"></i>Open</span><span><i class="seat occ"></i>Taken</span><span><i class="hub"></i>Table puck</span>${p.tables.some((t) => t.bk) ? '<span><i class="bench open"></i>Booth bench</span>' : ''}</div>
        <div class="floor" id="floor">${p.tables.map((t, ti) => VS.tableBtn(t, ti, t.seats, 'button')).join('')}</div>
        <div class="lvl"><p>Demo controls. Change how busy the room is.</p>
          <div class="seg" role="group" aria-label="Room busyness">
            ${[['Quiet', 0.2], ['Steady', p.base], ['Packed', 0.93]].map(([n, v]) => `<button data-level="${v}" aria-pressed="${Math.abs(p.busy - v) < 0.01}">${n}</button>`).join('')}
          </div>
        </div>
        ${p.id === 'custom' && VS.admin ? '<div class="btnrow"><button class="btn ghost" data-edit>Edit floor</button></div>' : ''}
        <p class="foot">Demo data. Tap a table to see each chair's reading.</p>
      </div>`;
    fit();
    paint(p, false);
  }

  function fit() {
    if (current.type === 'place') VS.fitFloor($('#floor'), VS.heightOf(current.p.t));
    else if (current.type === 'setup') VS.setup.fit();
  }

  function tableCounts(t) {
    const open = t.seats.filter((s) => !VS.isOcc(s)).length;
    return { open, total: t.seats.length };
  }

  function paint(p, animate) {
    const c = VS.counts(p);
    const no = $('#nOpen'), nt = $('#nTaken');
    if (no) no.textContent = c.open;
    if (nt) nt.textContent = c.taken;
    const bk = $('#bk-sum');
    if (bk) bk.outerHTML = bkLine(p);
    $$('#floor .tbl').forEach((el) => {
      const t = p.tables[+el.dataset.t];
      if (t.bk) {
        $$('.bench', el).forEach((b) => { b.className = 'bench ' + VS.seatCls(t.seats[+b.dataset.s]); });
        el.setAttribute('aria-label', `Booth ${t.n}, ${t.seats.filter((x) => !VS.isOcc(x)).length} of ${t.seats.length} benches open`);
        return;
      }
      $$('.seat', el).forEach((el2) => {
        const s = t.seats[+el2.dataset.s];
        const occ = VS.isOcc(s);
        if (occ !== el2.classList.contains('occ')) {
          el2.classList.toggle('occ', occ);
          el2.classList.toggle('open', !occ);
          if (animate) { el2.classList.remove('flip'); void el2.offsetWidth; el2.classList.add('flip'); }
        }
        el2.classList.toggle('pending', VS.pending(s));
      });
      const tc = tableCounts(t);
      const em = $('[data-tc]', el);
      if (em) em.textContent = tc.open + ' open';
      el.setAttribute('aria-label', `Table ${t.n}, ${t.r}x${t.c}, ${tc.open} of ${tc.total} seats open`);
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
    const size = t.r === 0 ? VS.sidesText(t) : `${t.r}x${t.c}, ${VS.sidesText(t)}`;
    return `<div class="grab"></div>
      <div class="sh-head"><div><h2>Table ${VS.esc(t.n)}</h2><p class="sub">${size}, ${tc.total} chair${tc.total > 1 ? 's' : ''}</p></div><button class="iconbtn" data-close aria-label="Close">${VS.I.close}</button></div>
      <p class="sh-big"><strong>${tc.open}</strong>of ${tc.total} open</p>
      <div class="sgrid">${t.seats.map((s, i) => `<div class="cell"><span class="seat ${VS.seatCls(s)}"></span><small>${s.lb}<span class="sr"> pounds, chair ${i + 1}, ${VS.isOcc(s) ? 'taken' : 'open'}</span></small></div>`).join('')}</div>
      <p class="note">Numbers are pounds on each seat pad. ${p.line || VS.THRESHOLD} lb held for ${VS.TAKE_SECS} seconds counts as taken. It reads open again after ${VS.FREE_SECS} seconds under that. A faded chair is waiting out one of those timers. The puck under this table adds the chairs up. This venue sets the line at ${p.line || VS.THRESHOLD} lb${(p.line || VS.THRESHOLD) < 30 ? ', so a bag on a seat counts as taken' : ', so a bag on a seat does not count'}.</p>`;
  }

  function boothSheetHTML(p, t) {
    const open = t.seats.filter((x) => !VS.isOcc(x)).length;
    const names = ['North bench', 'South bench'];
    return `<div class="grab"></div>
      <div class="sh-head"><div><h2>Booth ${VS.esc(t.n)}</h2><p class="sub">Two benches, one long pad on each</p></div><button class="iconbtn" data-close aria-label="Close">${VS.I.close}</button></div>
      <p class="sh-big"><strong>${open}</strong>of ${t.seats.length} benches open</p>
      <div class="sgrid">${t.seats.map((s, i) => `<div class="cell"><span class="bench ${VS.seatCls(s)}" style="width:44px;height:24px"></span><small>${s.lb}<span class="sr"> pounds, ${names[i]}, ${VS.isOcc(s) ? 'taken' : 'open'}</span></small></div>`).join('')}</div>
      <p class="note">Fixed booths have no feet, so a long pad sits on each bench cushion. Numbers are pounds on the pad. ${p.line || VS.THRESHOLD} lb held for ${VS.TAKE_SECS} seconds counts as taken, and one pad covers the whole bench, so it cannot tell how many people sit there.</p>`;
  }

  const sheetHTML = (p, t) => (t.bk ? boothSheetHTML(p, t) : tableSheetHTML(p, t));

  function openTable(ti) {
    const p = current.p, t = p.tables[ti];
    sheetCtx = { p, ti };
    showSheet(sheetHTML(p, t));
  }

  function openLocked(id) {
    const p = VS.PLACES.find((x) => x.id === id);
    showSheet(`<div class="grab"></div>
      <div class="lockicon">${VS.I.lock(28)}</div>
      <h2>${VS.esc(p.name)} is private</h2>
      <p class="note" style="font-size:16px;margin-top:10px">The venue keeps this floor for staff. Staff enter their PIN to see open tables. Everyone else sees this locked card.</p>
      <label class="field" style="margin-top:16px"><span>Staff PIN</span><input id="pin-in" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="4 digits"></label>
      <p class="err" id="pin-err" role="alert"></p>
      <p class="note" style="margin-top:0">Demo PIN: ${pinOf(p) === DEMO_VENUE_PIN ? DEMO_VENUE_PIN : 'the PIN you set in the builder'}. In the real product the server checks it.</p>
      <div class="btnrow"><button class="btn ghost" data-close>Close</button><button class="btn" data-staff="${p.id}">Unlock</button></div>`);
  }

  /* ---------- venue sign-in ---------- */

  function renderGate() {
    view.innerHTML = `
      <header class="bar"><button class="iconbtn" data-home aria-label="Back to places">${VS.I.back}</button><div class="bar-title"><h1>Venue sign-in</h1><p>For staff who run a floor</p></div></header>
      <div class="wrap">
        <div class="lockicon">${VS.I.lock(28)}</div>
        <p class="note" style="font-size:16px;margin-top:0">Only venue staff can set up or change a floor. Colleges work the same way: staff edit, students only view.</p>
        <label class="field" style="margin-top:18px"><span>Venue PIN</span><input id="gate-pin" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="4 digits"></label>
        <p class="err" id="gate-err" role="alert"></p>
        <p class="note" style="margin-top:0">Demo PIN: ${DEMO_VENUE_PIN}. In the real product the PIN is checked on Vacanseat's server and published floors reach every device. This demo checks it on the phone.</p>
        <div class="btnrow"><button class="btn" data-gate-go>Sign in</button></div>
      </div>`;
  }

  function gateGo() {
    const v = ($('#gate-pin') || {}).value;
    if (v !== DEMO_VENUE_PIN) { $('#gate-err').textContent = 'That PIN is not right. Try ' + DEMO_VENUE_PIN + ' for the demo.'; return; }
    VS.admin = true;
    try { sessionStorage.setItem('vs_admin', '1'); } catch (e) { /* fine */ }
    route();
  }

  function staffGo(id) {
    const p = VS.PLACES.find((x) => x.id === id);
    const v = ($('#pin-in') || {}).value;
    if (!p || v !== pinOf(p)) { const er = $('#pin-err'); if (er) er.textContent = 'That PIN is not right.'; return; }
    VS.unlocked[id] = true;
    closeSheet();
    fromList = true;
    location.hash = '#/p/' + id + '?staff';
  }

  /* ---------- routing ---------- */

  function route() {
    const hash = location.hash || '#/';
    closeSheet();
    if (current.type === 'list') listScroll = window.scrollY;
    if (hash === '#/setup' && !VS.admin) {
      setCur({ type: 'gate' });
      renderGate();
      window.scrollTo(0, 0);
      return;
    }
    if (hash === '#/setup') {
      setCur({ type: 'setup' });
      VS.setup.render(view);
      VS.setup.fit();
      window.scrollTo(0, 0);
      return;
    }
    const m = hash.match(/^#\/p\/([\w-]+)(\?staff)?$/);
    if (m) {
      const p = VS.PLACES.find((x) => x.id === m[1]);
      if (p && (p.mode === 'public' || (m[2] && VS.unlocked[p.id]))) {
        setCur({ type: 'place', p, staff: p.mode === 'private' });
        renderPlace(p, p.mode === 'private');
        window.scrollTo(0, 0);
        return;
      }
      if (p && p.mode === 'private') {
        setCur({ type: 'list' });
        renderList();
        openLocked(p.id);
        return;
      }
    }
    setCur({ type: 'list' });
    renderList();
  }

  /* ---------- events ---------- */

  document.addEventListener('click', (e) => {
    const t = e.target;
    let el;
    if ((el = t.closest('[data-close]'))) return closeSheet();
    if ((el = t.closest('[data-help]'))) return VS.tutorial.open('user');
    if ((el = t.closest('[data-biz]'))) { fromList = true; return VS.tutorial.open('provider'); }
    if ((el = t.closest('[data-edit]'))) { fromList = false; location.hash = '#/setup'; return; }
    if ((el = t.closest('[data-go]'))) { fromList = true; location.hash = '#/p/' + el.dataset.go; return; }
    if ((el = t.closest('[data-lock]'))) return openLocked(el.dataset.lock);
    if ((el = t.closest('[data-staff]'))) return staffGo(el.dataset.staff);
    if (t.closest('[data-gate-go]')) return gateGo();
    if (t.closest('[data-home]')) { location.hash = '#/'; return; }
    if ((el = t.closest('[data-save]'))) {
      const on = toggleSaved(el.dataset.save);
      el.setAttribute('aria-pressed', String(on));
      el.textContent = on ? 'Saved to My locations' : 'Save to My locations';
      return;
    }
    if ((el = t.closest('[data-back]'))) { if (fromList) history.back(); else location.hash = '#/'; fromList = false; return; }
    if ((el = t.closest('[data-filter]'))) { state.filter = el.dataset.filter; $$('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === el))); return drawCards(); }
    if ((el = t.closest('[data-level]'))) {
      VS.rerollPlace(current.p, +el.dataset.level);
      $$('[data-level]').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
      paint(current.p, true);
      return;
    }
    if (current.type === 'place' && (el = t.closest('#floor .tbl'))) return openTable(+el.dataset.t);
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'q') { state.q = e.target.value; drawCards(); }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sheet.classList.contains('on')) closeSheet();
    if (e.key === 'Enter') {
      if (e.target.id === 'gate-pin') gateGo();
      else if (e.target.id === 'pin-in' && sheetCtx === null) { const b = $('[data-staff]', sheet); if (b) staffGo(b.dataset.staff); }
    }
  });

  window.addEventListener('hashchange', route);
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => setTimeout(fit, 250));

  /* ---------- live loop ---------- */

  function loop() {
    VS.tickPlaces(VS.PLACES);
    if (current.type === 'place') {
      paint(current.p, true);
      if (sheetCtx) {
        const t = sheetCtx.p.tables[sheetCtx.ti];
        const panel = $('.panel', sheet);
        const y = panel.scrollTop;
        panel.innerHTML = sheetHTML(sheetCtx.p, t);
        panel.scrollTop = y;
      }
    } else if (current.type === 'list') {
      VS.updateCards(document);
    }
    VS.updateCards($('#tutorial'));
  }
  let timer = null;
  const start = () => { if (!timer) timer = setInterval(loop, VS.TICK_SECS * 1000); };
  const stop = () => { clearInterval(timer); timer = null; };
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  /* ---------- boot ---------- */

  VS.PLACES.forEach(VS.seedPlace);
  VS.setup.publish();
  route();
  start();
  if (!VS.tutorial.seen()) VS.tutorial.open('user');
})();
