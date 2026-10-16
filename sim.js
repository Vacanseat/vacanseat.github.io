(function () {
  'use strict';
  const VS = window.VS;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // Simulated pressure reading in lb. A person reads 58 to 150. A bag on an empty seat
  // now and then reads 12 to 44. Whether that counts is the venue's weight line.
  VS.reading = (person) => (person ? Math.round(rnd(58, 150)) : Math.random() < 0.12 ? Math.round(rnd(12, 44)) : 0);

  VS.lineOf = (s) => (s && s.line) || VS.THRESHOLD;

  // lb is the raw reading. st is what the app shows: 't' taken, 'o' open.
  // over and under count seconds spent over or under the venue's weight line.
  VS.mkSeat = (person, line) => {
    const lb = VS.reading(person);
    const over = lb >= (line || VS.THRESHOLD);
    return { lb, line: line || VS.THRESHOLD, st: over ? 't' : 'o', over: over ? VS.TAKE_SECS : 0, under: over ? 0 : VS.FREE_SECS };
  };

  VS.isOcc = (s) => s.st === 't';
  VS.pending = (s) => (s.lb >= VS.lineOf(s)) !== (s.st === 't');

  VS.stepSeat = (s, dt) => {
    const line = VS.lineOf(s);
    if (s.lb >= line) { s.over += dt; s.under = 0; } else { s.under += dt; s.over = 0; }
    if (s.st === 'o' && s.over >= VS.TAKE_SECS) s.st = 't';
    else if (s.st === 't' && s.under >= VS.FREE_SECS) s.st = 'o';
  };

  VS.seedPlace = (p) => {
    p.base = p.busy;
    p.line = p.line || VS.THRESHOLD;
    p.tables = p.t.map((d) => Object.assign({}, d, { seats: VS.slots(d).map(() => VS.mkSeat(Math.random() < p.busy, p.line)) }));
  };

  VS.rerollPlace = (p, busy) => {
    p.busy = busy;
    p.tables.forEach((t) => { t.seats = t.seats.map(() => VS.mkSeat(Math.random() < busy, p.line)); });
  };

  // Booth benches are sensed too, but one long pad covers a whole bench, so they are counted apart from chairs.
  VS.boothCounts = (p) => {
    const c = { open: 0, total: 0, booths: 0 };
    p.tables.forEach((t) => { if (!t.bk) return; c.booths++; t.seats.forEach((s) => { c.total++; if (!VS.isOcc(s)) c.open++; }); });
    return c;
  };

  VS.tickPlaces = (places) => {
    places.forEach((p) => {
      const arrive = 0.05 * p.busy, leave = 0.05 * (1 - p.busy);
      p.tables.forEach((t) => t.seats.forEach((s) => {
        const person = s.lb >= 50;
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
