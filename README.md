# Save Point — Gaming Backlog & Journal

A small, responsive web app for tracking your games and keeping the moments worth remembering. Built with plain HTML, CSS, and JavaScript—no framework, build step, account, or paid service required.

## Features

- Add, edit, and delete games.
- Track platform, status, hours played, personal verdict, cover image, and notes.
- Filter by status and platform; search and sort your library.
- Write journal entries and link them to games.
- Export your library and journal to a JSON backup, and import a previous backup.
- Responsive layout for desktop and mobile.
- Data is stored in the browser with `localStorage`.

## Run it locally

1. Download or clone this repository.
2. Open `index.html` in a modern browser.

That's it. No `npm install`, no complicated ritual, no summoning circle.

For a local development server, you can also use VS Code's **Live Server** extension.

## Publish with GitHub Pages

1. Create a GitHub repository named `save-point`.
2. Upload `index.html`, `styles.css`, `app.js`, and `README.md` to the repository's root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Choose the `main` branch and `/ (root)`, then click **Save**.
6. Wait a minute and open the URL GitHub Pages displays.

## Important data note

Your data lives in the browser on the device where you use the app. It does **not** automatically sync between devices or browsers. Use **Export** regularly to save a JSON backup somewhere safe. Importing a backup replaces the current browser data, after confirmation.

Cover images are optional external URLs. If a URL stops working, the game entry remains intact.

## Suggested next upgrades

- Game cover lookup through a game database API.
- Backlog goals and completion dates.
- Custom platforms and genres.
- Review templates with separate verdicts for gameplay, story, visuals, and audio.
- Optional cloud sync, once a backend and authentication are configured.

## License

MIT. See [LICENSE](LICENSE).
