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
