<div align="center">
  <img src="assets/mark.svg" width="76" alt="Stillday logo" />
  <h1>Stillday</h1>
  <p><strong>A calm, local-first focus desk for Windows.</strong></p>
  <p>Choose one thing. Work in a gentle interval. Keep the loose thoughts nearby.</p>
</div>

<img width="1298" height="862" alt="{A9188C18-9169-4F09-B203-38A17C172872}" src="https://github.com/user-attachments/assets/bd23a6c2-257c-4743-879d-5328a85d07c2" />


## Why Stillday

Productivity software often becomes another place to maintain. Stillday is intentionally smaller: a focus timer, a gentle task queue, a scratchpad, and just enough history to notice momentum. There is no account, cloud, analytics, or subscription.

## Highlights

- Focus, short-break, and long-break intervals
- A small daily task queue with per-task focus counts
- An autosaving scratchpad for thoughts that should not interrupt the session
- Seven-day focus history, daily goals, and streaks
- Light and dark themes
- Local JSON backup and restore
- Keyboard shortcuts (`Space` to start/pause, `N` for a new task)
- Fully local storage and a strict Electron security boundary

## Install

Download the latest Windows installer from [Releases](https://github.com/ZenCodeOrSomeShit/stillday/releases/latest), run it, and choose where Stillday should live. The installer can add desktop and Start Menu shortcuts and includes a standard uninstaller.

> Windows may show a SmartScreen warning because this independent release is not code-signed. Choose **More info → Run anyway** if you trust the downloaded release.

## Development

Requires Node.js 20 or newer.

```bash
npm install
npm test
npm start
```

Build the Windows installer with `npm run dist`. The installer is written to `dist/`.

## Data and privacy

Stillday stores its state in Electron's local application storage. It makes no network requests. Exporting a backup creates a human-readable JSON file at a location you choose.

## License

[MIT](LICENSE)
