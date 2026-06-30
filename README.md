# Quiz

A very small static PWA quiz app intended for GitHub Pages. No build step, no backend, no Supabase.

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

## Deploy to GitHub Pages

1. Create a new GitHub repository.
2. Copy all files from this folder into the repository root.
3. Commit and push.
4. In GitHub, open **Settings → Pages**.
5. Choose deployment from your branch, usually `main`, root folder `/`.
6. Wait for GitHub Pages to publish the site.

## Local testing

Do not open `index.html` with `file://` if you want to test PWA/offline behavior. Run a local web server instead:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

The service worker works on `localhost` and on HTTPS hosts such as GitHub Pages.

## Editing questions

Edit `quiz-data.js`. Keep each question's `id` stable if you want existing played-state to remain meaningful. If you heavily reorder or replace questions, consider changing the storage key in `app.js` so old played-state is ignored.


## Version note

This version has two visual modes: the general quiz uses the lighter header/theme, while `#football` uses `assets/football-hero.webp` and a darker Sweden/football theme. The football view only exposes football categories for round construction.

If a browser keeps showing an older cached PWA, open `reset-cache.html`, then return to the app and reload.
