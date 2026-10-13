window.VS = window.VS || {};

// Sensing rule. A seat reads taken after THRESHOLD lb is held for TAKE_SECS.
// It reads open again after less than THRESHOLD lb is held for FREE_SECS.
// A loaded backpack runs about 15 to 30 lb. A seated person puts roughly 60 to 80 percent
// of their body weight on the seat, so a 100 lb person reads around 60 to 80 lb.
VS.THRESHOLD = 50;
VS.TAKE_SECS = 10;
VS.FREE_SECS = 60;
VS.TICK_SECS = 2.6;

// The floor is COLS seat widths across. x and y are in seat widths from the top left.
// A table is r x c seats (its top). sd lists which sides have chairs: n, e, s, w.
// A 1x8 with sd 'nsew' is one seat wide, eight long, with chairs down both long sides
// and on both ends: 8 + 8 + 1 + 1 = 18. A bar is 'n' or 's' only. r = 0 is a lone
// chair or sofa with no top.
VS.COLS = 14;
VS.PAD = 0.5; // empty margin around the floor, in seat widths

(function () {
  // bk marks a booth: no feet to sense, so staff set its status by hand. old seeds one that nobody has updated in 3 hours.
  const T = (n, x, y, r, c, sd, bk, old) => Object.assign({ n, x, y, r, c, sd }, bk ? { bk: 1 } : {}, old ? { old: 1 } : {});

  VS.PLACES = [
    {
      id: 'clough-l2', name: 'Clough Commons, Level 2', kind: 'College library',
      mode: 'public', hours: 'Open until 2 AM', busy: 0.62,
      t: [
        T('A1', 0, 0, 1, 8, 'nsew'), T('A2', 11, 0, 1, 1, 'nsew'),
        T('B1', 0, 4, 2, 4, 'nsew'), T('B2', 7, 4, 2, 3, 'nsew'), T('B3', 13, 4, 1, 1, 'ns'),
        T('C1', 0, 9, 1, 1, 'n'), T('C2', 2, 9, 1, 1, 'n'), T('C3', 4, 9, 1, 1, 'n'),
        T('C4', 6, 9, 1, 1, 'n'), T('C5', 8, 9, 1, 1, 'n'),
        T('L1', 11, 9, 0, 1, 'n'), T('L2', 12, 9, 0, 1, 'n'), T('L3', 13, 9, 0, 1, 'n'),
        T('D1', 0, 12, 1, 6, 's'), T('D2', 7, 12, 2, 2, 'nsew'), T('E1', 12, 12, 1, 1, 'ns')
      ]
    },
    {
      id: 'price-gilbert-3', name: 'Price Gilbert Library, 3rd Floor', kind: 'College library',
      mode: 'public', hours: 'Open until midnight', busy: 0.78,
      t: [
        T('R1', 0, 0, 1, 10, 'ns'), T('S1', 11, 0, 3, 1, 'we'),
        T('R2', 0, 4, 1, 10, 'ns'), T('S2', 11, 4, 3, 1, 'we'),
        T('Q1', 0, 8, 2, 4, 'nsew'), T('Q2', 7, 8, 2, 4, 'nsew'),
        T('K1', 0, 13, 1, 1, 'n'), T('K2', 2, 13, 1, 1, 'n'), T('K3', 4, 13, 1, 1, 'n'),
        T('K4', 6, 13, 1, 1, 'n'), T('K5', 8, 13, 1, 1, 'n'), T('K6', 10, 13, 1, 1, 'n'),
        T('K7', 12, 13, 1, 1, 'n'),
        T('B1', 0, 16, 1, 6, 's'), T('G1', 7, 16, 2, 2, 'nsew')
      ]
    },
    {
      id: 'starbucks', name: 'Starbucks', kind: 'Cafe',
      mode: 'public', hours: 'Closes at 9 PM', busy: 0.55,
      t: [
        T('W1', 0, 0, 1, 9, 'n'), T('L1', 10, 0, 0, 1, 'n'), T('L2', 11, 0, 0, 1, 'n'), T('L3', 12, 0, 0, 1, 'n'),
        T('T1', 0, 3, 1, 1, 'ns'), T('T2', 2, 3, 1, 1, 'ns'), T('T3', 4, 3, 1, 1, 'ns'), T('T4', 6, 3, 1, 1, 'ns'),
        T('T5', 8, 3, 1, 1, 'nsew'), T('T6', 12, 3, 1, 1, 'ns'),
        T('M1', 0, 7, 1, 4, 'nsew'), T('S1', 8, 7, 0, 2, 'n'), T('S2', 11, 7, 0, 2, 'n'),
        T('CT', 0, 11, 1, 6, 's'),
        T('K1', 0, 14, 1, 2, 'ns', 1), T('K2', 3, 14, 1, 2, 'ns', 1, 1)
      ]
    },
    {
      id: 'chilis', name: "Chili's", kind: 'Restaurant',
      mode: 'private', hours: 'Open until 11 PM', busy: 0.7,
      t: [
        T('B1', 0, 0, 1, 2, 'ns'), T('B2', 3, 0, 1, 2, 'ns'), T('B3', 6, 0, 1, 2, 'ns'),
        T('B4', 9, 0, 1, 2, 'ns'), T('B5', 12, 0, 1, 2, 'ns'),
        T('T1', 0, 4, 1, 1, 'nsew'), T('T2', 5, 4, 1, 1, 'nsew'), T('T3', 10, 4, 1, 1, 'nsew'),
        T('X1', 0, 8, 1, 2, 'nsew'), T('X2', 5, 8, 1, 2, 'nsew'), T('X3', 10, 8, 1, 2, 'nsew'),
        T('BAR', 0, 12, 1, 10, 'n'),
        T('K1', 0, 15, 1, 2, 'ns', 1), T('K2', 3, 15, 1, 2, 'ns', 1), T('K3', 6, 15, 1, 2, 'ns', 1), T('K4', 9, 15, 1, 2, 'ns', 1)
      ]
    },
    {
      id: 'texas-roadhouse', name: 'Texas Roadhouse', kind: 'Restaurant',
      mode: 'private', hours: 'Open until 10 PM', busy: 0.85,
      t: [
        T('H1', 0, 0, 1, 6, 'n'),
        T('A1', 0, 3, 1, 5, 'nsew'), T('A2', 8, 3, 1, 4, 'nsew'),
        T('B1', 0, 7, 1, 5, 'nsew'), T('B2', 8, 7, 1, 4, 'nsew'),
        T('C1', 0, 11, 1, 1, 'nsew'), T('C2', 5, 11, 1, 1, 'nsew'), T('C3', 10, 11, 1, 1, 'nsew'),
        T('BAR', 0, 15, 1, 10, 'n')
      ]
    }
  ];
})();
