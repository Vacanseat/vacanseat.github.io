window.VS = window.VS || {};

// One number to change if the class pushes back on 100 lb.
VS.THRESHOLD = 100;

// Tables: [label, x, y, rows, cols]. x and y are in floor units (the floor is 100 units wide).
// "1x8" means 1 row of 8 seats. Seat = 7 units with gap, so a table is (cols*7+2) wide, (rows*7+2) tall.
VS.PLACES = [
  {
    id: 'clough-l2', name: 'Clough Commons, Level 2', kind: 'College library',
    mode: 'public', hours: 'Open until 2 AM', busy: 0.62, h: 128,
    t: [
      ['A1', 5, 8, 1, 8], ['A2', 72, 8, 2, 2],
      ['B1', 5, 32, 2, 4], ['B2', 42, 32, 2, 4], ['B3', 80, 32, 1, 2],
      ['C1', 5, 60, 2, 2], ['C2', 28, 60, 2, 2], ['C3', 51, 60, 2, 2], ['C4', 74, 60, 1, 1],
      ['D1', 5, 88, 1, 6], ['L1', 58, 88, 1, 1], ['L2', 70, 88, 1, 1], ['L3', 82, 88, 1, 1],
      ['E1', 5, 106, 2, 3], ['E2', 36, 106, 2, 3], ['E3', 67, 106, 1, 4]
    ]
  },
  {
    id: 'price-gilbert-3', name: 'Price Gilbert Library, 3rd Floor', kind: 'College library',
    mode: 'public', hours: 'Open until midnight', busy: 0.78, h: 124,
    t: [
      ['R1', 5, 8, 1, 10], ['R2', 5, 26, 1, 10],
      ['Q1', 5, 46, 2, 4], ['Q2', 42, 46, 2, 4], ['Q3', 80, 46, 2, 2],
      ['K1', 5, 72, 1, 1], ['K2', 17, 72, 1, 1], ['K3', 29, 72, 1, 1], ['K4', 41, 72, 1, 1],
      ['K5', 53, 72, 1, 1], ['K6', 65, 72, 1, 1], ['K7', 77, 72, 1, 1], ['K8', 89, 72, 1, 1],
      ['K9', 5, 88, 1, 1], ['K10', 17, 88, 1, 1], ['K11', 29, 88, 1, 1], ['K12', 41, 88, 1, 1],
      ['K13', 53, 88, 1, 1], ['K14', 65, 88, 1, 1], ['K15', 77, 88, 1, 1], ['K16', 89, 88, 1, 1],
      ['S1', 5, 106, 2, 2], ['S2', 28, 106, 2, 2], ['S3', 51, 106, 1, 6]
    ]
  },
  {
    id: 'starbucks', name: 'Starbucks', kind: 'Cafe',
    mode: 'public', hours: 'Closes at 9 PM', busy: 0.55, h: 100,
    t: [
      ['W1', 5, 8, 1, 9],
      ['T1', 5, 28, 1, 2], ['T2', 28, 28, 1, 2], ['T3', 51, 28, 1, 2], ['T4', 74, 28, 1, 2],
      ['T5', 5, 50, 2, 2], ['T6', 28, 50, 2, 2], ['T7', 51, 50, 2, 2], ['T8', 74, 50, 1, 1],
      ['C1', 5, 76, 1, 1], ['C2', 17, 76, 1, 1], ['C3', 29, 76, 1, 1], ['S1', 48, 76, 2, 3]
    ]
  },
  {
    id: 'chilis', name: "Chili's", kind: 'Restaurant',
    mode: 'private', hours: 'Open until 11 PM', busy: 0.7, h: 100,
    t: [
      ['B1', 5, 8, 1, 4], ['B2', 42, 8, 1, 4], ['B3', 79, 8, 1, 2],
      ['T1', 5, 30, 2, 2], ['T2', 28, 30, 2, 2], ['T3', 51, 30, 2, 2], ['T4', 74, 30, 2, 2],
      ['T5', 5, 56, 2, 3], ['T6', 36, 56, 2, 3], ['T7', 67, 56, 2, 3],
      ['BAR', 5, 82, 1, 10]
    ]
  },
  {
    id: 'texas-roadhouse', name: 'Texas Roadhouse', kind: 'Restaurant',
    mode: 'private', hours: 'Open until 10 PM', busy: 0.85, h: 100,
    t: [
      ['H1', 5, 8, 1, 6], ['H2', 56, 8, 1, 5],
      ['A1', 5, 28, 2, 4], ['A2', 42, 28, 2, 4], ['A3', 79, 28, 2, 2],
      ['B1', 5, 54, 2, 4], ['B2', 42, 54, 2, 4], ['B3', 79, 54, 2, 2],
      ['C1', 5, 80, 1, 10]
    ]
  }
];
