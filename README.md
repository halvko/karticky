# Kartičky

Czech flashcards built from my lesson notes. A static, offline-first PWA: no build tooling beyond `build.py`, no dependencies, no server.

## Layout

| File | What it is |
| --- | --- |
| `decks.js` | The cards. `[Czech, English, optional note]` per card, grouped into decks. |
| `app.js` | Rounds, weighted card picking, per-card levels, undo, storage. |
| `style.css`, `index.html` | UI. Fonts are self-hosted in `fonts/`. |
| `sw.js` | Service worker: precaches everything, serves cache-first. |
| `build.py` | Copies the app to `dist/` and stamps `sw.js` with a content hash and the precache list. |

## How learning works

- Every card has two sides tracked separately: recognise (CZ → EN) and produce (EN → CZ), each with a level 0–6.
- "Umím" on the first try in a round moves a side up one level; "Znovu" drops it two and repeats it later in the round.
- Rounds draw cards at random, weighted toward low levels and cards not seen for a while.
- In Mix mode, a card's EN → CZ side unlocks once its CZ → EN side reaches level 3.

Progress lives in `localStorage` under `stats` (per card side) and `session` (the round in progress). Cards are keyed by `deckId|Czech text`, so changing the Czech text of a card resets its progress; adding, removing or reordering cards is safe.

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
