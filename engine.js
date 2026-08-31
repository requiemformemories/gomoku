// Gomoku / Renju rules + AI. No dependencies, runs in browser and node.
export const SIZE = 15;
export const EMPTY = 0, BLACK = 1, WHITE = 2;
const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];

export const newBoard = () => new Int8Array(SIZE * SIZE);
export const idx = (x, y) => y * SIZE + x;
export const xy = p => [p % SIZE, (p - p % SIZE) / SIZE];
export const other = c => (c === BLACK ? WHITE : BLACK);
const inb = (x, y) => x >= 0 && x < SIZE && y >= 0 && y < SIZE;

// --- line primitives ---------------------------------------------------------

function runLen(b, x, y, dx, dy, c) {
  let n = 1;
  for (let s = 1; inb(x + dx * s, y + dy * s) && b[idx(x + dx * s, y + dy * s)] === c; s++) n++;
  for (let s = 1; inb(x - dx * s, y - dy * s) && b[idx(x - dx * s, y - dy * s)] === c; s++) n++;
  return n;
}

function openEnds(b, x, y, dx, dy, c) {
  let n = 0;
  for (const sg of [1, -1]) {
    let k = 1;
    while (inb(x + dx * sg * k, y + dy * sg * k) && b[idx(x + dx * sg * k, y + dy * sg * k)] === c) k++;
    const X = x + dx * sg * k, Y = y + dy * sg * k;
    if (inb(X, Y) && b[idx(X, Y)] === EMPTY) n++;
  }
  return n;
}

// Empty points within 4 of (x,y) along one direction that complete a five for c.
function fivePoints(b, x, y, dx, dy, c, exact) {
  const pts = [];
  for (let s = -4; s <= 4; s++) {
    if (!s) continue;
    const X = x + dx * s, Y = y + dy * s;
    if (!inb(X, Y)) continue;
    const i = idx(X, Y);
    if (b[i] !== EMPTY) continue;
    b[i] = c;
    const n = runLen(b, X, Y, dx, dy, c);
    b[i] = EMPTY;
    if (exact ? n === 5 : n >= 5) pts.push(i);
  }
  return pts;
}

// A three is "open" (活三) if some empty point turns it into a straight four.
function openThreeIn(b, x, y, dx, dy, c, rules, depth) {
  const exact = c === BLACK && !!rules.overline;
  for (let s = -4; s <= 4; s++) {
    if (!s) continue;
    const X = x + dx * s, Y = y + dy * s;
    if (!inb(X, Y)) continue;
    const e = idx(X, Y);
    if (b[e] !== EMPTY) continue;
    b[e] = c;
    const straight = runLen(b, X, Y, dx, dy, c) === 4 &&
      fivePoints(b, X, Y, dx, dy, c, exact).length >= 2;
    b[e] = EMPTY;
    if (!straight) continue;
    // renju: the developing point itself must be legal
    if (c === BLACK && depth < 2 && forbidden(b, e, rules, depth + 1)) continue;
    return true;
  }
  return false;
}

// --- point analysis ----------------------------------------------------------

/** What placing `c` at empty point `p` achieves: {five, over, fours, threes}. */
export function analyzePoint(b, p, c, rules, depth = 0) {
  if (b[p] !== EMPTY) return null;
  const exact = c === BLACK && !!rules.overline;
  const [x, y] = xy(p);
  b[p] = c;
  let five = false, over = false, fours = 0, threes = 0;
  for (const [dx, dy] of DIRS) {
    const n = runLen(b, x, y, dx, dy, c);
    if (n >= 6) over = true;
    if (exact ? n === 5 : n >= 5) five = true;
    const pts = fivePoints(b, x, y, dx, dy, c, exact);
    // a straight four (.XXXX.) has two five-points but counts as one four
    if (pts.length) fours += (pts.length >= 2 && n === 4) ? 1 : pts.length;
  }
  if (!five) for (const [dx, dy] of DIRS) if (openThreeIn(b, x, y, dx, dy, c, rules, depth)) threes++;
  b[p] = EMPTY;
  return { five, over, fours, threes };
}

/** Renju foul for black at `p`, or null. Returns 'overline'|'doubleFour'|'doubleThree'. */
export function forbidden(b, p, rules, depth = 0) {
  if (!(rules.overline || rules.doubleFour || rules.doubleThree)) return null;
  if (b[p] !== EMPTY) return null;
  const a = analyzePoint(b, p, BLACK, rules, depth);
  if (rules.overline && a.over) return 'overline';
  if (a.five) return null;                       // making five wins, fouls don't apply
  if (rules.doubleFour && a.fours >= 2) return 'doubleFour';
  if (rules.doubleThree && a.threes >= 2) return 'doubleThree';
  return null;
}

/** The winning run through the stone just played at `p`, or null. */
export function winLine(b, p, rules) {
  const c = b[p], [x, y] = xy(p);
  if (c === EMPTY) return null;
  for (const [dx, dy] of DIRS) {
    let back = 0, fwd = 0;
    while (inb(x - dx * (back + 1), y - dy * (back + 1)) &&
           b[idx(x - dx * (back + 1), y - dy * (back + 1))] === c) back++;
    while (inb(x + dx * (fwd + 1), y + dy * (fwd + 1)) &&
           b[idx(x + dx * (fwd + 1), y + dy * (fwd + 1))] === c) fwd++;
    const n = back + fwd + 1;
    if ((c === BLACK && rules.overline) ? n === 5 : n >= 5) {
      const out = [];
      for (let s = -back; s <= fwd; s++) out.push(idx(x + dx * s, y + dy * s));
      return out;
    }
  }
  return null;
}

/** Did the stone just played at `p` win? */
export const isWin = (b, p, rules) => !!winLine(b, p, rules);

// --- AI ----------------------------------------------------------------------

export function candidates(b, dist = 2) {
  const set = new Set();
  for (let p = 0; p < b.length; p++) {
    if (!b[p]) continue;
    const [x, y] = xy(p);
    for (let dy = -dist; dy <= dist; dy++) for (let dx = -dist; dx <= dist; dx++) {
      const X = x + dx, Y = y + dy;
      if (inb(X, Y) && !b[idx(X, Y)]) set.add(idx(X, Y));
    }
  }
  if (!set.size) {
    if (b[idx(7, 7)] === EMPTY) return [idx(7, 7)];            // empty board: open at the centre
    for (let p = 0; p < b.length; p++) if (!b[p]) set.add(p);  // nothing adjacent left
  }
  return [...set];
}

export function legalMoves(b, c, rules) {
  return candidates(b).filter(p => c !== BLACK || !forbidden(b, p, rules));
}

// Cheap shape score, used for move ordering and by the easy level.
function quickScore(b, p, c) {
  const [x, y] = xy(p);
  let s = 0;
  for (const cc of [c, other(c)]) {
    b[p] = cc;
    for (const [dx, dy] of DIRS) {
      const n = runLen(b, x, y, dx, dy, cc), e = openEnds(b, x, y, dx, dy, cc);
      if (!e && n < 5) continue;
      const v = n >= 5 ? 1e6 : n === 4 ? (e === 2 ? 12000 : 1500)
        : n === 3 ? (e === 2 ? 1200 : 150) : n === 2 ? (e === 2 ? 80 : 15) : 6;
      s += cc === c ? v : v * 0.85;
    }
    b[p] = EMPTY;
  }
  return s + (7 - Math.max(Math.abs(x - 7), Math.abs(y - 7)));  // nudge toward centre
}

const W = [0, 1, 12, 150, 2500, 300000];

function evalBoard(b, me) {
  const op = other(me);
  let s = 0;
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) for (const [dx, dy] of DIRS) {
    if (!inb(x + 4 * dx, y + 4 * dy)) continue;
    let m = 0, o = 0;
    for (let k = 0; k < 5; k++) {
      const v = b[idx(x + dx * k, y + dy * k)];
      if (v === me) m++; else if (v === op) o++;
    }
    if (m && o) continue;
    if (m) s += W[m]; else if (o) s -= W[o] * 1.2;
  }
  return s;
}

const TIMEOUT = Symbol('timeout');

function ordered(b, c, K) {
  return candidates(b)
    .map(p => [quickScore(b, p, c), p]).sort((a, z) => z[0] - a[0])
    .slice(0, K).map(e => e[1]);
}

// ponytail: forbidden points are filtered at the root only — inside the search
// black may plan through an illegal point. Push the check into negamax if the
// AI ever gets caught doing that.
function negamax(b, c, depth, alpha, beta, ctx) {
  if (Date.now() > ctx.deadline) throw TIMEOUT;
  if (!depth) return evalBoard(b, c);
  let best = -Infinity;
  for (const p of ordered(b, c, ctx.K)) {
    b[p] = c;
    const v = isWin(b, p, ctx.rules) ? 1e7 + depth : -negamax(b, other(c), depth - 1, -beta, -alpha, ctx);
    b[p] = EMPTY;
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best === -Infinity ? evalBoard(b, c) : best;
}

export const LEVELS = {
  easy:   { depth: 0, budget: 0,    K: 6 },
  medium: { depth: 2, budget: 200,  K: 8 },
  hard:   { depth: 4, budget: 800,  K: 10 },
  expert: { depth: 8, budget: 1800, K: 12 },
};

/** Best move for `c`, or null if the board is full. */
export function bestMove(b, c, rules, level = 'medium') {
  const legal = legalMoves(b, c, rules);
  if (!legal.length) return null;
  const op = other(c);
  const pick = ps => ps.reduce((a, p) => quickScore(b, p, c) > quickScore(b, a, c) ? p : a);

  for (const p of legal) if (analyzePoint(b, p, c, rules).five) return p;      // win now
  const blocks = legal.filter(p => analyzePoint(b, p, op, rules).five);
  if (blocks.length) return pick(blocks);                                      // stop their five

  const L = LEVELS[level] || LEVELS.medium;
  if (!L.depth) {
    const top = legal.map(p => [quickScore(b, p, c), p]).sort((a, z) => z[0] - a[0]).slice(0, 3);
    return top[Math.floor(Math.random() * top.length)][1];
  }

  const ctx = { deadline: Date.now() + L.budget, rules, K: L.K };
  const snap = b.slice();   // a timeout unwinds mid-search, so restore rather than untangle
  const roots = legal.map(p => [quickScore(b, p, c), p]).sort((a, z) => z[0] - a[0])
    .slice(0, L.K + 4).map(e => e[1]);
  let best = roots[0];
  for (let d = 2; d <= L.depth; d += 2) {
    try {
      const order = [best, ...roots.filter(p => p !== best)];
      let a = -Infinity, bm = best;
      for (const p of order) {
        b[p] = c;
        const v = isWin(b, p, ctx.rules) ? 1e7 : -negamax(b, op, d - 1, -Infinity, -a, ctx);
        b[p] = EMPTY;
        if (v > a) { a = v; bm = p; }
      }
      best = bm;
    } catch (e) {
      b.set(snap);
      if (e !== TIMEOUT) throw e;
      break;
    }
  }
  return best;
}

/** Suggested move plus a teaching reason key. */
export function hint(b, c, rules, level = 'hard') {
  const p = bestMove(b, c, rules, level);
  if (p == null) return null;
  const op = other(c);
  const mine = analyzePoint(b, p, c, rules), theirs = analyzePoint(b, p, op, rules);
  const reason = mine.five ? 'win'
    : theirs.five ? 'blockWin'
    : mine.fours ? 'makeFour'
    : theirs.fours ? 'blockFour'
    : mine.threes ? 'makeThree'
    : theirs.threes ? 'blockThree'
    : 'develop';
  return { move: p, reason };
}

/** After `c` plays at `p`: was an obvious tactic missed? (`b` = position before the move) */
export function coach(b, p, c, rules) {
  const op = other(c);
  const win = legalMoves(b, c, rules).find(q => analyzePoint(b, q, c, rules).five);
  if (win != null && win !== p) return { key: 'missWin', at: win };
  const mine = analyzePoint(b, p, c, rules);
  if (mine.five) return null;
  b[p] = c;                                   // judge the threats that survive the move
  let five = null, four = null, three = null;
  for (const q of candidates(b)) {
    const a = analyzePoint(b, q, op, rules);
    if (a.five) { if (five == null) five = q; }
    else if (a.fours) { if (four == null) four = q; }
    else if (a.threes) { if (three == null) three = q; }
  }
  b[p] = EMPTY;
  if (five != null) return { key: 'missBlock', at: five };
  if (mine.fours) return null;                // your own four forces a reply first
  if (four != null) return { key: 'missFour', at: four };
  if (mine.threes) return null;               // trading open threes is fair
  if (three != null) return { key: 'missThree', at: three };
  return null;
}

/** Points where `c` would create a four (danger 2) or an open three (danger 1). */
export function threats(b, c, rules) {
  const out = [];
  for (const p of candidates(b)) {
    const a = analyzePoint(b, p, c, rules);
    if (a.five || a.fours) out.push([p, 2]);
    else if (a.threes) out.push([p, 1]);
  }
  return out;
}

export const label = p => 'ABCDEFGHIJKLMNO'[p % SIZE] + (SIZE - (p - p % SIZE) / SIZE);
