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

  VS.seedPlace = (p) => {
    p.base = p.busy;
    p.tables = p.t.map((d) => Object.assign({}, d, { seats: VS.slots(d).map(() => VS.mkSeat(Math.random() < p.busy)) }));
  };

  VS.rerollPlace = (p, busy) => {
    p.busy = busy;
    p.tables.forEach((t) => { t.seats = t.seats.map(() => VS.mkSeat(Math.random() < busy)); });
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
