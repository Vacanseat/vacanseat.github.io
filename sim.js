(function () {
  'use strict';
  const VS = window.VS;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // Simulated pressure reading in lb. A person reads 58 to 150. A bag on an empty seat
  // now and then reads 12 to 44, which stays under the line.
  VS.reading = (person) => (person ? Math.round(rnd(58, 150)) : Math.random() < 0.12 ? Math.round(rnd(12, 44)) : 0);

  // lb is the raw reading. st is what the app shows: 't' taken, 'o' open.
  // over and under count seconds spent over or under the line.
  VS.mkSeat = (person) => {
    const lb = VS.reading(person);
    const over = lb >= VS.THRESHOLD;
    return { lb, st: over ? 't' : 'o', over: over ? VS.TAKE_SECS : 0, under: over ? 0 : VS.FREE_SECS };
  };

  VS.isOcc = (s) => s.st === 't';
  VS.pending = (s) => (s.lb >= VS.THRESHOLD) !== (s.st === 't');

  VS.stepSeat = (s, dt) => {
    if (s.lb >= VS.THRESHOLD) { s.over += dt; s.under = 0; } else { s.under += dt; s.over = 0; }
    if (s.st === 'o' && s.over >= VS.TAKE_SECS) s.st = 't';
    else if (s.st === 't' && s.under >= VS.FREE_SECS) s.st = 'o';
  };

  // Booths have no feet, so staff set them by hand. bs holds the last status and when it was set.
  // Nothing set for BOOTH_HOURS hours reads as unknown, so a forgotten booth never stays confidently wrong.
  VS.BOOTH_HOURS = 2;
  VS.seedBooth = (busy, old) => ({ st: Math.random() < busy ? 't' : 'o', at: Date.now() - (old ? 3 * 3600e3 : rnd(5, 90) * 60e3) });
  VS.bState = (t) => (!t.bs ? 'o' : Date.now() - t.bs.at > VS.BOOTH_HOURS * 3600e3 ? 'u' : t.bs.st);
  VS.ago = (at) => {
    const m = Math.max(0, Math.round((Date.now() - at) / 60e3));
    return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min ago';
  };
  VS.boothCounts = (p) => {
    const c = { open: 0, taken: 0, unknown: 0, total: 0 };
    p.tables.forEach((t) => { if (!t.bk) return; c.total++; const s = VS.bState(t); if (s === 't') c.taken++; else if (s === 'u') c.unknown++; else c.open++; });
    return c;
  };

  VS.seedPlace = (p) => {
    p.base = p.busy;
    p.tables = p.t.map((d) => {
      const t = Object.assign({}, d, { seats: VS.slots(d).map(() => VS.mkSeat(Math.random() < p.busy)) });
      if (d.bk) t.bs = VS.seedBooth(p.busy, d.old);
      return t;
    });
  };

  VS.rerollPlace = (p, busy) => {
    p.busy = busy;
    p.tables.forEach((t) => { t.seats = t.seats.map(() => VS.mkSeat(Math.random() < busy)); if (t.bk) t.bs = VS.seedBooth(busy, t.old); });
  };

  VS.tickPlaces = (places) => {
    places.forEach((p) => {
      const arrive = 0.05 * p.busy, leave = 0.05 * (1 - p.busy);
      p.tables.forEach((t) => t.seats.forEach((s) => {
        const person = s.lb >= VS.THRESHOLD;
        if (person && Math.random() < leave) s.lb = VS.reading(false);
        else if (!person && Math.random() < arrive) s.lb = VS.reading(true);
        VS.stepSeat(s, VS.TICK_SECS);
      }));
    });
  };

  VS.store = {
    get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked, fine */ } }
  };
})();
