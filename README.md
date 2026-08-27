# Kinsenas Command — Cebu Relocation Budget

An offline zero-based **kinsenas** (twice-monthly payday) budget, relocation cash plan,
debt payoff tracker and emergency fund planner for a ₱25,000/month income in Cebu City.

## The whole app is one file

**Open `index.html`. That's it.**

Everything — markup, styles, logic, even the icon — is inlined into a single ~67 KB
file with zero external references. It works:

- opened straight from disk, phone storage, or Google Drive
- hosted anywhere (GitHub Pages, Netlify Drop — upload the one file and you're live)
- with no server, no account, and no network calls

No install step, no build step. To edit the app, edit `index.html` in a text editor.

## Your data

Data lives in that browser's local storage on that device only — nothing syncs anywhere.
Use **Export backup** before clearing browser data and **Import backup** to move
between devices. localStorage on a `file://` page is per-browser, so export a
backup occasionally.

## Repository layout

| File | What it is |
|---|---|
| `index.html` | The entire app, self-contained in one file |
| `PLAN.md` | The full Cebu relocation financial plan the app was built around |
| `verify-app.js` | 67-assertion test suite (runs the app in jsdom) |
| `package.json` | Dev-only dependency for the test suite |

## Testing changes

```
npm install
npm test
```

All 67 assertions should pass — they cover every tab, the zero-based presets, the
forecast math, paid-item undo, live per-keystroke editing, and single-file integrity.
