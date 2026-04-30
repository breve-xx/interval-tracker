# Task Progress Status

Documentation regarding the status of tasks.

## TASK-0001: Basic Application Scaffolding — COMPLETED (2026-04-30)

### Actions Taken
- Created `src/css/` and `src/js/` subdirectories inside `src/`.
- Created `src/index.html`: standard HTML5 boilerplate, links `css/styles.css` and `js/script.js` (ES module), includes `<div id="app-container">` placeholder.
- Created `src/css/styles.css`: universal CSS reset (`box-sizing: border-box`, margin/padding zeroed), global typography defaults, and a centered `#app-container` layout.
- Created `src/js/script.js`: `initializeApp()` function that runs on `DOMContentLoaded`, reads records from `localStorage`, logs initialization confirmation to the console, and renders a placeholder UI.

### Final State
- `src/index.html` ✅
- `src/css/styles.css` ✅
- `src/js/script.js` ✅

All checklist items from TASK-0001 are satisfied. The foundation is ready for subsequent feature tasks.

## TASK-0002: Occurrence Input, Validation, and Persistence — COMPLETED (2026-04-30)

### Actions Taken
- Created `src/js/parser.js`: exports `parseOccurrences(rawText)`. Tokenises input on newlines/commas/semicolons/pipes, normalises separators (dots, slashes), detects unambiguous dd-MM-yyyy ordering, and returns `{ valid: Date[], invalid: string[] }`.
- Created `src/js/dataService.js`: exports `loadRecords`, `saveRecords`, `addRecords`. Handles deduplication (by exact ISO string), chronological sorting, and all `localStorage` I/O.
- Created `src/js/uiController.js`: exports `initUI` (binds click and Shift-free Enter) and `renderList` (rudimentary `<li>` list). Handles partial-valid input, feedback messaging, and textarea clearing on success.
- Updated `src/index.html`: added `#occurrence-input` textarea, `#submit-occurrences` button, `#input-feedback` paragraph, `#occurrence-list` unordered list, and section headings.
- Updated `src/css/styles.css`: added structural rules for input section, textarea, submit button, feedback states (`.error` / `.success`), and minimal list row styling.
- Updated `src/js/script.js`: replaced inline localStorage call with `loadRecords()` from `dataService.js`; bootstraps `initUI()` and `renderList()` on `DOMContentLoaded`.

### Final State
- `src/js/parser.js` ✅
- `src/js/dataService.js` ✅
- `src/js/uiController.js` ✅
- `src/index.html` updated ✅
- `src/css/styles.css` updated ✅
- `src/js/script.js` updated ✅

All checklist items from TASK-0002 are satisfied. Data entry, validation, persistence, and rudimentary display are fully operational.

## TASK-0003: Unit Tests for TASK-0002 Business Logic — COMPLETED (2026-04-30)

### Actions Taken
- Initialised `package.json` (with `"type": "module"`) and installed `vitest`, `jsdom`, `@vitest/coverage-v8`, and `vite` as dev dependencies.
- Added `test`, `test:watch`, `test:coverage`, and `dev` npm scripts.
- Created `vite.config.js` configuring Vitest with the `jsdom` environment, `tests/unit/**/*.test.js` include glob, and v8 coverage scoped to `src/js/` (excluding `script.js` and `uiController.js`).
- Created `tests/unit/parser.test.js`: 22 tests covering blank/whitespace input, all five valid formats, unambiguous day-first reordering, invalid token handling, all four delimiter types, mixed valid/invalid input, and return-type guarantees.
- Created `tests/unit/dataService.test.js`: 12 tests covering `loadRecords` (empty, populated, malformed JSON, non-array), `saveRecords` (persist, overwrite, clear), and `addRecords` (add, deduplicate, sort, merge, empty input).

### Final Coverage (v8)
- `parser.js`: 94.59 % statements, 97.05 % lines, 100 % functions
- `dataService.js`: 95 % statements, 94.11 % lines, 100 % functions
- **Overall: 94.73 % statements, 96.07 % lines — exceeds the ≥ 80 % mandate.**
- All 34 tests pass (`npm test` exits 0).

### Final State
- `package.json` ✅
- `vite.config.js` ✅
- `tests/unit/parser.test.js` ✅
- `tests/unit/dataService.test.js` ✅

## TASK-0004: Makefile for Common Development Operations — COMPLETED (2026-04-30)

### Actions Taken
- Created `Makefile` at the project root with targets: `help` (default, awk-based self-documentation), `install`, `serve` (Vite dev server with `--open`), `test`, `test-watch`, `coverage`, `clean`.
- `serve`, `test`, `test-watch`, and `coverage` targets declare `node_modules` as a prerequisite, triggering `npm install` automatically if absent.
- `make help` output verified to print all targets with descriptions correctly.
- `make test` verified to delegate to Vitest and exit 0 with all 34 tests passing.

### Final State
- `Makefile` ✅
- `make` (bare) prints help ✅
- All targets functional ✅

## Parser Enhancement: Homogeneous Input & New Formats — COMPLETED (2026-04-30)

### Context
Enhancement to `src/js/parser.js` implementing DEC-0002 and adding the `list-dmy-slash` format (e.g. `- 20/02/2026 - 15.10`).

### Actions Taken

**Docs**
- Added `DEC-0002` to `docs/decisions.md`: homogeneous input mandate, format id table, enforcement strategy.
- Updated `docs/context.md`: replaced abstract input description with concrete format list and homogeneity requirement.

**Source**
- Rewrote `src/js/parser.js`: replaced the normalise-and-try heuristic with an explicit ordered list of format handlers (`FORMATS`), each with `id`, `detect`, and `parse`. Added `_buildDate` helper to avoid JS engine ambiguity with space-separated date strings. `parseOccurrences` now returns `{ valid, invalid, homogeneous, formatId }`.
- New `list-dmy-slash` handler parses `- DD/MM/YYYY - HH.MM` (and `HH:MM`) entries, with `*` and `•` accepted as list markers. Day-first order is always respected regardless of day value (no ambiguity).
- Updated `src/js/uiController.js`: added `homogeneous` check between parse and persist — surfaces a blocking error message if formats are mixed, without saving any records.

**Tests**
- Updated `tests/unit/parser.test.js`: 56 tests (up from 34), all passing. New groups:
  - `list-dmy-slash format` — single entry, correct component extraction, ambiguous-day correctness, full 8-entry sample block, colon time separator, `*` and `•` markers.
  - `homogeneity` — same-format homogeneous, single token, all-invalid vacuous, four cross-format rejection cases, null `formatId` on mixed, populated `valid` when not homogeneous.
  - `optional time component` — `dmy-slash` and `dmy-dot` date-only, with-seconds variants.
  - `detect-matches-but-parse-fails` — impossible dates (month=13, day=32) land in `invalid`.

### Final Coverage
- `parser.js`: 94.64 % statements, 81.25 % branches, 100 % functions, 100 % lines
- `dataService.js`: 95 % statements, 87.5 % branches, 100 % functions
- **Overall: 94.73 % statements, 82.5 % branches — above ≥ 80 % mandate.**
- All 56 tests pass (`npm test` exits 0).

## Parser Enhancement: Flexible Format Rewrite — COMPLETED (2026-04-30)

### Context
The `list-dmy-slash`, `dmy-slash`, and `dmy-dot` format handlers were replaced by a single `flexible` handler capable of accepting any single-character date separators and any multi-character date–time gap. Time is required for `flexible`; date-only tokens without an ISO prefix resolve to `invalid`.

### Actions Taken

**Source**
- Rewrote `src/js/parser.js`: replaced three format handlers with a single `flexible` handler using detection regex `/\d{1,2}.\d{1,2}.\d{4}.+\d{1,2}.\d{2}/` and parse regex `/(\d{1,2}).(\d{1,2}).(\d{4}).+?(\d{1,2}).(\d{2})(?:.(\d{2}))?/`. Day/month disambiguation: if first group > 12 it is the day; if second group > 12 it is the day; otherwise European default (first group = day).
- Updated `docs/decisions.md` DEC-0002 format table: old `list-dmy-slash`, `dmy-slash`, `dmy-dot` rows replaced with single `flexible` row.

**Tests**
- Fully rewrote `tests/unit/parser.test.js` to match new handler set. All 60 tests pass.

### Final Coverage (2026-04-30)
- `parser.js`: 98.14 % statements, 85.18 % branches, 100 % functions, 100 % lines
- `dataService.js`: 95 % statements, 87.5 % branches, 100 % functions
- **Overall: 97.29 % statements, 85.71 % branches — above ≥ 80 % mandate.**
- All 60 tests pass (`npm test` exits 0).

## TASK-0005: Recorded Occurrences Display Section — COMPLETED (2026-04-30)

### Actions Taken

**Source**
- Added `clearRecords()` to `src/js/dataService.js`: removes the localStorage key entirely.
- Created `src/js/formatters.js`: pure formatting helpers `formatOccurrenceDate(date)` → `dd/MM/yyyy`, `formatOccurrenceTime(date)` → `HH:mm` (24 h), `formatOccurrenceTell(date)` → `The Nth of Month at HH:mm` with correct English ordinal suffixes including the 11th/12th/13th exception.
- Rewrote `src/js/uiController.js`: imports formatters and `clearRecords`; `renderList` now builds `<li class="occurrence-card">` cards with primary (date + time) and accessory (tell) layers, and toggles `#occurrences-section` visibility via the `.hidden` class. Added `initNewSessionBtn()`: two-step confirmation guard (first click changes button label to "Confirm — this will erase all data"; second click executes; clicking elsewhere cancels).
- Updated `src/index.html`: replaced the old `#list-section` / `<ul>` with `#occurrences-section` (initially `.hidden`) containing an `<ol id="occurrence-list">` and `#new-session-btn`.
- Updated `src/css/styles.css`: added `.hidden` utility class; removed old list-row styles; added `.occurrence-card`, `.occurrence-card__primary`, `.occurrence-card__date`, `.occurrence-card__time`, `.occurrence-card__tell` card styles; added `#new-session-btn` muted/destructive styling with `.new-session-btn--confirm` variant.

**Tests**
- Created `tests/unit/formatters.test.js`: 27 tests covering `formatOccurrenceDate` (zero-padding, midnight, noon), `formatOccurrenceTime` (24 h, midnight, noon, zero-padding), and `formatOccurrenceTell` (all ordinal suffix cases including 11/12/13 exception, all 12 month names, embedded time).
- Updated `tests/unit/dataService.test.js`: added 3 tests for `clearRecords` (returns empty after clear, key absent from localStorage, no-throw on empty store).

### Final Coverage (2026-04-30)
- `dataService.js`: 95.23 % statements, 87.5 % branches, 100 % functions
- `parser.js`: 98.14 % statements, 85.18 % branches, 100 % functions, 100 % lines
- `formatters.js`: 100 % statements, 100 % branches, 100 % functions, 100 % lines
- **Overall: 97.91 % statements, 88.37 % branches — above ≥ 80 % mandate.**
- All 87 tests pass (`npm test` exits 0).
