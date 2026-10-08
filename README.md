# Kartičky

Czech flashcards built from my lesson notes. A static, offline-first PWA: no build tooling beyond `build.py`, no runtime dependencies, no server.

## Layout

| File | What it is |
| --- | --- |
| `decks.js` | The cards. `[Czech, English, optional note]` per card, grouped into decks. |
| `app.js` | UI, rounds, undo, storage, export/import. |
| `srs.js` | Scheduler (FSRS) and round building. Pure functions, also loaded by the tests. |
| `tests/` | `srs.test.js` (Node, no deps) and `e2e.mjs` (headless Chromium against `dist/`). |
| `style.css`, `index.html` | UI. Fonts are self-hosted in `fonts/`. |
| `sw.js` | Service worker: precaches everything, serves cache-first. |
| `build.py` | Copies the app to `dist/` and stamps `sw.js` with a content hash and the precache list. |

## How learning works

- Every card has two sides scheduled separately: recognise (CZ → EN) and produce (EN → CZ).
- Scheduling is [FSRS-5](https://github.com/open-spaced-repetition) with its default parameters (`srs.js`). "Umím" grades Good, "Znovu" grades Again. Only the first answer to a side in a round counts; a missed side repeats later in the round and is due again the next day.
- A round takes due sides first (least likely to be remembered first), then new sides, up to 20 new a day. With nothing due and no new sides left it is an extra round of the weakest sides. A round never shows both directions of one card.
- A side counts as known ("umím") at 5 days of stability. In Mix mode, a card's EN → CZ side unlocks once its CZ → EN side is known.
- Study days roll over at 4am local time.

Progress lives in `localStorage` under `stats` (FSRS state per card side), `log` (every scheduled review, for retuning the scheduler later) and `session` (the round in progress). Export/Import in the footer saves or restores `stats` and `log` as a JSON file; that is the only way to move progress between devices or origins. Stats from before FSRS (`{b, n, w, t}`) are migrated on load. Cards are keyed by `deckId|Czech text`, so changing the Czech text of a card resets its progress; adding, removing or reordering cards is safe.

## Adding a lesson

Add cards to an existing deck or a new deck object in `decks.js`, commit, push. The next launch of the installed app picks up the new version in the background, and the one after that shows it.

## Deploy

Service workers need HTTPS.

**GitHub Pages (set up):** push to `main`; `.github/workflows/pages.yml` builds and deploys. In the repo settings set Pages → Source to "GitHub Actions". For a custom domain, add it under Pages → Custom domain and point a `CNAME` record at `<user>.github.io`.

**S3:** a bare S3 website endpoint is HTTP only, so it needs CloudFront in front with an ACM certificate for the domain.

```sh
python3 build.py
aws s3 sync dist/ s3://BUCKET/ --delete
aws s3 cp dist/sw.js s3://BUCKET/sw.js --cache-control no-cache
aws cloudfront create-invalidation --distribution-id DIST_ID --paths '/*'
```

## Local

```sh
python3 build.py && python3 -m http.server -d dist 8000
```

## Tests

```sh
npm ci && npm test   # build, unit tests, then the browser test against dist/
```

The browser test uses `playwright-core`, which has no bundled browser. Locally it finds a Playwright Chromium; in CI (`CI=true`) it uses the runner's preinstalled Chrome. The deploy workflow runs both before publishing.

## License

MIT, see [LICENSE](LICENSE). The font files in `fonts/` are under the SIL Open Font License (Literata, IBM Plex).
