(function () {
  'use strict';
  const VS = window.VS;

  VS.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const svg = (inner, size) =>
    `<svg viewBox="0 0 24 24" width="${size || 22}" height="${size || 22}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

  VS.I = {
    back: svg('<path d="M15 5l-7 7 7 7"/>'),
    help: svg('<circle cx="12" cy="12" r="9.5"/><path d="M9.6 9.3a2.6 2.6 0 1 1 3.8 2.3c-.9.5-1.4 1-1.4 2"/><circle cx="12" cy="17.2" r=".7" fill="currentColor"/>'),
    lock: (n) => svg('<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>', n || 18),
    close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>', 20),
    plus: svg('<path d="M12 5v14M5 12h14"/>', 20),
    minus: svg('<path d="M5 12h14"/>', 20),
    logo:
      '<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">' +
      '<polygon points="9,2 23,2 30,9 30,23 23,30 9,30 2,23 2,9" fill="#2FDDA4"/>' +
      '<polygon points="12,9 20,9 23,12 23,20 20,23 12,23 9,20 9,12" fill="#0A1226"/>' +
      '<polygon points="14,13 18,13 19,14 19,18 18,19 14,19 13,18 13,14" fill="#9A6BFF"/></svg>'
  };

  /* ---------- table geometry ---------- */

  VS.sides = (t) => ({ n: t.sd.indexOf('n') > -1, e: t.sd.indexOf('e') > -1, s: t.sd.indexOf('s') > -1, w: t.sd.indexOf('w') > -1 });

  // Footprint in seat widths, including the chairs. ox and oy are the top's offset inside it.
  VS.foot = (t) => {
    const k = VS.sides(t);
    const ox = k.w ? 1 : 0, oy = k.n ? 1 : 0;
    return { w: t.c + ox + (k.e ? 1 : 0), h: t.r + oy + (k.s ? 1 : 0), ox, oy };
  };

  // Chair positions (1-based grid cells) in a fixed order: north, east, south, west.
  VS.slots = (t) => {
    if (t.bk) return [];
    const k = VS.sides(t), f = VS.foot(t), out = [];
    if (k.n) for (let i = 0; i < t.c; i++) out.push({ row: 1, col: f.ox + 1 + i });
    if (k.e) for (let j = 0; j < t.r; j++) out.push({ row: f.oy + 1 + j, col: f.ox + t.c + 1 });
    if (k.s) for (let i = 0; i < t.c; i++) out.push({ row: f.oy + t.r + 1, col: f.ox + 1 + i });
    if (k.w) for (let j = 0; j < t.r; j++) out.push({ row: f.oy + 1 + j, col: 1 });
    return out;
  };

  VS.chairs = (t) => VS.slots(t).length;
  VS.heightOf = (list) => list.reduce((m, t) => Math.max(m, t.y + VS.foot(t).h), 0);

  VS.sidesText = (t) => {
    if (t.bk) return 'booth, set by staff';
    if (t.r === 0) return t.c === 1 ? 'lounge chair' : 'sofa';
    const n = VS.sides(t);
    const count = ['n', 'e', 's', 'w'].filter((x) => n[x]).length;
    return count === 4 ? 'chairs on all four sides' : count === 1 ? 'chairs on one side' : 'chairs on ' + count + ' sides';
  };

  VS.fitFloor = (el, rows) => {
    if (!el) return;
    const u = el.clientWidth / ((VS.COLS + 2 * VS.PAD) * 7);
    el.style.setProperty('--u', u + 'px');
    el.style.height = (rows + 2 * VS.PAD) * 7 * u + 'px';
  };

  VS.chairsText = (n) => n + (n === 1 ? ' chair' : ' chairs');

  /* ---------- drawing ---------- */

  VS.seatCls = (s) => (VS.isOcc(s) ? 'occ' : 'open') + (VS.pending(s) ? ' pending' : '');

  // seats lines up with VS.slots(t). A null entry means no chair there (used in one tutorial demo).
  VS.tbStyle = (t) => { const f = VS.foot(t); return `--gc:${f.w};--gr:${f.h}`; };

  VS.tbHTML = (t, seats) => {
    const f = VS.foot(t), slots = VS.slots(t);
    if (t.bk) {
      const st = VS.bState(t), cls = st === 't' ? 'occ' : st === 'u' ? 'unk' : 'open';
      const bench = (row) => `<span class="bench ${cls}" style="grid-row:${row};grid-column:${f.ox + 1}/span ${t.c}"></span>`;
      return bench(1) + `<span class="top" style="grid-row:${f.oy + 1}/span ${t.r};grid-column:${f.ox + 1}/span ${t.c}"><span class="tl"><b>${VS.esc(t.n)}</b>${t.c >= 3 ? '<em>by hand</em>' : ''}</span></span>` + bench(f.oy + t.r + 1);
    }
    let h = '';
    if (t.r > 0) {
      const open = seats.filter((s) => s && !VS.isOcc(s)).length;
      const showName = t.c > 1 || t.r > 1 || String(t.n).length <= 3;
      const label = showName ? `<span class="tl"><b>${VS.esc(t.n)}</b>${t.c >= 3 ? `<em data-tc>${open} open</em>` : ''}</span>` : '';
      h += `<span class="top" style="grid-row:${f.oy + 1}/span ${t.r};grid-column:${f.ox + 1}/span ${t.c}">${label}<i class="hub"></i></span>`;
    }
    slots.forEach((p, i) => {
      const s = seats[i];
      if (!s) return;
      h += `<span class="seat ${VS.seatCls(s)}" data-s="${i}" style="grid-row:${p.row};grid-column:${p.col}"></span>`;
    });
    return h;
  };

  VS.tableBtn = (t, ti, seats, tag, extra) => {
    const left = `left:calc(var(--u)*${(t.x + VS.PAD) * 7});top:calc(var(--u)*${(t.y + VS.PAD) * 7})`;
    const open = seats.filter((s) => s && !VS.isOcc(s)).length;
    const lbl = t.bk ? `Booth ${VS.esc(t.n)}, set by staff, ${{ o: 'open', t: 'taken', u: 'unknown' }[VS.bState(t)]}` : `Table ${VS.esc(t.n)}, ${t.r}x${t.c}, ${open} of ${seats.length} seats open`;
    return `<${tag} class="tb tbl ${extra || ''}" data-t="${ti}" style="${VS.tbStyle(t)};${left}" aria-label="${lbl}">${VS.tbHTML(t, seats)}</${tag}>`;
  };

  VS.counts = (p) => {
    let open = 0, total = 0;
    p.tables.forEach((t) => t.seats.forEach((s) => { total++; if (!VS.isOcc(s)) open++; }));
    return { open, total, taken: total - open };
  };

  VS.cardHTML = (p, opt) => {
    opt = opt || {};
    const tag = opt.static ? 'div' : 'button';
    const head = `<div class="card-top"><div><h3>${VS.esc(p.name)}</h3><p class="sub">${VS.esc(p.kind)}, ${VS.esc(p.hours)}</p></div>`;
    if (p.mode === 'public') {
      const c = VS.counts(p);
      return `<${tag} class="card" data-pid="${p.id}" ${opt.static ? '' : `data-go="${p.id}"`}>${head}<span class="tag pub">Public</span></div>
        <div class="card-mid"><strong data-open>${c.open}</strong> <span data-of>open of ${c.total}</span></div>
        <div class="meter" aria-hidden="true"><i data-bar style="width:${c.total ? (c.open / c.total) * 100 : 0}%"></i></div></${tag}>`;
    }
    return `<${tag} class="card locked" ${opt.static ? '' : `data-lock="${p.id}"`} aria-label="${VS.esc(p.name)}, private, staff only">${head}<span class="tag priv">${VS.I.lock(14)}Private</span></div>
      <div class="card-mid dim">Staff only</div>
      <div class="meter off" aria-hidden="true"></div></${tag}>`;
  };

  VS.updateCards = (root) => {
    (root || document).querySelectorAll('.card[data-pid]').forEach((el) => {
      const p = VS.PLACES.find((x) => x.id === el.dataset.pid);
      if (!p || !p.tables) return;
      const c = VS.counts(p);
      el.querySelector('[data-open]').textContent = c.open;
      el.querySelector('[data-of]').textContent = 'open of ' + c.total;
      el.querySelector('[data-bar]').style.width = (c.total ? (c.open / c.total) * 100 : 0) + '%';
    });
  };

  // Not a real QR code. A fixed pattern so the sticker reads as one.
  VS.qr = () => {
    const n = 9, rows = [];
    const finder = (r, c) => {
      const inF = (r0, c0) => r >= r0 && r < r0 + 3 && c >= c0 && c < c0 + 3;
      if (inF(0, 0) || inF(0, 6) || inF(6, 0)) {
        const rr = r % 6 === r ? r : r - 6, cc = c % 6 === c ? c : c - 6;
        return !(rr === 1 && cc === 1) ? 1 : 0;
      }
      return null;
    };
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const f = finder(r, c);
        const on = f !== null ? f : ((r * 7 + c * 5 + r * c) % 3 === 0 ? 1 : 0);
        rows.push(`<b class="${on ? 'on' : ''}"></b>`);
      }
    }
    return `<div class="qr" aria-hidden="true">${rows.join('')}</div>`;
  };
})();
