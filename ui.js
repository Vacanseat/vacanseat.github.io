(function () {
  'use strict';
  const VS = window.VS;

  VS.isOcc = (lb) => lb >= VS.THRESHOLD;
  VS.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const svg = (inner, size) =>
    `<svg viewBox="0 0 24 24" width="${size || 22}" height="${size || 22}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

  VS.I = {
    back: svg('<path d="M15 5l-7 7 7 7"/>'),
    help: svg('<circle cx="12" cy="12" r="9.5"/><path d="M9.6 9.3a2.6 2.6 0 1 1 3.8 2.3c-.9.5-1.4 1-1.4 2"/><circle cx="12" cy="17.2" r=".7" fill="currentColor"/>'),
    lock: (n) => svg('<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>', n || 18),
    close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>', 20),
    logo:
      '<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">' +
      '<polygon points="9,2 23,2 30,9 30,23 23,30 9,30 2,23 2,9" fill="#2FDDA4"/>' +
      '<polygon points="12,9 20,9 23,12 23,20 20,23 12,23 9,20 9,12" fill="#0A1226"/>' +
      '<polygon points="14,13 18,13 19,14 19,18 18,19 14,19 13,18 13,14" fill="#9A6BFF"/></svg>'
  };

  VS.counts = (p) => {
    let open = 0, total = 0;
    p.tables.forEach((t) => t.seats.forEach((lb) => { total++; if (!VS.isOcc(lb)) open++; }));
    return { open, total, taken: total - open };
  };

  // A grid of seats. Used for the tutorial demos. The real floor draws its own (absolute) tables.
  VS.plate = (rows, cols, seats, cls) => {
    const cells = seats.map((lb, i) => `<span class="seat ${VS.isOcc(lb) ? 'occ' : 'open'}" data-i="${i}"></span>`).join('');
    return `<div class="plate ${cls || ''}" style="grid-template-columns:repeat(${cols},calc(var(--u)*6))">${cells}<i class="hub"></i></div>`;
  };

  VS.cardHTML = (p, opt) => {
    opt = opt || {};
    const tag = opt.static ? 'div' : 'button';
    const head = `<div class="card-top"><div><h3>${VS.esc(p.name)}</h3><p class="sub">${VS.esc(p.kind)}, ${VS.esc(p.hours)}</p></div>`;
    if (p.mode === 'public') {
      const c = VS.counts(p);
      return `<${tag} class="card" data-pid="${p.id}" ${opt.static ? '' : `data-go="${p.id}"`}>${head}<span class="tag pub">Public</span></div>
        <div class="card-mid"><strong data-open>${c.open}</strong> <span data-of>open of ${c.total}</span></div>
        <div class="meter" aria-hidden="true"><i data-bar style="width:${(c.open / c.total) * 100}%"></i></div></${tag}>`;
    }
    return `<${tag} class="card locked" ${opt.static ? '' : `data-lock="${p.id}"`} aria-label="${VS.esc(p.name)}, private, staff only">${head}<span class="tag priv">${VS.I.lock(14)}Private</span></div>
      <div class="card-mid dim">Staff only</div>
      <div class="meter off" aria-hidden="true"></div></${tag}>`;
  };

  VS.updateCards = (root) => {
    (root || document).querySelectorAll('.card[data-pid]').forEach((el) => {
      const p = VS.PLACES.find((x) => x.id === el.dataset.pid);
      if (!p) return;
      const c = VS.counts(p);
      el.querySelector('[data-open]').textContent = c.open;
      el.querySelector('[data-of]').textContent = 'open of ' + c.total;
      el.querySelector('[data-bar]').style.width = (c.open / c.total) * 100 + '%';
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
