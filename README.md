# Gomoku Trainer / 五子棋練習

Static page — no build step, no dependencies, no server. The AI runs in the browser,
so GitHub Pages is all you need.

* `index.html` — UI, i18n (中文 / EN), rendering
* `engine.js` — renju rules, forbidden-move detection, AI, hint/coach analysis
* `test.mjs` — self-check for the rules and the AI (`node test.mjs`)

## Run locally

```sh
python3 -m http.server 8000   # ES modules need http://, file:// won't load
```

## Deploy to GitHub Pages

```sh
git init && git add . && git commit -m "gomoku trainer"
gh repo create gomoku --public --source=. --push
```

Then Settings → Pages → Source: *Deploy from a branch*, branch `main` / `/ (root)`.

## Notes

* Difficulty: Beginner (no search) → Normal (2 ply) → Hard (4 ply) → Expert (up to 8 ply,
  ~1.8 s per move). Each level is time-budgeted, so slower phones just search less deep.
* With all three forbidden rules on, black loses its usual winning weapons (3-3 and 4-4),
  so evenly-matched play often draws. Turn them off for free-style gomoku.
