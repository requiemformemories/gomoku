// Self-check for the rules + AI. Run: node test.mjs
import assert from 'node:assert';
import { newBoard, idx, SIZE, BLACK, WHITE, forbidden, isWin, winLine, bestMove, analyzePoint, coach,
         hint, fiveThreats, tempo, review, label } from './engine.js';

const ALL = { doubleThree: true, doubleFour: true, overline: true };
const FREE = { doubleThree: false, doubleFour: false, overline: false };
const put = (b, c, ...pts) => { for (const [x, y] of pts) b[idx(x, y)] = c; return b; };

// 3-3: two open threes meeting at (7,7)
let b = put(newBoard(), BLACK, [5, 7], [6, 7], [7, 5], [7, 6]);
assert.equal(forbidden(b, idx(7, 7), ALL), 'doubleThree');
assert.equal(forbidden(b, idx(7, 7), FREE), null);
assert.equal(forbidden(b, idx(7, 7), { ...ALL, doubleThree: false }), null);

// a single open three is fine
b = put(newBoard(), BLACK, [5, 7], [6, 7]);
assert.equal(forbidden(b, idx(7, 7), ALL), null);

// 4-4: two straight fours meeting at (7,7)
b = put(newBoard(), BLACK, [4, 7], [5, 7], [6, 7], [7, 4], [7, 5], [7, 6]);
assert.equal(forbidden(b, idx(7, 7), ALL), 'doubleFour');
assert.equal(forbidden(b, idx(7, 7), { ...ALL, doubleFour: false }), null);

// overline: six in a row is a foul for black, a win in free-style
b = put(newBoard(), BLACK, [3, 7], [4, 7], [5, 7], [6, 7], [8, 7]);
assert.equal(forbidden(b, idx(7, 7), ALL), 'overline');
assert.equal(forbidden(b, idx(7, 7), FREE), null);
b[idx(7, 7)] = BLACK;
assert.equal(isWin(b, idx(7, 7), ALL), false, 'six is not a win under renju');
assert.equal(isWin(b, idx(7, 7), FREE), true, 'six wins in free-style');

// exactly five wins either way, and the winning run is reported for the highlight
b = put(newBoard(), BLACK, [3, 7], [4, 7], [5, 7], [6, 7], [7, 7]);
assert.equal(isWin(b, idx(7, 7), ALL), true);
assert.deepEqual(winLine(b, idx(7, 7), ALL).map(label), ['D8', 'E8', 'F8', 'G8', 'H8']);
assert.equal(winLine(newBoard(), idx(7, 7), ALL), null, 'an empty point never wins');

// white is never restricted
b = put(newBoard(), WHITE, [5, 7], [6, 7], [7, 5], [7, 6]);
assert.equal(analyzePoint(b, idx(7, 7), WHITE, ALL).threes, 2);
assert.equal(forbidden(b, idx(7, 7), ALL), null, 'forbidden() only judges black');

// AI takes the win
b = put(newBoard(), BLACK, [5, 5], [6, 5], [7, 5], [8, 5]);
put(b, WHITE, [4, 5], [4, 6], [5, 6]);
assert.equal(bestMove(b, BLACK, ALL, 'medium'), idx(9, 5), 'AI should play the winning point');

// AI blocks the only completing point
b = put(newBoard(), WHITE, [5, 5], [6, 5], [7, 5], [8, 5]);
put(b, BLACK, [4, 5], [7, 8]);
assert.equal(bestMove(b, BLACK, ALL, 'medium'), idx(9, 5), 'AI should block');

// AI never returns a forbidden point for black
b = put(newBoard(), BLACK, [5, 7], [6, 7], [7, 5], [7, 6]);
put(b, WHITE, [10, 10], [11, 11]);
assert.notEqual(bestMove(b, BLACK, ALL, 'hard'), idx(7, 7));

// the coach flags an opponent open three the player walked past...
b = put(newBoard(), WHITE, [6, 7], [7, 7], [8, 7]);
put(b, BLACK, [0, 0]);
let note = coach(b, idx(14, 14), BLACK, ALL);
assert.equal(note?.key, 'missOpenThree');
assert.ok(['F8', 'J8'].includes(label(note.at)), label(note.at));

// ...but not a closed three, which is answerable and only costs tempo
b = put(newBoard(), WHITE, [6, 7], [7, 7], [8, 7]);
put(b, BLACK, [5, 7]);
assert.equal(coach(b, idx(14, 14), BLACK, ALL), null, 'a blocked three is not an emergency');

// a four with one end walled off must be answered, and ignoring it is the mistake
b = put(newBoard(), WHITE, [6, 7], [7, 7], [8, 7], [9, 7]);
put(b, BLACK, [5, 7], [0, 0]);
assert.equal(coach(b, idx(14, 14), BLACK, ALL)?.key, 'missBlock');

// but a straight four cannot be blocked, so the blocking move is not the mistake
b = put(newBoard(), WHITE, [6, 7], [7, 7], [8, 7], [9, 7]);
put(b, BLACK, [0, 0]);
assert.equal(coach(b, idx(5, 7), BLACK, ALL)?.key, 'tooLate');
assert.equal(coach(b, idx(10, 7), BLACK, ALL)?.key, 'tooLate', 'either end is equally futile');

// taking your own win beats warning about theirs
b = put(newBoard(), BLACK, [3, 7], [4, 7], [5, 7], [6, 7]);
put(b, WHITE, [6, 9], [7, 9], [8, 9]);
assert.equal(coach(b, idx(14, 14), BLACK, ALL)?.key, 'missWin');
assert.equal(coach(b, idx(7, 7), BLACK, ALL), null, 'no nagging when you did win');

// a straight four is unanswerable, and the hint must say so instead of naming a futile block
b = put(newBoard(), WHITE, [6, 7], [7, 7], [8, 7], [9, 7]);
put(b, BLACK, [3, 3], [4, 4]);
assert.deepEqual(fiveThreats(b, WHITE, ALL).map(label), ['F8', 'K8']);
assert.equal(hint(b, BLACK, ALL, 'medium').reason, 'lost');

// a four with one end walled off is still worth blocking
b = put(newBoard(), WHITE, [6, 7], [7, 7], [8, 7], [9, 7]);
put(b, BLACK, [5, 7], [3, 3]);
assert.equal(fiveThreats(b, WHITE, ALL).length, 1);
assert.equal(hint(b, BLACK, ALL, 'medium').reason, 'blockWin');

// your own five beats their straight four — you move first
b = put(newBoard(), WHITE, [6, 7], [7, 7], [8, 7], [9, 7]);
put(b, BLACK, [1, 2], [1, 3], [1, 4], [1, 5]);
assert.equal(hint(b, BLACK, ALL, 'medium').reason, 'win');

// tempo: did the move force a reply?
b = put(newBoard(), BLACK, [6, 7], [7, 7]);
assert.equal(tempo(b, idx(8, 7), BLACK, ALL), 'attack', 'making an open three is 先手');
assert.equal(tempo(b, idx(0, 0), BLACK, ALL), 'idle', 'a corner move forces nothing');
b = put(newBoard(), WHITE, [6, 7], [7, 7], [8, 7]);
assert.equal(tempo(b, idx(5, 7), BLACK, ALL), 'defend', 'blocking an open three is a needed answer');
// taking away a point they would have made an open three on is slow but not nothing
b = put(newBoard(), WHITE, [6, 7], [7, 7]);
assert.equal(tempo(b, idx(8, 7), BLACK, ALL), 'prevent');

// post-game review: black makes an open three, then ignores white's
const game = [[7, 7], [7, 8], [8, 7], [8, 8], [9, 7], [9, 8], [0, 0]].map(([x, y]) => idx(x, y));
const rv = review(game, ALL, BLACK);
assert.equal(rv.moves, 4, 'four black moves in a seven-ply game');
assert.ok(rv.best.some(m => m.key === 'three' && label(m.p) === 'J8'), JSON.stringify(rv.best));
assert.ok(rv.worst.some(m => m.key === 'missOpenThree' && label(m.p) === 'A15'), JSON.stringify(rv.worst));
assert.ok(rv.worst.every(m => m.at !== m.p), 'never suggest the move that was actually played');
assert.ok(rv.best.every(m => m.score > 0) && rv.worst.every(m => m.score < 0));

// regression: a real game a user disputed. White (the player) is the human.
// ply 28 I10 blocks nothing — black completing row 10 there would be an overline foul —
// while black's split three in file H was the move that had to be answered.
const plies = ['H8','G9','I9','G7','G8','I8','F8','E8','J10','F9','K11','L12','G10','E9',
               'D9','E7','E10','F7','D7','I7','H7','E6','E5','D8','F10','D10','H10','I10',
               'H9','H11','H6'].map(sq => idx('ABCDEFGHIJKLMNO'.indexOf(sq[0]), SIZE - +sq.slice(1)));
const upto = n => { const bd = newBoard(); for (let i = 0; i < n; i++) bd[plies[i]] = i % 2 ? WHITE : BLACK; return bd; };
assert.deepEqual(winLine(upto(31), plies[30], ALL).map(label), ['H10', 'H9', 'H8', 'H7', 'H6']);
assert.equal(forbidden(upto(27), idx(8, 5), ALL), 'overline', 'black at I10 would make six');
assert.deepEqual(fiveThreats(upto(27), BLACK, ALL), [], 'so black had no five-point there');
assert.deepEqual(fiveThreats(upto(29), BLACK, ALL).map(label).sort(), ['H11', 'H6'], 'straight four');

const real = review(plies, ALL, WHITE);
const byMove = Object.fromEntries(
  [...real.best, ...real.worst].map(m => [label(m.p), m.key]));
assert.equal(byMove.I10, 'missOpenThree', 'blocking a foul point while a three grows is the mistake');
assert.ok(!('H11' in byMove), 'the futile block is not blamed: ' + JSON.stringify(byMove));
assert.ok(!('D8' in byMove), 'denying an open-three point is not "did nothing": ' + JSON.stringify(byMove));

assert.equal(label(idx(7, 7)), 'H8');
console.log('all ok');
