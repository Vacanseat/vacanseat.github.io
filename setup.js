(function () {
  'use strict';
  const VS = window.VS;
  const KEY = 'vs_custom_v1';
  const FH = 14;      // builder floor depth in seat widths
  const MAX_TABLES = 40;
  const $ = (s, r) => (r || document).querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  VS.PRESETS = [
    { id: 'bar', name: 'Bar', pre: 'BAR', r: 1, c: 6, sd: 'n' },
    { id: 'two', name: 'Two-top', pre: 'T', r: 1, c: 1, sd: 'ns' },
    { id: 'four', name: 'Four-top', pre: 'T', r: 1, c: 1, sd: 'nsew' },
    { id: 'six', name: 'Six-top', pre: 'T', r: 1, c: 2, sd: 'nsew' },
    { id: 'conf', name: 'Conference', pre: 'C', r: 1, c: 8, sd: 'nsew' },
    { id: 'desk', name: 'Study desk', pre: 'D', r: 1, c: 1, sd: 'n' },
    { id: 'lounge', name: 'Lounge chair', pre: 'L', r: 0, c: 1, sd: 'n' }
  ];
  const preset = (id) => VS.PRESETS.find((p) => p.id === id);

  const S = { name: 'My cafe', mode: 'public', t: [], sel: -1, preset: 'four', shape: null, clearArmed: false };
  S.shape = { r: 1, c: 1, sd: 'nsew' };

  /* ---------- saved floor ---------- */

  const clean = (d) => {
    if (!d || typeof d.n !== 'string' || typeof d.sd !== 'string') return null;
    const r = clamp(Math.round(+d.r), 0, 4), c = clamp(Math.round(+d.c), 1, 10);
    const sd = ['n', 'e', 's', 'w'].filter((x) => d.sd.indexOf(x) > -1).join('');
    if (!sd) return null;
    const t = { n: d.n.slice(0, 8), x: Math.round(+d.x), y: Math.round(+d.y), r, c, sd };
    const f = VS.foot(t);
    if (!(t.x >= 0 && t.y >= 0 && t.x + f.w <= VS.COLS && t.y + f.h <= FH)) return null;
    return t;
  };

  const saved = VS.store.get(KEY);
  if (saved && Array.isArray(saved.t)) {
    S.name = typeof saved.name === 'string' && saved.name ? saved.name.slice(0, 40) : S.name;
    S.mode = saved.mode === 'private' ? 'private' : 'public';
    S.t = saved.t.map(clean).filter(Boolean).slice(0, MAX_TABLES);
  }

  const save = () => VS.store.set(KEY, { name: S.name, mode: S.mode, t: S.t });

  // Puts the saved floor into the list of places so it behaves like any other place.
  function publish() {
    const i = VS.PLACES.findIndex((p) => p.id === 'custom');
    if (i > -1) VS.PLACES.splice(i, 1);
    if (!S.t.length) return null;
    const p = { id: 'custom', name: S.name.trim() || 'My place', kind: 'Your floor', mode: S.mode, hours: 'Built on this phone', busy: 0.55, t: S.t.map((d) => Object.assign({}, d)) };
    VS.seedPlace(p);
    VS.PLACES.unshift(p);
    return p;
  }

  /* ---------- drawing ---------- */

  const allOpen = (t) => VS.slots(t).map(() => ({ lb: 0, st: 'o', over: 0, under: 0 }));

  function drawPresets() {
    $('#s-presets').innerHTML = VS.PRESETS.map((p) =>
      `<button data-preset="${p.id}" aria-pressed="${S.preset === p.id}">${VS.esc(p.name)}<small>${VS.chairsText(VS.chairs(p))}</small></button>`).join('');
  }

  function drawShape() {
    const sh = S.shape, lounge = sh.r === 0;
    const step = (key, label, val, min, max, off) => `<div class="stepper"><button data-step="${key}" data-d="-1" aria-label="Less ${label}"${off || val <= min ? ' disabled' : ''}>${VS.I.minus}</button>
      <div><small>${label}</small><strong>${off ? '-' : val}</strong></div>
      <button data-step="${key}" data-d="1" aria-label="More ${label}"${off || val >= max ? ' disabled' : ''}>${VS.I.plus}</button></div>`;
    $('#s-steps').innerHTML = step('c', 'Length', sh.c, 1, lounge ? 4 : 10, false) + step('r', 'Width', sh.r, 1, 4, lounge);
    const k = VS.sides(sh);
    $('#s-sides').innerHTML = [['n', 'North'], ['e', 'East'], ['s', 'South'], ['w', 'West']].map(([key, name]) =>
      `<button data-side="${key}" aria-pressed="${k[key]}" aria-label="Chairs on the ${name.toLowerCase()} side"${lounge && (key === 'e' || key === 'w') ? ' disabled' : ''}>${key.toUpperCase()}</button>`).join('');
    const t = { n: nextName(), r: sh.r, c: sh.c, sd: sh.sd };
    const f = VS.foot(t);
    $('#s-preview').innerHTML = `<div class="tb" style="${VS.tbStyle(t)}">${VS.tbHTML(t, allOpen(t))}</div>
      <p>${VS.chairsText(VS.chairs(t))}, ${f.w} by ${f.h} squares on the grid</p>`;
  }

  function drawFloor() {
    const fl = $('#s-floor');
    fl.innerHTML = (S.t.length ? '' : '<p class="floor-empty">Your floor is empty. Tap here to place the table you picked.</p>') +
      S.t.map((t, i) => VS.tableBtn(t, i, allOpen(t), 'button', i === S.sel ? 'sel' : '')).join('');
    VS.fitFloor(fl, FH);
  }

  function drawSel() {
    const el = $('#s-sel');
    const t = S.t[S.sel];
    el.innerHTML = t ? `<div class="btnrow"><button class="btn ghost" data-sremove>Remove ${VS.esc(t.n)}</button><button class="btn ghost" data-sdone>Done</button></div>` : '';
  }

  const say = (msg) => { $('#s-status').textContent = msg || ''; };

  function drawMode() {
    $('#s-mode').innerHTML = ['public', 'private'].map((m) => `<button data-mode="${m}" aria-pressed="${S.mode === m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('');
  }

  function render(view) {
    view.innerHTML = `
      <header class="bar">
        <button class="iconbtn" data-back aria-label="Back to places">${VS.I.back}</button>
        <div class="bar-title"><h1>Set up your floor</h1><p>Saved on this phone</p></div>
        <button class="iconbtn" data-biz aria-label="How setup works">${VS.I.help}</button>
      </header>
      <div class="wrap">
        <label class="field"><span>Place name</span><input id="s-name" maxlength="40" autocomplete="off" value="${VS.esc(S.name)}"></label>
        <div class="seg" id="s-mode" role="group" aria-label="Who can see this floor"></div>
        <section class="sect"><h2>Choose a table</h2><p>Pick the closest type, then adjust the size and which sides have chairs.</p>
          <div class="presets" id="s-presets"></div>
          <div class="steppers" id="s-steps"></div>
          <div class="chips" id="s-sides" role="group" aria-label="Sides with chairs"></div>
          <div class="preview" id="s-preview"></div>
        </section>
        <section class="sect"><h2>Place it</h2><p>Tap the grid where the table goes. Tap a table to select or remove it.</p>
          <div class="floor build" id="s-floor"></div>
          <div class="status" id="s-status" role="status" aria-live="polite"></div>
          <div id="s-sel"></div>
          <div class="btnrow"><button class="btn ghost" data-sclear>Clear floor</button><button class="btn" data-slive>See it live</button></div>
        </section>
      </div>`;
    drawMode(); drawPresets(); drawShape(); drawFloor(); drawSel();
  }

  /* ---------- actions ---------- */

  function nextName() {
    const pre = (preset(S.preset) || preset('four')).pre;
    const re = new RegExp('^' + pre + '(\\d+)$');
    const top = S.t.reduce((m, t) => { const x = re.exec(t.n); return x ? Math.max(m, +x[1]) : m; }, 0);
    return pre + (top + 1);
  }

  function overlaps(a, fa, b) {
    const fb = VS.foot(b);
    return a.x < b.x + fb.w && b.x < a.x + fa.w && a.y < b.y + fb.h && b.y < a.y + fa.h;
  }

  function place(cx, cy) {
    if (S.t.length >= MAX_TABLES) return say('That is the most tables this demo holds.');
    const sh = S.shape, t = { n: nextName(), x: 0, y: 0, r: sh.r, c: sh.c, sd: sh.sd };
    const f = VS.foot(t);
    t.x = clamp(cx - Math.floor(f.w / 2), 0, VS.COLS - f.w);
    t.y = clamp(cy - Math.floor(f.h / 2), 0, FH - f.h);
    if (S.t.some((o) => overlaps(t, f, o))) return say('A table is already there. Tap a clear spot.');
    S.t.push(t);
    S.sel = -1;
    save(); publish();
    drawFloor(); drawSel(); drawShape();
    say(`Placed ${t.n} with ${VS.chairsText(VS.chairs(t))}. ${S.t.length} table${S.t.length > 1 ? 's' : ''} on the floor.`);
  }

  function setPreset(id) {
    const p = preset(id);
    if (!p) return;
    S.preset = id;
    S.shape = { r: p.r, c: p.c, sd: p.sd };
    drawPresets(); drawShape();
  }

  function nudge(key, d) {
    const sh = S.shape, lounge = sh.r === 0;
    if (key === 'c') sh.c = clamp(sh.c + d, 1, lounge ? 4 : 10);
    else if (!lounge) sh.r = clamp(sh.r + d, 1, 4);
    drawShape();
  }

  function toggleSide(key) {
    const sh = S.shape, has = sh.sd.indexOf(key) > -1;
    if (has && sh.sd.length === 1) return say('A table needs chairs on at least one side.');
    sh.sd = ['n', 'e', 's', 'w'].filter((x) => (x === key ? !has : sh.sd.indexOf(x) > -1)).join('');
    drawShape();
  }

  let clearTimer = null;
  function clearFloor(btn) {
    if (!S.clearArmed) {
      S.clearArmed = true;
      btn.textContent = 'Tap again to clear';
      clearTimer = setTimeout(() => { S.clearArmed = false; btn.textContent = 'Clear floor'; }, 3000);
      return;
    }
    clearTimeout(clearTimer);
    S.clearArmed = false;
    S.t = []; S.sel = -1;
    btn.textContent = 'Clear floor';
    save(); publish();
    drawFloor(); drawSel(); drawShape();
    say('Floor cleared.');
  }

  function goLive() {
    if (!S.t.length) return say('Place at least one table first.');
    save();
    publish();
    location.hash = S.mode === 'public' ? '#/p/custom' : '#/p/custom?staff';
  }

  /* ---------- events (only while the builder is on screen) ---------- */

  document.addEventListener('click', (e) => {
    if (VS.cur !== 'setup') return;
    const t = e.target;
    let el;
    if ((el = t.closest('[data-preset]'))) return setPreset(el.dataset.preset);
    if ((el = t.closest('[data-step]'))) return nudge(el.dataset.step, +el.dataset.d);
    if ((el = t.closest('[data-side]'))) return toggleSide(el.dataset.side);
    if ((el = t.closest('[data-mode]'))) { S.mode = el.dataset.mode; save(); publish(); return drawMode(); }
    if (t.closest('[data-sremove]')) { S.t.splice(S.sel, 1); S.sel = -1; save(); publish(); drawFloor(); drawSel(); drawShape(); return say('Table removed.'); }
    if (t.closest('[data-sdone]')) { S.sel = -1; drawFloor(); drawSel(); return; }
    if ((el = t.closest('[data-sclear]'))) return clearFloor(el);
    if (t.closest('[data-slive]')) return goLive();
    const fl = $('#s-floor');
    if (fl && fl.contains(t)) {
      const tb = t.closest('.tbl');
      if (tb) { const i = +tb.dataset.t; S.sel = S.sel === i ? -1 : i; drawFloor(); drawSel(); return say(S.sel > -1 ? `Selected ${S.t[i].n}.` : ''); }
      const r = fl.getBoundingClientRect(), pitch = fl.clientWidth / (VS.COLS + 2 * VS.PAD);
      place(Math.floor((e.clientX - r.left - fl.clientLeft) / pitch - VS.PAD), Math.floor((e.clientY - r.top - fl.clientTop) / pitch - VS.PAD));
    }
  });

  document.addEventListener('input', (e) => {
    if (VS.cur !== 'setup' || e.target.id !== 's-name') return;
    S.name = e.target.value;
    save(); publish();
  });

  VS.setup = { render, publish, fit: () => VS.fitFloor($('#s-floor'), FH) };
})();
