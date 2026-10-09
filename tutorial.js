(function () {
  'use strict';
  const VS = window.VS;
  const KEY = 'vs_tutorial_done_v1';
  const root = document.getElementById('tutorial');
  let step = 0;

  const seen = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
  const mark = () => { try { localStorage.setItem(KEY, '1'); } catch (e) { /* private mode, fine */ } };
  const place = (id) => VS.PLACES.find((p) => p.id === id);

  /* ---------- demos ---------- */

  function demoSeat(el) {
    const T = VS.THRESHOLD;
    el.innerHTML = `<div class="demo seatdemo">
      <div class="sd-top">
        <span class="seat open" id="d-seat" aria-hidden="true"></span>
        <div class="sd-read" aria-live="polite"><div><b id="d-num">0</b> lb</div><div class="state open" id="d-state">Open</div></div>
      </div>
      <div class="gauge" id="d-gauge" role="img" aria-label="Weight on the seat compared to the ${T} pound line"><i id="d-fill" style="width:0"></i><u style="left:${(T / 250) * 100}%"><span>${T} lb line</span></u></div>
      <div class="btnrow">
        <button class="btn ghost" data-lb="35">Backpack</button>
        <button class="btn ghost" data-lb="140">Sit down</button>
        <button class="btn ghost" data-lb="0">Stand up</button>
      </div>
      <p class="why" id="d-why" aria-live="polite">Tap a button to put something on the seat.</p>
    </div>`;
    const why = {
      35: '35 lb is under the line, so the seat stays open. A backpack can\'t claim a seat.',
      140: '140 lb is over the line, so the seat reads taken. It only knows weight, not who is sitting.',
      0: 'Nothing on the seat. Open again.'
    };
    el.querySelector('.btnrow').addEventListener('click', (e) => {
      const b = e.target.closest('[data-lb]');
      if (!b) return;
      const lb = +b.dataset.lb, occ = VS.isOcc(lb);
      const seat = el.querySelector('#d-seat');
      seat.className = 'seat ' + (occ ? 'occ' : 'open');
      void seat.offsetWidth;
      seat.classList.add('flip');
      el.querySelector('#d-num').textContent = lb;
      const st = el.querySelector('#d-state');
      st.textContent = occ ? 'Taken' : 'Open';
      st.className = 'state ' + (occ ? 'occ' : 'open');
      el.querySelector('#d-fill').style.width = Math.min(lb / 250, 1) * 100 + '%';
      el.querySelector('#d-gauge').classList.toggle('over', occ);
      el.querySelector('#d-why').textContent = why[lb] || '';
    });
  }

  function demoGroups(el) {
    const defs = [
      { label: '1x1', rows: 1, cols: 1, seats: [0], note: 'one seat' },
      { label: '2x2', rows: 2, cols: 2, seats: [140, 0, 0, 150], note: 'a square table' },
      { label: '1x8', rows: 1, cols: 8, seats: [0, 130, 0, 0, 160, 0, 120, 0], note: 'a conference table' }
    ];
    el.innerHTML = `<div class="demo mini">${defs.map((d, i) => `<div class="mt" data-k="${i}"><div class="mt-h"><b>${d.label}</b><span>${d.note}</span><span data-c style="margin-left:auto"></span></div>${VS.plate(d.rows, d.cols, d.seats)}</div>`).join('')}<p class="hint">Tap a seat to flip it. The hub under each table adds them up.</p></div>`;
    const count = (k) => {
      const d = defs[k], open = d.seats.filter((lb) => !VS.isOcc(lb)).length;
      el.querySelector(`[data-k="${k}"] [data-c]`).textContent = open + ' of ' + d.seats.length + ' open';
    };
    defs.forEach((_, k) => count(k));
    el.addEventListener('click', (e) => {
      const s = e.target.closest('.seat');
      if (!s) return;
      const k = +s.closest('.mt').dataset.k, i = +s.dataset.i, d = defs[k];
      d.seats[i] = VS.isOcc(d.seats[i]) ? 0 : 140;
      const occ = VS.isOcc(d.seats[i]);
      s.className = 'seat ' + (occ ? 'occ' : 'open');
      void s.offsetWidth;
      s.classList.add('flip');
      count(k);
    });
  }

  function demoMove(el) {
    let moved = false;
    const A = [140, 0, 0, 0], B = [0, 150, 0];
    const draw = () => {
      const a = moved ? A.slice(0, 3) : A, b = moved ? B : B.slice(0, 2);
      const open = (s) => s.filter((lb) => !VS.isOcc(lb)).length;
      const side = (name, s, extra) => `<div class="mt"><div class="mt-h"><b>Table ${name}</b><span>${s.length} seats, ${open(s)} open</span></div>
        <div class="plate flexy">${s.map((lb, i) => `<span class="seat ${VS.isOcc(lb) ? 'occ' : 'open'} ${extra && i === s.length - 1 ? 'arrive' : ''}"></span>`).join('')}<i class="hub"></i></div></div>`;
      el.querySelector('.pair').innerHTML = side('A', a) + side('B', b, moved);
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

  const steps = [
    { title: 'Every seat reports on its own', body: 'A thin pressure pad sits under the seat plate, where the seat bolts to the frame, so it works on cushion, wood or metal. It only measures weight. No camera, no names, no GPS.', demo: demoSeat },
    { title: 'Tables are just groups of seats', body: 'Size is written as rows x seats. A 1x1 is one seat, a 2x2 is four, a 1x8 is a long conference table.', demo: demoGroups },
    { title: 'Move a chair and the count follows', body: 'Staff rearrange a room and nobody scans or types anything. A table\'s seat count is whatever is actually sitting near its hub.', demo: demoMove },
    { title: 'Public: anyone can look', body: 'Colleges and cafes can open their seating to everyone. A sticker on each table links to that spot, so a student can check a library floor before walking over.', demo: demoPublic },
    { title: 'Private: staff only', body: 'The business picks public or private when it buys the furniture. A host sees open tables to seat guests faster. Everyone else sees a locked card.', demo: demoPrivate },
    { title: 'Now find a seat', body: 'Open the app and try it. Pick a place, tap a table, and watch the seats change.', demo: demoKey }
  ];

  /* ---------- shell ---------- */

  function render() {
    const s = steps[step], last = step === steps.length - 1;
    root.innerHTML = `
      <div class="tut-top"><div class="dots" aria-hidden="true">${steps.map((_, i) => `<i class="${i < step ? 'on' : i === step ? 'cur' : ''}"></i>`).join('')}</div><button class="skip" data-skip>Skip</button></div>
      <div class="tut-body" id="tut-body"><h2 id="tut-title">${VS.esc(s.title)}</h2><p>${VS.esc(s.body)}</p><div id="tut-demo"></div></div>
      <div class="tut-foot">${step ? '<button class="btn ghost" data-back>Back</button>' : ''}<button class="btn" data-next>${last ? 'Find a seat' : 'Next'}</button></div>`;
    s.demo(root.querySelector('#tut-demo'));
    root.querySelector('#tut-body').scrollTop = 0;
  }

  function open() {
    step = 0;
    root.hidden = false;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'tut-title');
    document.body.classList.add('lock');
    render();
  }

  function close() {
    mark();
    root.hidden = true;
    root.innerHTML = '';
    document.body.classList.remove('lock');
    if (typeof VS.onTutorialClose === 'function') VS.onTutorialClose();
  }

  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-skip]')) return close();
    if (e.target.closest('[data-back]')) { step = Math.max(0, step - 1); return render(); }
    if (e.target.closest('[data-next]')) {
      if (step >= steps.length - 1) return close();
      step++;
      render();
    }
  });

  VS.tutorial = { open, close, seen };
})();
