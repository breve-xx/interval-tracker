# Interval Tracker

A front-end-only, single-page application for analysing patterns in the timing of recurring events and predicting when the next one is likely to occur.

All data is stored locally in your browser — no backend, no sign-up required.

---

## Features

- **Paste datetime records** in any of the supported formats and have them validated, deduplicated, and stored automatically.
- **Interval statistics** — mean, median, standard deviation, variance, min/max, IQR, skewness, kurtosis, trend, and more.
- **Next-occurrence prediction** with a confidence score and window, using mean, median, or linear-regression strategies selected automatically based on the observed pattern.
- **Session management** — add individual records to an active session, start a new session, export/import as JSON, or download a Markdown report.
- **Light/dark theme** toggle, responsive layout, and an in-app statistics glossary.

---

## Supported Input Formats

All entries in a single submission must use the same format (mixed submissions are rejected).

| Format | Example |
|---|---|
| ISO 8601 with `T` | `2024-03-15T14:30:00` |
| ISO 8601 with space | `2024-03-15 14:30:00` |
| ISO date only | `2024-03-15` |
| Flexible (slash / dot / list prefix) | `15/03/2024 14:30`, `15.03.2024 14:30`, `- 20/02/2026 - 15.10` |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)

### Install dependencies

```bash
make install
```

### Run the dev server

```bash
make serve
```

This starts a Vite dev server and opens the app in your browser.

---

## Development

| Command | Description |
|---|---|
| `make serve` | Start the Vite dev server |
| `make test` | Run the full unit-test suite |
| `make test-watch` | Run tests in watch mode |
| `make coverage` | Generate a v8 coverage report |
| `make clean` | Remove `node_modules` |

---

## Project Structure

```
src/
├── index.html
├── css/
│   └── styles.css
└── js/
    ├── script.js          — DOMContentLoaded bootstrap
    ├── parser.js          — datetime text parsing
    ├── dataService.js     — localStorage I/O, deduplication, sorting
    ├── uiController.js    — DOM binding and rendering
    ├── statistics.js      — interval statistics engine
    ├── prediction.js      — next-occurrence prediction
    ├── sessionIO.js       — JSON export/import and Markdown report
    └── formatters.js      — date/time display helpers

tests/
└── unit/                  — Vitest + jsdom unit tests (195 tests, ≥ 80 % branch coverage)

docs/                      — Architecture, decisions, and task logs
```

---

## Tech Stack

- **Runtime**: Browser only (no build step required for `src/`)
- **Module system**: Native ES modules
- **Dev server**: [Vite](https://vitejs.dev/)
- **Test runner**: [Vitest](https://vitest.dev/) + jsdom
- **Coverage**: Vitest v8 provider — current overall branch coverage **91.6 %**
