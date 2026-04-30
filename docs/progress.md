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

## TASK-0006: Statistics Engine — COMPLETED (2026-04-30)

### Actions Taken

**Source**
- Created `src/js/statistics.js`: exports `computeStatistics(occurrences)`. Accepts ISO strings or Date objects; returns `null` for fewer than 2 occurrences. Returns `{ unit, count, basic, advanced, nerd }` with all interval values pre-scaled to the auto-selected unit (days / hours / minutes based on median interval). Internal helpers: `msToUnit`, `selectUnit`, `median`, `quartile`, `linearRegression`, `r2Score`.
  - **Basic**: `intervalCount`, `mean`, `min`, `max`, `range`, `first`, `last`, `totalSpan`.
  - **Advanced**: `median`, `stdDev`, `variance`, `cv`, `regularityLabel` (very regular / regular / irregular / highly irregular), `q1`, `q3`, `iqr`, `trend` (increasing / decreasing / stable via linear regression slope threshold of 5% of mean).
  - **Nerd**: `mad`, `skewness`, `kurtosis`, `outliers` (Tukey fences), `outlierCount`, `longestStreak`, `regressionSlope`, `regressionIntercept`, `r2`.
- Updated `src/js/uiController.js`: added `renderStatistics()` which calls `computeStatistics`, hides `#statistics-section` when result is null, otherwise renders three `<div>` subsections (Basic / Advanced / Nerd) each with a `<dl>` of key–value pairs. `renderStatistics()` is called from `renderList()` and the New Session reset. Added `computeStatistics` import.
- Updated `src/index.html`: added `<section id="statistics-section" class="hidden">` with `<div id="statistics-output">` below `#occurrences-section`.

**Tests**
- Created `tests/unit/statistics.test.js`: 43 tests across guard conditions, unit selection, basic level, advanced level (spread, trend, regularity labels), nerd level (mad, outliers, streaks, regression, r²), and skewness/kurtosis sign correctness. All use deterministic fixed datasets.

### Final Coverage (2026-04-30)
- `statistics.js`: 100 % statements, 97.61 % branches, 100 % functions, 100 % lines
- `dataService.js`: 95.23 % statements, 87.5 % branches, 100 % functions
- `parser.js`: 98.14 % statements, 85.18 % branches, 100 % functions, 100 % lines
- `formatters.js`: 100 % statements, 100 % branches, 100 % functions, 100 % lines
- **Overall: 99.01 % statements, 92.94 % branches — above ≥ 80 % mandate.**
- All 130 tests pass (`npm test` exits 0).

## TASK-0007: Prediction Engine & Display — COMPLETED (2026-04-30)

### Actions Taken

**Source**
- Created `src/js/prediction.js`: exports `predictNext(occurrences)`. Imports `computeStatistics` internally. Strategy selection: `trend === 'stable'` + very/regular → `'mean'`; stable + irregular/highly irregular → `'median'`; trending → `'regression'` (slope × N_intervals + intercept, clamped to ≥ 1 minute). Confidence score formula: `clamp(round(max(0, 100 − cv) + min(10, (count−2)×2) − (outlierCount/intervalCount)×30), 0, 100)`. Confidence labels: ≥ 75 → `'high'`, 40–74 → `'moderate'`, < 40 → `'low'`. Window: predicted ± 1 stdDev in ms; `earliestDate` clamped to `lastTimestamp + 1ms`. Returns `{ predictedDate, earliestDate, latestDate, confidence, confidenceLabel, strategy, intervalUsedMs }` (all dates as ISO strings).
- Updated `src/js/uiController.js`: added `import { predictNext } from './prediction.js'`; added `renderPrediction()` which hides `#prediction-section` when result is null, otherwise renders predicted date, window, confidence score/label, strategy, and interval used (in minutes) as a `<dl>`; wired `renderPrediction()` into `renderList()` (both the empty and populated paths) and the New Session confirm handler.
- Updated `src/index.html`: added `<section id="prediction-section" class="hidden">` with `<div id="prediction-output">` below `#statistics-section`.

**Tests**
- Created `tests/unit/prediction.test.js`: 27 tests across guard conditions, strategy selection, predicted date properties, confidence score, confidence label, confidence window ordering/clamping, and regression interval clamping. Fixed the `IRREGULAR` dataset (was alternating 1d/30d which produced a positive regression slope; replaced with symmetric `[30d, 1d, 1d, 30d]` yielding slope = 0 and CV ≈ 93 % → truly "highly irregular + stable").

### Final Coverage (2026-04-30)
- `prediction.js`: 93.47 % statements, 84.21 % branches, 100 % functions, 95 % lines
- `statistics.js`: 100 % statements, 97.61 % branches, 100 % functions, 100 % lines
- `dataService.js`: 95.23 % statements, 87.5 % branches, 100 % functions
- `parser.js`: 98.14 % statements, 85.18 % branches, 100 % functions, 100 % lines
- `formatters.js`: 100 % statements, 100 % branches, 100 % functions, 100 % lines
- **Overall: 98 % statements, 91.34 % branches — above ≥ 80 % mandate.**
- All 157 tests pass (`npm test` exits 0).

## TASK-0008: Session-Aware Application Workflow — COMPLETED (2026-04-30)

### Actions Taken

**Docs**
- Added `DEC-0003` to `docs/decisions.md`: session-aware workflow mandate, two mutually exclusive UI modes (no-session / active-session), session definition (non-empty `loadRecords()`), single-occurrence rule.

**Source**
- Added `getLastRecord()` to `src/js/dataService.js`: returns the ISO string of the last (newest) persisted record, or `null` if the store is empty.
- Updated `src/index.html`: added `<section id="single-add-section" class="hidden">` between `#input-section` and `#occurrences-section`, containing a text `<input id="single-occurrence-input">`, `<button id="add-single-btn">`, and `<p id="single-add-feedback">`.
- Rewrote `src/js/uiController.js`:
  - Added `import { getLastRecord }` from `dataService.js`.
  - Added `setSingleFeedback` / `clearSingleFeedback` helpers for the new feedback element.
  - Added `applySessionMode(active)`: toggles `.hidden` on `#input-section` (hidden when active) and `#single-add-section` (hidden when inactive).
  - Updated `renderList()` to call `applySessionMode(records.length > 0)` in all code paths before returning.
  - Added `handleSingleAdd()`: validates that exactly one datetime was entered, that it parses successfully, and that its ISO string is strictly greater than `getLastRecord()`; shows descriptive errors in `#single-add-feedback` otherwise; on success calls `addRecords` and `renderList()`.
  - Added `initSingleAddSection()`: wires `#add-single-btn` click and `Enter` keydown on `#single-occurrence-input` to `handleSingleAdd()`.
  - Updated New Session confirm handler to also clear `#single-occurrence-input` and `#single-add-feedback`.
  - Updated `initUI()` to call `initSingleAddSection()` and `renderList()` (which applies session mode on page load).
- Added CSS rules to `src/css/styles.css` for `#single-add-section`, `.single-add-row`, `#single-occurrence-input`, `#add-single-btn`, and `#single-add-feedback` (mirrors the layout and colour conventions of `#input-section`).

**Tests**
- Updated `tests/unit/dataService.test.js`: added import of `getLastRecord`; added 4 new tests (`returns null on empty store`, `returns ISO string for single record`, `returns most recent of multiple records`, `equals last element of loadRecords()`).

### Final Coverage (2026-04-30)
- `dataService.js`: 95.65 % statements, 90 % branches, 100 % functions
- `parser.js`: 98.14 % statements, 85.18 % branches, 100 % functions, 100 % lines
- `prediction.js`: 93.47 % statements, 84.21 % branches, 100 % functions
- `statistics.js`: 100 % statements, 97.61 % branches, 100 % functions, 100 % lines
- **Overall: 98.01 % statements, 91.5 % branches — above ≥ 80 % mandate.**
- All 161 tests pass (`npm test` exits 0).

## TASK-0009: Export / Import Session — COMPLETED (2026-04-30)

### Actions Taken

**Docs**
- Added `DEC-0004` to `docs/decisions.md`: v1 export file format (`version`, `exportedAt`, `occurrences`, `statistics`, `prediction`); import consumes only `occurrences` and recomputes everything fresh; `version` field enables future migrations.

**Source**
- Created `src/js/sessionIO.js`: pure module (no DOM/localStorage dependencies) exporting two functions:
  - `buildExportPayload(occurrences, statistics, prediction)` — assembles the v1 snapshot object with `version: 1`, `exportedAt: new Date().toISOString()`, and the three provided values.
  - `parseImportPayload(jsonString)` — validates the raw file content through six ordered checks (valid JSON → plain object → version === 1 → occurrences is array → non-empty → all elements are valid datetime strings) and returns `{ ok: true, occurrences }` or `{ ok: false, error }`.
- Updated `src/index.html`:
  - Wrapped `#new-session-btn` in a `<div class="session-actions">` and added `<button id="export-session-btn">` alongside it inside `#occurrences-details`.
  - Added `.import-row` (label + `<input type="file" id="import-file-input">`) and `<p id="import-feedback">` inside `#input-section`, below the existing feedback paragraph.
- Updated `src/js/uiController.js`:
  - Added `import { buildExportPayload, parseImportPayload } from './sessionIO.js'`.
  - Added `setImportFeedback(message, type)` feedback helper for `#import-feedback`.
  - Added `handleExport()`: calls `loadRecords()`, `computeStatistics()`, `predictNext()`, `buildExportPayload()`; triggers a Blob download named `interval-tracker-YYYY-MM-DD.json`.
  - Added `handleImport(file)`: reads the file via `FileReader`, calls `parseImportPayload()`; on failure surfaces the error in `#import-feedback` and resets the file input; on success calls `clearRecords()`, `addRecords(imported)`, resets the file input, and calls `renderList()`.
  - Wired `#export-session-btn` click → `handleExport` and `#import-file-input` change → `handleImport` inside `initUI()`.
- Updated `src/css/styles.css`:
  - Added `.session-actions` flex row (replaces bare `margin-top` on `#new-session-btn`).
  - Added `#export-session-btn` styles (blue, hover darker blue).
  - Added `.import-row`, `.import-label`, `#import-feedback` styles.

**Tests**
- Created `tests/unit/sessionIO.test.js`: 21 tests across three groups:
  - `buildExportPayload` — version, exportedAt validity, occurrences passthrough, statistics/prediction with and without null.
  - `parseImportPayload — valid` — well-formed payload, ignored fields, single entry, various ISO formats.
  - `parseImportPayload — invalid` — non-JSON, JSON array, JSON null, missing version, version 2, occurrences not array, empty array, non-string element, invalid date string, error message includes offending index.

### Final Coverage (2026-04-30)
- `sessionIO.js`: 100 % statements, 100 % branches, 100 % functions, 100 % lines
- `dataService.js`: 95.65 % statements, 90 % branches, 100 % functions
- `parser.js`: 98.14 % statements, 85.18 % branches, 100 % functions, 100 % lines
- `prediction.js`: 93.47 % statements, 84.21 % branches, 100 % functions
- `statistics.js`: 100 % statements, 97.61 % branches, 100 % functions, 100 % lines
- **Overall: 98.14 % statements, 92.56 % branches — above ≥ 80 % mandate.**
- All 182 tests pass (`npm test` exits 0).

## TASK-0010: Markdown Report Download — COMPLETED (2026-04-30)

### Actions Taken

**`src/js/sessionIO.js`**
- Added three private helpers: `isoToDate(iso)` (formats ISO date part as DD/MM/YYYY), `isoToTime(iso)` (extracts HH:MM from ISO datetime, returns `—` for date-only), `buildMdTable(obj)` (renders a `| Metric | Value |` Markdown table from an object, joining arrays with `, ` or `—`).
- Added and exported `buildMarkdownReport(occurrences, statistics, prediction)`: pure function, no DOM or localStorage dependencies. Produces a UTF-8 Markdown document following the template defined in TASK-0010 §1. Statistics and Prediction sections omitted entirely when their arguments are null.

**`src/index.html`**
- Added `<button id="download-report-btn" type="button">Download Report</button>` inside `.session-actions` alongside the existing Export Session and New Session buttons.

**`src/js/uiController.js`**
- Added `buildMarkdownReport` to the import from `./sessionIO.js`.
- Added `handleDownloadReport()`: loads records, computes statistics and prediction live, calls `buildMarkdownReport`, creates a `text/markdown` Blob and triggers a download named `interval-tracker-report-YYYY-MM-DD.md`.
- Wired `#download-report-btn` click → `handleDownloadReport` inside `initUI()`.

**`src/css/styles.css`**
- Added `#download-report-btn` styles: green (`#27ae60`), hover darker green (`#1e8449`), matching the export button pattern.

**Tests**
- Extended `tests/unit/sessionIO.test.js` with 13 new tests in a `buildMarkdownReport` describe block covering: non-empty string return, title presence, Occurrences heading, every row rendered, count in header, Statistics section present/absent, Basic/Advanced/Nerd subsections, Prediction section present/absent, confidence score+label rendered, single-occurrence edge case (both null), interval in minutes.

### Final Coverage (2026-04-30)
- `sessionIO.js`: 98.43 % statements, 92 % branches, 100 % functions, 100 % lines
- `dataService.js`: 95.65 % statements, 90 % branches, 100 % functions
- `parser.js`: 98.14 % statements, 85.18 % branches, 100 % functions, 100 % lines
- `prediction.js`: 93.47 % statements, 84.21 % branches, 100 % functions
- `statistics.js`: 100 % statements, 97.61 % branches, 100 % functions, 100 % lines
- **Overall: 98.1 % statements, 91.6 % branches — above ≥ 80 % mandate.**
- All 195 tests pass (`npm test` exits 0).

## TASK-0011: Complete Application Layout Makeover — COMPLETED (2026-04-30)

### Actions Taken

**`docs/decisions.md`**
- Added DEC-0005 logging the Lucide Icons CDN glyph library choice and the CSS custom-property dual-theme system (light/dark).

**`src/index.html`** — restructured:
- Added Google Fonts `<link>` for **Inter** (400–700).
- Added `<header class="app-header">` with brand text and `#theme-toggle-btn`.
- No-session state wrapped in a `.onboard` card with a clear title, lead line, textarea, CTA button, and an understated import row.
- Active-session `#single-add-section` converted to an **ops bar** containing the single-add input+button on the left and New Session / Export / Report action buttons on the right (`.session-actions` removed from `#occurrences-details`).
- `#occurrences-details` starts **closed** (no `open` attribute).
- Section order: ops bar → prediction → statistics → occurrences.
- Lucide CDN UMD `<script>` added before `</body>`.
- Icons declared as `<i data-lucide="name">` throughout.

**`src/css/styles.css`** — full rewrite:
- CSS custom properties for light palette on `:root`; dark palette override on `[data-theme="dark"]`.
- Shared button system: `.btn--primary`, `.btn--secondary`, `.btn--ghost`, `.icon-btn`.
- `.onboard` centered card for the no-session state.
- `.ops-bar` horizontal strip with flex wrap for the active-session controls.
- `.pred-hero` large surface card: display-size tell text, date+time pair, `.confidence-badge` color-coded by level (high/medium/low), window range with icon, secondary `.chip` elements for strategy and interval.
- Statistics: `.stats-tabbar` + `.stats-tab` (accent underline on active) + `.stats-panel` (only active panel displayed) + `.stats-grid` auto-fill tile grid + `.stats-tile` (label/value stacked).
- Occurrences: `<details>` custom summary with chevron icon, `.occ-row` slim three-column grid (index | date+time | tell).
- `@media (max-width: 640px)` responsive overrides: ops bar stacks, prediction font scales down, stats grid collapses to two columns, occurrence rows reflow.

**`src/js/uiController.js`** — updated:
- New helpers: `refreshIcons()`, `humaniseKey(key)`, `fmtVal(v)`, `round2(n)`, `confidenceClass(score)`.
- `initTheme()`: reads `localStorage`/`prefers-color-scheme`, sets `data-theme` on `<html>`, wires toggle button.
- `updateThemeBtn(theme)`: swaps icon between `moon` and `sun`.
- `buildCardHTML(iso, idx)` → slim `.occ-row` rows with 1-based index.
- `renderList()`: passes index to `buildCardHTML`; calls `refreshIcons()`.
- `buildStatsGrid(obj)`: renders `.stats-grid` of `.stats-tile` elements using `humaniseKey` + `fmtVal`.
- `renderStatistics()`: emits stats-header, tabbar, three panels; wires tab click handlers; calls `refreshIcons()`.
- `renderPrediction()`: emits `.pred-hero` card with all fields, confidence badge, window, chips; calls `refreshIcons()`.
- `initNewSessionBtn()`: confirm label updated to use icon markup.
- `initUI()`: calls `initTheme()` first, then full wiring as before; `refreshIcons()` at end.
- Feedback class strings updated to preserve `.feedback` base class.

### Final Coverage (2026-04-30)
- All business-logic modules unchanged; coverage identical to TASK-0010.
- **Overall: 98.1 % statements, 91.6 % branches — above ≥ 80 % mandate.**
- All 195 tests pass (`npm test` exits 0).
