# Kartičky: notes for agents

Czech flashcards for one learner (Erik, A1), built from his teacher's lesson notes. Static offline-first PWA, no backend. Live at https://karticky.weuts.dev. Read `README.md` for the file layout and `docs/HANDOVER.md` for context, decisions, content sources and the roadmap.

## Working on it

- `npm ci && npm test` builds `dist/`, runs the unit tests (`tests/srs.test.js`) and the headless-browser test (`tests/e2e.mjs`). If Chromium doesn't launch because its version differs from what `playwright-core` expects, run with `CHROME_PATH=/path/to/chrome`.
- Always test the built `dist/`, never the source: `sw.js` is a template (`__VERSION__`, `__FILES__`) and `index.html` has a `__COMMIT__` placeholder.
- Pushing to `main` deploys (`.github/workflows/pages.yml` runs the tests first). Confirm a deploy by checking that the footer of the live page shows the new short commit hash.
- Check every UI change with screenshots at phone size (390 px wide, heights 640, 694 and 763 px), in both light and dark mode. Erik notices layout shifts.
- Keep explanations to Erik short; give trade-offs briefly. He is an experienced engineer.

## Rules for cards (`decks.js`)

- A card is `[Czech, English, optional note]`. Its identity is `deckId|Czech text`: changing the Czech text resets that card's progress, while changing the English side, the note, or the order of cards is safe.
- One word or phrase per card. Put contrasts, counterparts and other forms in the note, never on the card itself: with both on the card, he answers one from the other without recalling it.
- Every noun carries ten/ta/to (ti/ty for plurals: ti lidé, ty peníze). Plural-only nouns get a note (ta záda, ta ústa).
- Make the English side unambiguous for EN → CZ: say formal/informal, man/woman, kde?/kam?, "back (body part)" vs "back (return)".
- Cards that give each other away go in one `RELATED` group (bottom of `decks.js`). A round takes at most one card from each group.
- Use A1 level and plain English glosses. Silently fix teacher typos.
- The repo is public: keep personal details out of cards and docs (address, family, teacher's contact details, private doc IDs).
- Use single words and short phrases from the textbook. Never copy whole exercises or images into the repo.

## Don't regress

- The card's size is set by the layout (a CSS grid), never by its content. The footer is pinned to the bottom. During a round, the answer row keeps its space even before you flip. On the start and Hotovo screens (`.wrap.idle`), the card takes over the answer row, and the start button sits inside the card, in its original style.
- The start panel is top-aligned. Direction and deck choice are locked during a round. Undo (Zpět) is hidden on the start screen but kept on Hotovo. Ruled card lines are a fixed 32 px tile.
- Service worker: it precaches with `cache: "reload"`, because GitHub Pages sends `max-age=600`. The commit hash is part of the cache version. When a new version takes over, the app reloads, but only off a round.
- Scheduling is FSRS-5 in `srs.js`. Only a side's first answer in a round counts. A missed side is due the next day. Rounds go due → new (20 a day) → weakest, filled to the chosen size. The Mix unlock (EN → CZ opens once CZ → EN is known) is something Erik chose. Every scheduled review is logged in `log` so the scheduler can be retuned later.
