(function () {
  'use strict';
  const VS = window.VS;
  const KEY = 'vs_tutorial_done_v1';
  const root = document.getElementById('tutorial');
  let step = 0;
  let kind = 'user';
  let cleanup = null;

  const seen = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
  const mark = () => { try { localStorage.setItem(KEY, '1'); } catch (e) { /* private mode, fine */ } };
  const place = (id) => VS.PLACES.find((p) => p.id === id);
  const mk = (person) => ({ lb: person ? 120 : 0, st: person ? 't' : 'o', over: 0, under: 0 });
  const openCount = (seats) => seats.filter((s) => s && !VS.isOcc(s)).length;

  /* ---------- demos for people looking for a seat ---------- */

  function demoSeat(el) {
    const T = VS.THRESHOLD, FAST = 10, MAX = 200;
    const s = { lb: 0, st: 'o', over: 0, under: VS.FREE_SECS };
    el.innerHTML = `<div class="demo seatdemo">
      <div class="sd-top">
        <span class="seat open" id="d-seat" aria-hidden="true"></span>
        <div class="sd-read" aria-live="polite"><div><b id="d-num">0</b> lb</div><div class="state open" id="d-state">Open</div></div>
      </div>
      <div class="gauge" id="d-gauge" role="img" aria-label="Weight on the seat compared to the ${T} pound line"><i id="d-fill" style="width:0"></i><u style="left:${(T / MAX) * 100}%"><span>${T} lb line</span></u></div>
      <div class="btnrow">
        <button class="btn ghost" data-lb="30">Backpack</button>
        <button class="btn ghost" data-lb="120">Sit down</button>
        <button class="btn ghost" data-lb="0">Stand up</button>
      </div>
      <p class="timer" id="d-timer" aria-live="polite"></p>
      <p class="why" id="d-why" aria-live="polite">Tap a button to put something on the seat. This demo runs ${FAST} times faster than real life.</p>
    </div>`;
    const q = (id) => el.querySelector(id);
    const why = {
      30: `30 lb is under the ${T} lb line, so the seat stays open. A loaded backpack can't claim a seat.`,
      120: `120 lb is over the line. After ${VS.TAKE_SECS} seconds it reads taken, so a quick lean doesn't count.`,
      0: `Nothing on the seat. It reads open after ${VS.FREE_SECS} seconds empty, so shifting around or a short break doesn't flip it.`
    };
    let last = '';
    const paint = () => {
      const occ = VS.isOcc(s);
      const seat = q('#d-seat');
      const cls = 'seat ' + VS.seatCls(s);
      if (seat.className.replace(' flip', '') !== cls) {
        seat.className = cls + ' flip';
      }
      q('#d-num').textContent = s.lb;
      const st = q('#d-state');
      st.textContent = occ ? 'Taken' : 'Open';
      st.className = 'state ' + (occ ? 'occ' : 'open');
      q('#d-fill').style.width = Math.min(s.lb / MAX, 1) * 100 + '%';
      q('#d-gauge').classList.toggle('over', s.lb >= T);
      let msg = '';
      if (!occ && s.lb >= T) msg = `Over the line for ${Math.floor(s.over)} of ${VS.TAKE_SECS} seconds`;
      else if (occ && s.lb < T) msg = `Under the line for ${Math.floor(s.under)} of ${VS.FREE_SECS} seconds`;
      if (msg !== last) { q('#d-timer').textContent = msg; last = msg; }
    };
    const timer = setInterval(() => { VS.stepSeat(s, 0.1 * FAST); paint(); }, 100);
    el.querySelector('.btnrow').addEventListener('click', (e) => {
      const b = e.target.closest('[data-lb]');
      if (!b) return;
      s.lb = +b.dataset.lb;
      s.over = 0; s.under = 0;
      q('#d-why').textContent = why[s.lb] || '';
      paint();
    });
    return () => clearInterval(timer);
  }

  function demoGroups(el) {
    const defs = [
      { t: { n: '1x1', r: 1, c: 1, sd: 'nsew' }, note: 'Cafe table' },
      { t: { n: '2x2', r: 2, c: 2, sd: 'nsew' }, note: 'Square table' },
      { t: { n: '1x8', r: 1, c: 8, sd: 'nsew' }, note: 'Conference table' },
      { t: { n: '1x6', r: 1, c: 6, sd: 'n' }, note: 'Bar, chairs on one side' }
    ];
    defs.forEach((d) => { d.seats = VS.slots(d.t).map((_, i) => mk(i % 3 === 1)); });
    el.innerHTML = `<div class="demo mini">${defs.map((d, i) => `<div class="mt" data-k="${i}">
      <div class="mt-h"><b>${d.t.n}</b><span>${d.note}, ${d.seats.length} chairs</span><span data-c style="margin-left:auto"></span></div>
      <div class="tb" style="${VS.tbStyle(d.t)}"></div></div>`).join('')}
      <p class="hint">Tap a chair to flip it. The hub in the middle of each table adds them up.</p></div>`;
    const draw = (k, flip) => {
      const d = defs[k], box = el.querySelector(`[data-k="${k}"] .tb`);
      box.innerHTML = VS.tbHTML(d.t, d.seats);
      el.querySelector(`[data-k="${k}"] [data-c]`).textContent = openCount(d.seats) + ' of ' + d.seats.length + ' open';
      if (flip !== undefined) { const s = box.querySelector(`[data-s="${flip}"]`); if (s) s.classList.add('flip'); }
    };
    defs.forEach((_, k) => draw(k));
    el.addEventListener('click', (e) => {
      const s = e.target.closest('.seat');
      if (!s) return;
      const k = +s.closest('.mt').dataset.k, i = +s.dataset.s, seat = defs[k].seats[i];
      defs[k].seats[i] = mk(!VS.isOcc(seat));
      draw(k, i);
    });
  }

  function demoMove(el) {
    // A 1x2 table with chairs on all four sides has six slots: north 2, east 1, south 2, west 1.
    const spec = { r: 1, c: 2, sd: 'nsew' };
    const A = [mk(1), mk(0), mk(0), mk(1), mk(0), mk(0)];
    const B = [null, null, null, mk(0), mk(1), null];
    let moved = false;
    const box = (n, seats) => {
      const t = Object.assign({ n }, spec);
      const have = seats.filter(Boolean).length;
      return `<div class="mt"><div class="mt-h"><b>Table ${n}</b><span>${have} chairs, ${openCount(seats)} open</span></div><div class="tb" data-box="${n}" style="${VS.tbStyle(t)}">${VS.tbHTML(t, seats)}</div></div>`;
    };
    const draw = () => {
      const a = A.map((s, i) => (moved && i === 0 ? null : s));
      const b = B.map((s, i) => (moved && i === 0 ? mk(0) : s));
      el.querySelector('.pair').innerHTML = box('A', a) + box('B', b);
      if (moved) el.querySelector('[data-box="B"] [data-s="0"]').classList.add('arrive');
      el.querySelector('[data-mv]').textContent = moved ? 'Slide it back' : 'Slide a chair from A to B';
    };
    el.innerHTML = `<div class="demo mini"><div class="pair"></div>
      <div class="btnrow"><button class="btn ghost" data-mv></button></div>
      <p class="hint">No chair IDs and no GPS. Each chair just joins the hub it hears loudest.</p></div>`;
    draw();
    el.querySelector('[data-mv]').addEventListener('click', () => { moved = !moved; draw(); });
  }

  function demoPublic(el) {
    el.innerHTML = `<div class="demo">${VS.cardHTML(place('clough-l2'), { static: true })}
      <div class="sticker">${VS.qr()}<div><b>Table B2</b><span>Sticker on the table. Scan it and the app opens right here.</span></div></div></div>`;
    VS.updateCards(el);
  }

  function demoPrivate(el) {
    el.innerHTML = `<div class="demo">${VS.cardHTML(place('starbucks'), { static: true })}${VS.cardHTML(place('chilis'), { static: true })}
      <p class="hint">Same sensors, different setting. The owner picks per location.</p></div>`;
    VS.updateCards(el);
  }

  function demoKey(el) {
    el.innerHTML = `<div class="demo key">
      <div><span class="seat open"></span>Emerald is open</div>
      <div><span class="seat occ"></span>Hatched amethyst is taken</div>
      <div><i class="hub"></i>Sapphire dot is the table's hub</div>
      <div style="color:var(--muted);font-size:14px">Everything in this demo is simulated. Seats change on their own, like a real room.</div>
    </div>`;
  }

  /* ---------- demos for businesses ---------- */

  function demoSticker(el) {
    const t = { n: 'B2', r: 2, c: 4, sd: 'nsew' };
    const seats = VS.slots(t).map(() => mk(0));
    el.innerHTML = `<div class="demo mini"><div class="tb" style="${VS.tbStyle(t)}">${VS.tbHTML(t, seats)}</div>
      <div class="sticker">${VS.qr()}<div><b>Table B2</b><span>2x4, ${VS.sidesText(t)}, ${VS.chairs(t)} chairs</span></div></div>
      <p class="hint">Scan it once and the table lands on your floor plan with the right size and chairs.</p></div>`;
  }

  function demoAccess(el) {
    el.innerHTML = `<div class="demo"><div class="seg" role="group" aria-label="Who can see this floor">
        <button data-acc="public" aria-pressed="true">Public</button><button data-acc="private" aria-pressed="false">Private</button></div>
      <div data-view></div><p class="hint" data-hint></p></div>`;
    const draw = (m) => {
      const p = place(m === 'public' ? 'starbucks' : 'chilis');
      el.querySelector('[data-view]').innerHTML = VS.cardHTML(p, { static: true });
      VS.updateCards(el);
      el.querySelector('[data-hint]').textContent = m === 'public'
        ? 'Anyone with the link sees live seats. Good for libraries and cafes.'
        : 'Visitors see a locked card. Staff get the floor so they can seat guests faster.';
      el.querySelectorAll('[data-acc]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.acc === m)));
    };
    draw('public');
    el.querySelector('.seg').addEventListener('click', (e) => { const b = e.target.closest('[data-acc]'); if (b) draw(b.dataset.acc); });
  }

  function demoBuild(el) {
    el.innerHTML = `<div class="demo"><div class="list">${VS.PRESETS.map((p) => `<div><b>${VS.esc(p.name)}</b><span>${VS.chairsText(VS.chairs(p))}</span></div>`).join('')}</div>
      <p class="hint">Change the size and which sides have chairs, then tap the grid to place it. Your floor saves on this phone.</p></div>`;
  }

  /* ---------- steps ---------- */

  const userSteps = [
    { title: 'Every seat reports on its own', body: 'A thin pressure pad sits under the seat plate, where the seat bolts to the frame, so it works on cushion, wood or metal. It only measures weight. No camera, no names, no GPS.', demo: demoSeat },
    { title: 'Tables are counted in seats', body: 'A 1x8 is one seat wide and eight long, with chairs down both long sides and on both ends: 18 in all. A bar has chairs on one side only.', demo: demoGroups },
    { title: 'Move a chair and the count follows', body: 'Staff rearrange a room and nobody scans or types anything. A table\'s chair count is whatever is actually sitting near its hub.', demo: demoMove },
    { title: 'Public: anyone can look', body: 'Colleges and cafes can open their seating to everyone. A sticker on each table links to that spot, so a student can check a library floor before walking over.', demo: demoPublic },
    { title: 'Private: staff only', body: 'The business picks public or private when it buys the furniture. A host sees open tables to seat guests faster. Everyone else sees a locked card.', demo: demoPrivate },
    { title: 'Now find a seat', body: 'Open the app and try it. Pick a place, tap a table, and watch the seats change.', demo: demoKey, last: 'Find a seat' }
  ];

  const bizSteps = [
    { title: 'Every table has a sticker', body: 'The manufacturer prints the table\'s name, size and chair sides on its sticker, so you never type measurements.', demo: demoSticker },
    { title: 'You choose who sees it', body: 'Open it to everyone or keep it for staff. You can set this per location.', demo: demoAccess },
    { title: 'Build your floor', body: 'Pick a table type, adjust it, and place it on a grid that matches your room.', demo: demoBuild, last: 'Open the builder' }
  ];

  /* ---------- shell ---------- */

  const steps = () => (kind === 'provider' ? bizSteps : userSteps);

  function render() {
    if (cleanup) { cleanup(); cleanup = null; }
    const all = steps(), s = all[step], last = step === all.length - 1;
    root.innerHTML = `
      <div class="tut-top"><div class="dots" aria-hidden="true">${all.map((_, i) => `<i class="${i < step ? 'on' : i === step ? 'cur' : ''}"></i>`).join('')}</div><button class="skip" data-skip>Skip</button></div>
      <div class="tut-body" id="tut-body"><h2 id="tut-title">${VS.esc(s.title)}</h2><p>${VS.esc(s.body)}</p><div id="tut-demo"></div></div>
      <div class="tut-foot">${step ? '<button class="btn ghost" data-back>Back</button>' : ''}<button class="btn" data-next>${last ? VS.esc(s.last) : 'Next'}</button></div>`;
    cleanup = s.demo(root.querySelector('#tut-demo')) || null;
    root.querySelector('#tut-body').scrollTop = 0;
  }

  function open(which) {
    kind = which === 'provider' ? 'provider' : 'user';
    step = 0;
    root.hidden = false;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'tut-title');
    document.body.classList.add('lock');
    render();
  }

  function close() {
    if (cleanup) { cleanup(); cleanup = null; }
    if (kind === 'user') mark();
    root.hidden = true;
    root.innerHTML = '';
    document.body.classList.remove('lock');
  }

  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-skip]')) { const go = kind === 'provider'; close(); if (go) location.hash = '#/setup'; return; }
    if (e.target.closest('[data-back]')) { step = Math.max(0, step - 1); return render(); }
    if (e.target.closest('[data-next]')) {
      if (step >= steps().length - 1) { const go = kind === 'provider'; close(); if (go) location.hash = '#/setup'; return; }
      step++;
      render();
    }
  });

  VS.tutorial = { open, close, seen };
})();
