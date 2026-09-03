# Gomoku Trainer / 五子棋練習

**Live: <https://fumitsuki.tw/gomoku/>**

Static page — no build step, no dependencies, no server. The AI runs in the browser,
so GitHub Pages is all you need.

* `index.html` — UI, i18n (中文 / EN), rendering
* `engine.js` — renju rules, forbidden-move detection, AI, hint/coach/review analysis
* `test.mjs` — self-check for the rules and the AI (`node test.mjs`)

## Run locally

```sh
python3 -m http.server 8000   # ES modules need http://, file:// won't load
```

## Deploy

GitHub Pages serves `main` at the repo root — `git push` is the whole deploy step.

## Sharing a game

A game is a URL: `?g=H8,G9,I9&r=111&s=b` — the moves in play order, the three forbidden
rules as on/off flags, and which side you played. Plain coordinates rather than an encoding:
a full 225-move game is under 900 characters, the record stays readable in a bug report and
editable by hand, and old links keep working because the notation cannot drift. Rules from a
link apply to that visit only and never overwrite your saved settings; a record that does not
parse is rejected whole. **Copy game link** in the footer puts that URL on the clipboard and
in the address bar, so a refresh or a bookmark keeps the game even if the clipboard is denied.

## Reporting

The footer links open a prefilled GitHub issue. The bug link carries that replay URL plus
settings, viewport and build date, so the exact game can be reopened in one click — it goes
into GitHub's editor first, where you can read and edit every line before submitting.
Nothing is collected by the page itself; there is no form and no backend.

## Notes

* Difficulty: Beginner (no search) → Normal (2 ply) → Hard (4 ply) → Expert (up to 8 ply,
  ~1.8 s per move). Each level is time-budgeted, so slower phones just search less deep.
* With all three forbidden rules on, black loses its usual winning weapons (3-3 and 4-4),
  so evenly-matched play often draws. Turn them off for free-style gomoku.
* Learning aids: per-move initiative/answer grading, an emergency-only coach, opponent
  threat marks, forbidden-point marks, move numbers, and a post-game review of your three
  best and three weakest moves.
* When a game ends the board becomes a replay: it plays through the game on its own, and the
  transport controls (or the slider) hand it back to you. Review rows jump the replay to that
  move and mark the point that would have been better.
* Undo always takes you back to your own turn, so you replay the move you got wrong.
* Appearance (collapsed by default): five board skins (slate, wood, kifu paper, neon,
  mono), four stone sets (classic, neon, jade, sunset) chosen independently of the board,
  and a placement effect — off, pop, ripple, sparkles or rainbow ring. Every setting
  persists in localStorage.
