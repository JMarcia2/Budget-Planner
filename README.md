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

All 87 assertions should pass — they cover every tab, the zero-based presets, the
forecast math, paid-item undo, live per-keystroke editing, **undoable ✕ deletes**
(budget lines and ledger entries via the on-screen Undo snackbar), the SVG charts
and switch widgets, and single-file integrity.

## Feature highlights

- **Mark-as-paid → undo.** Every `paid` button flips into a `↩ undo` button on the
  same row — on the Dashboard and the Move-In Plan — so a mis-tap costs nothing.
- **Live totals while typing.** Every editable amount (move-in lines, budget
  categories, income, debt paid, emergency-fund fields) updates every total,
  %, chart and warning on the page on each keystroke. Changed stat tiles pulse
  so you can see exactly what moved.
- **Undoable ✕ delete in the Kinsenas Budget.** Removing a category (or deleting a
  Ledger entry) drops a slide-in **Undo** snackbar. Click Undo to restore the line
  at its original position and total; after 7 seconds the deletion sticks.
- **Styled graphics.** Single-file design refresh: gradient glass cards, an SVG
  area chart for the cash-flow forecast, a gradient debt-clearance ring, animated
  toggles, shimmering progress bars, live-update badges, an SVG logo and a
  polished undo snackbar — all inline, still zero external files.
