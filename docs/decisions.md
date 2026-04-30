# Decisions Log

A running record of architectural, process, and technical decisions made during development. Each entry must be referenced when writing tasks, reviewing code, or making implementation choices.

---

## DEC-0001 — Unit Test Requirement for Business Logic (2026-04-30)

**Decision**: Every task that involves JavaScript business logic implementation must ship with proper unit tests covering that logic.

**Scope**: All modules in `src/js/` that contain pure or near-pure business logic (e.g. parsers, data transformers, prediction engines, service utilities). DOM-coupled code (e.g. `uiController.js`) is excluded from this mandate but may be tested where practical.

**Rationale**: Business logic is the most valuable and most fragile part of the codebase. Automated tests prevent regressions, document expected behaviour, and provide a safety net for future refactoring.

**Implementation**: See `docs/testing.md` for the canonical guide on tooling, file conventions, and how to run tests.

---

## DEC-0002 — Homogeneous Input Requirement (2026-04-30)

**Decision**: When a user submits multiple occurrence tokens in a single input, all tokens must belong to the same detected format. Mixed-format submissions must be rejected with a descriptive error. A single token is trivially homogeneous and always accepted.

**Rationale**: Allowing mixed formats creates ambiguity that is impossible to resolve reliably (e.g. `01/02/2026` means Jan 2 in MM/DD and Feb 1 in DD/MM). Enforcing homogeneity makes the parser's intent unambiguous and prevents silent data corruption.

**Implementation**: `parser.js` assigns a format identifier (`formatId`) to each successfully parsed token using an explicit set of format handlers (detect + parse). If multiple distinct `formatId` values appear across the tokens of a single submission, `parseOccurrences` returns `homogeneous: false` and the `uiController` surfaces a blocking error without persisting any records.

**Supported format identifiers** (as of this decision):


| `formatId` | Example | Notes |
|---|---|---|
| `iso-T` | `2024-03-15T14:30:00` | ISO 8601 with `T` separator |
| `iso-space` | `2024-03-15 14:30:00` | ISO 8601 with space separator |
| `iso-date` | `2024-03-15` | ISO 8601 date-only |
| `flexible` | `- 20/02/2026 - 15.10`, `15/03/2024 14:30`, `15.03.2024 14:30` | Any 1-char date separators, any multi-char date–time gap, time required. Replaces former `list-dmy-slash`, `dmy-slash`, `dmy-dot`. |

---

## DEC-0003 — Session-Aware Workflow (2026-04-30)

**Decision**: The UI is always in one of two mutually exclusive modes:

- **No-session mode**: The batch textarea + submit button are visible. All other
  sections (occurrences, statistics, prediction, single-add) are hidden.
- **Active-session mode**: The batch textarea is hidden entirely. The occurrences,
  statistics, and prediction sections are shown (subject to their own data guards).
  A compact "add single occurrence" field is shown.

**Session definition**: a session is active when `loadRecords()` returns a non-empty
array. There is no separate session flag; the presence of data is the session.

**Single-occurrence rule**: while a session is active the user may add one occurrence
at a time. The submitted value must parse as a valid, unambiguous datetime and must be
strictly after the last persisted record. If either condition fails the input is rejected
with a descriptive error message and nothing is persisted.

**Rationale**: Separating the two modes prevents the ambiguity of half-populated
sessions, avoids mixed-format accidents on append, and makes the intended usage flow
self-evident from the UI state alone.

---

## DEC-0004 — Export/Import File Format (2026-04-30)

**Decision**: Session snapshots are exported as UTF-8 JSON files with the
following top-level shape:

```json
{
  "version": 1,
  "exportedAt": "<ISO 8601 UTC string>",
  "occurrences": [ "<ISO string>", "…" ],
  "statistics": "<object returned by computeStatistics(), or null>",
  "prediction": "<object returned by predictNext(), or null>"
}
```

On **export**: all fields are populated from live data at the moment of the download.  
On **import**: only `occurrences` is consumed. `statistics` and `prediction` are
ignored; they are always recomputed from the occurrence list.

**Rationale**: Including derived data makes the file a self-contained, human-readable
record useful for sharing or auditing without running the app. Ignoring it on import
guarantees that calculations always reflect the current engine version, fulfilling the
"recalculate" requirement for free.

**Version field**: a `version` integer allows future format migrations. The current
importer must reject any file where `version !== 1` with a descriptive error.
