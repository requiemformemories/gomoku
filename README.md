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

## Notes

* Difficulty: Beginner (no search) → Normal (2 ply) → Hard (4 ply) → Expert (up to 8 ply,
  ~1.8 s per move). Each level is time-budgeted, so slower phones just search less deep.
* With all three forbidden rules on, black loses its usual winning weapons (3-3 and 4-4),
  so evenly-matched play often draws. Turn them off for free-style gomoku.
* Learning aids: per-move initiative/answer grading, an emergency-only coach, opponent
  threat marks, forbidden-point marks, move numbers, and a post-game review of your three
  best and three weakest moves — tap one to replay that position with the better point marked.
* Undo always takes you back to your own turn, so you replay the move you got wrong.
