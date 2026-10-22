# Save Point — Gaming Backlog & Journal

[![CI](https://github.com/Vexnik/save-point/actions/workflows/ci.yml/badge.svg)](https://github.com/Vexnik/save-point/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A small, responsive web app for tracking your games and keeping the moments worth remembering. Built with plain HTML, CSS, and JavaScript: no framework, build step, account, or paid service required.

**Live demo:** https://vexnik.github.io/save-point/

<!-- Add a screenshot to docs/screenshot.png, then uncomment the line below:
![Save Point screenshot](docs/screenshot.png)
-->

## Features

- Add, edit, and delete games.
- Track platform, status, hours played, personal verdict, cover image, and notes.
- Filter by status and platform; search and sort your library.
- Write journal entries and link them to games.
- Export your library and journal to a JSON backup, and import a previous backup.
- Imported and saved data is validated, so a hand-edited or damaged file can't break the app.
- Stays in sync across open tabs.
- Responsive layout for desktop and mobile.
- Installable and works offline (PWA): add it to your home screen or desktop from your browser menu.

## Run it locally

1. Download or clone this repository.
2. Open `index.html` in a modern browser.

That's it. No `npm install`, no complicated ritual, no summoning circle.

For a local development server, you can also use VS Code's **Live Server** extension.

## Publish your own copy with GitHub Pages

1. **Fork** this repository (or create a new one and upload `index.html`, `styles.css`, `app.js`, and `README.md`).
2. Open **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Choose the `main` branch and `/ (root)`, then click **Save**.
5. Wait a minute, then open `https://<your-username>.github.io/<repo-name>/`.

## Your data and privacy

Everything lives in your browser's `localStorage` on the device you use. Nothing is sent to a server, and there are no accounts or tracking.

- Data does **not** sync between devices or browsers. Use **Export** regularly to keep a JSON backup somewhere safe.
- **Import** replaces the data currently saved in the browser, after confirmation. Invalid items in a backup are skipped, and the confirmation tells you how many.
- If saved data ever becomes unreadable, the app starts empty but keeps the damaged copy under the `save-point-data-v1-unreadable` storage key instead of overwriting it.
- Cover images are optional external URLs. If a URL stops working, the game entry remains intact.
- Clearing your browser's site data deletes your library, so export first.
- The offline cache only holds the app itself, never your data, and cover images still need a connection.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Page markup and dialogs |
| `styles.css` | Styling and responsive layout |
| `app.js` | App logic: storage, validation, rendering, import/export |
| `sw.js` | Service worker for offline support (bump `CACHE` when you add files) |
| `manifest.webmanifest` | Install metadata for the PWA |
| `icons/` | App and favicon icons |

## Roadmap

- Game cover lookup through a game database API.
- Backlog goals and completion dates.
- Custom platforms and genres.
- Review templates with separate verdicts for gameplay, story, visuals, and audio.
- Optional cloud sync, once a backend and authentication are configured.

Ideas and bug reports are welcome in [Issues](https://github.com/Vexnik/save-point/issues).

## License

MIT. See [LICENSE](LICENSE).
