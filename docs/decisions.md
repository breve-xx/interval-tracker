# Decisions Log

A running record of architectural, process, and technical decisions made during development. Each entry must be referenced when writing tasks, reviewing code, or making implementation choices.

---

## DEC-0001 — Unit Test Requirement for Business Logic (2026-04-30)

**Decision**: Every task that involves JavaScript business logic implementation must ship with proper unit tests covering that logic.

**Scope**: All modules in `src/js/` that contain pure or near-pure business logic (e.g. parsers, data transformers, prediction engines, service utilities). DOM-coupled code (e.g. `uiController.js`) is excluded from this mandate but may be tested where practical.

**Rationale**: Business logic is the most valuable and most fragile part of the codebase. Automated tests prevent regressions, document expected behaviour, and provide a safety net for future refactoring.

**Implementation**: See `docs/testing.md` for the canonical guide on tooling, file conventions, and how to run tests.
