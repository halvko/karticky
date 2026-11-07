# Handover

Context that the code alone doesn't tell you. `CLAUDE.md` has the working rules; `README.md` has the file layout and how the learning works.

## Who it's for

- Erik is an experienced software engineer and a beginner (A1) Czech learner in Prague. He has a teacher and lessons several times a week.
- He drills on his phone, mostly in the installed PWA, often in short gaps (e.g. while getting dressed). Anything that needs less willpower to start helps.
- He gives nit-level UI feedback: layout shifts, inconsistent styling and misleading controls get noticed. Show him screenshots or the live result rather than describing changes.
- He prefers decisions with short trade-offs, and wants to be asked before anything outward-facing (sharing, publishing, deleting).

## Where the cards come from

- **The teacher's lesson log**, a Google Doc that Erik has view access to. Its ID is in the project instructions, not here, because the repo is public. Each lesson is a date heading followed by revision exercises, links and a SLOVÍČKA (vocabulary) list. Cards have been added from every lesson **up to and including 5. listopadu 2026**.
  - Read the text with the Google Drive connector's `read_file_content`. It returns plain text, but images become blank lines.
  - Don't use the Google Docs connector's `read_doc`: it returns huge formatting JSON and cuts off after the first page.
  - **Images** hold most of the textbook pages and homework. The connector refuses to export files over ~10 MB, and the doc is ~50 MB. What worked:
    1. Copy the doc into Erik's Drive (`copy_file`).
    2. Share the copy as anyone-with-link (`share_file`, `permissionId: "anyoneWithLink"`).
    3. `curl` `https://docs.google.com/document/d/<copyId>/export?format=zip` to disk, giving HTML plus `images/`.
    4. Map each image to the date heading above it.
    5. The connector **cannot turn link sharing off or delete permanently**, and trashing the copy does not close the link. Erik has to delete it from his Drive trash. Ask him before doing this.
  - Alternatively, Erik can send phone screenshots of the parts he cares about.
- **Textbook PDFs in Erik's Drive**: učebnice (textbook), pracovní sešit (workbook) and gramatika (grammar). IDs are in the project instructions. The textbook series is Čeština expres 1 / Česky krok za krokem, plus Czech It Up 1. `read_file_content` gives the text of lessons 1–2 only. The homework pages are often from a newer edition than these PDFs.
- **Wordwall games** linked in the doc: the resource page's HTML contains the word list in plain text (`curl` the page and strip tags).
- **Textbook audio**: tracks at `https://www.czechstepbystep.cz/coLm4dEPxQE9/uploads/2019/10/track-NN.mp3`. These transcribe well with faster-whisper's `medium` model on CPU (`language="cs"`). Decode with ffmpeg to 16 kHz mono f32 yourself, because faster-whisper's own decoder failed with the installed PyAV. Fix obvious recognition slips (`piešky` → `pěšky`).
- When new notes appear, add cards to the matching deck, or a new deck per lesson or topic. Skip words that already have a card (check with grep first), and update the footer's date range in `index.html`.

## Decisions and why

- **Two directions per card, scheduled separately.** The Mix mode nudge: a card's EN → CZ side unlocks once CZ → EN is known. Erik chose this over a manual switch; there are no popups.
- **FSRS-5 with default parameters** replaced a Leitner box system. Erik picked it after it was explained as "not a black box, but intervals you can't read off". Only two grades are used: Znovu = Again, Umím = Good. Old `{b,n,w,t}` stats migrate on load (`srs.js`).
- **Rounds** always fill to the chosen size: due cards first, then new cards (cap 20 a day), then the weakest cards. Without the top-up, the second round of a day could be 1 card.
- **Related groups and one word per card** came from Erik noticing that seeing *vlevo* makes *vpravo* easy, and that "venku / doma" on one card meant he never really learned either.
- **No backend, no accounts.** Progress is per-device `localStorage`, with Export/Import (JSON) as backup and the way to move it. A Safari tab and the installed app don't share storage on iOS.
- **Version marker:** the footer shows the short commit hash, so Erik can tell whether his phone has updated.
- **Tests run before every deploy.** CI uses `playwright-core` with the runner's preinstalled Chrome, so there's no browser download.
- The old single-file version (a claude.ai artifact) still exists on purpose: the teacher shares it with other students. It has generic sentences, not Erik's personal ones. Don't delete it.

## Open questions (asked, not yet answered)

- Split singular/plural cards (ta ruka, ruce → ta ruka with "ruce" in the note) and question–answer cards (Rozumíte? – Rozumím.) the same way as the other pairs?
- The Lekce 2 deck has 84 cards. Split it into topic decks (places, getting around, verbs)?

## Roadmap

### 1. Pull requests with CI and a review bot (suggested first)

Today every change is pushed straight to `main` and deployed. Proposal:

- Split the workflow: a `test` job on `push` and `pull_request`, and a `deploy` job that `needs: test` and runs only on `main`.
- Turn on branch protection for `main`: require the test check and a PR.
- Add a review bot on PRs. One option is Claude Code's GitHub integration: install the Claude GitHub app on `halvko/karticky` and add the action with an API key secret. This needs Erik, because it means installing an app and adding a secret.
- Agents then work on branches, open PRs with screenshots of UI changes, and Erik merges from his phone.

### 2. Gamification: variety and surprise, so practice needs less willpower

Erik's idea is a slot-machine feel ("what kind of game will I get now? shinies?") on top of the spaced repetition, plus more context per word. Design constraints that matter:

- **Grading honesty:** FSRS assumes free recall. Recognition formats (multiple choice, matching) are easier, so either don't let them update the schedule, or count a correct answer as weaker evidence and a wrong one as Again. Free-recall formats (flip card, typing) stay the ones that drive scheduling.
- Keep it offline, with no backend, and no layout shifts (see the rules in `CLAUDE.md`).

Ideas, roughly by value for effort:

- **Random exercise type per card** (the slot machine):
  - the classic flip card
  - multiple choice (4 options from the same deck)
  - typing the Czech, with gentle feedback on diacritics (č vs c counts as almost right)
  - listening (tap to hear, pick the meaning)
  - gender tap (ten / ta / to)
  - letter scramble (like the teacher's "HLVAA → hlava")
  - quick matching of 5 pairs
  - fill-in-the-sentence using the card's example from its note
- **Variable rewards:**
  - a rare "shiny" card (gold border, bonus points)
  - combo counter
  - daily goal ring and streak
  - a round-end reveal with a random small unlock (card themes, ruled-paper colours, a Czech proverb)
  - Keep it cosmetic. Never gate learning behind it.
- **Context:**
  - more example sentences per word (teacher's sentences from the notes first)
  - show which lesson and date a card came from
  - mini dialogues from the textbook audio transcripts as cloze exercises
  - word families (učit → učitel → učitelka → učebnice)
- **Light progress feedback:** per-deck mastery, "words you know" count, a weekly recap.

Start small: random exercise type plus shiny cards would test whether it actually lowers the activation energy before building more.

### 3. Smaller things

- A test that every `RELATED` entry matches a card, and that no Czech text is duplicated within a deck (the check exists as an ad-hoc script; make it part of `npm test`).
- Pin the `playwright-core` version to match the CI runner's Chrome, or keep the `CHROME_PATH` escape hatch documented.
