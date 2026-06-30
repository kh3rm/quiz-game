# Quiz

A very small static PWA pub-quiz app intended for GitHub Pages.

## Files

- `index.html` — app shell and header/navigation.
- `styles.css` — responsive styling.
- `app.js` — gameplay, category selection, played-question state.
- `quiz-data.js` — quiz object, enriched with stable `id` and `played: false` per question.
- `manifest.webmanifest` — PWA metadata.
- `sw.js` — service worker for offline caching.
- `assets/hero.webp` — header artwork.
- `assets/icons/*` — PWA icons.
- `.nojekyll` — keeps GitHub Pages from applying Jekyll processing.

## Gameplay

There are two main views:

- `#football` / **Fotbollsquiz**: uses only the football categories.
- `#quiz` / **Quiz**: custom mode where categories can be selected.

At start the user chooses:

- number of questions in the round,
- whether to use only unplayed questions.

Questions are shuffled automatically for every round after category and unplayed filters have been applied.

During play:

- the question is shown first,
- answer is shown/hidden with a toggle button,
- previous/next arrows move through the round,
- progress is shown as `Fråga X av Y`.

A question is marked as played as soon as it is shown. The source object has `played: false`, but the actual persistent state is stored as a list of question IDs in `localStorage`, because a static GitHub Pages site cannot rewrite `quiz-data.js` on the user's device.
