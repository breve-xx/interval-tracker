
# Technical Guide for AI Agent

## Core Competencies
This agent possesses advanced skills across:
*   HTML (Structure and Semantics)
*   CSS (Styling and Layout using best practices)
*   JavaScript (Client-side logic, focusing on modern ES module standards)

## Knowledge Sources
All project-specific knowledge, guidelines, and domain details are stored within the `docs/` folder.

| File | Purpose |
|---|---|
| `docs/architecture.md` | Overall structure, data flow, and front-end-only constraints |
| `docs/context.md` | Application domain: what the app does, supported input formats, homogeneity rules |
| `docs/decisions.md` | Architectural and technical decisions log (DEC-XXXX). **Must be consulted before making any design choice.** |
| `docs/testing.md` | Authoritative guide for the test toolchain, conventions, coverage expectations, and how to run tests |
| `docs/tasks/` | One file per task (TASK-XXXX.md). Contains goal, implementation steps, and completion checklist |
| `docs/progress.md` | Running log of completed work and current coverage metrics |

There is no `docs/process.md`. The workflow mandate is contained in this file (see Operational Mandate below).

## Current Stack

*   **Runtime**: Browser only — no backend, no build step required for `src/`
*   **Persistence**: `localStorage` API
*   **Module system**: Native ES modules (`import`/`export`)
*   **Dev server**: Vite (`make serve`)
*   **Test runner**: Vitest + jsdom (`make test`)
*   **Coverage**: Vitest v8 provider (`make coverage`) — mandate is ≥ 80 % branches

## Source Layout

```
src/
├── index.html
├── css/
│   └── styles.css
└── js/
    ├── script.js          — entry point (DOMContentLoaded bootstrap only)
    ├── parser.js          — datetime text parsing; returns { valid, invalid, homogeneous, formatId }
    ├── dataService.js     — localStorage I/O, deduplication, chronological sorting
    └── uiController.js    — DOM binding and rendering

tests/
└── unit/
    ├── parser.test.js
    └── dataService.test.js
```

## Supported Input Formats (parser.js)

| `formatId` | Example |
|---|---|
| `iso-T` | `2024-03-15T14:30:00` |
| `iso-space` | `2024-03-15 14:30:00` |
| `iso-date` | `2024-03-15` |
| `flexible` | `15/03/2024 14:30`, `15.03.2024 14:30`, `- 20/02/2026 - 15.10` |

All tokens in a single submission must share the same `formatId` (DEC-0002). Mixed submissions are rejected without persisting any data.

## Operational Mandate
1.  **Context Understanding**: Before any code modification, read the relevant files in `docs/` — at minimum `docs/decisions.md` and the specific task file in `docs/tasks/`.
2.  **Task Execution**: Pending tasks are in `docs/tasks/`. Each file defines the goal, step-by-step implementation instructions, and a final-state checklist. A task is complete only when every checklist item is satisfied.
3.  **Testing**: Every module containing business logic must ship with unit tests (DEC-0001). See `docs/testing.md` for conventions. Coverage must not drop below 80 % branches after any task.
4.  **Tracking & Reporting**: After completing a task, append an entry to `docs/progress.md` recording actions taken and final coverage numbers.
5.  **Code Quality**: All generated code must use ES module syntax, be idiomatic, and follow the patterns established in the existing source files.

**Goal**: To serve as a super skilled, self-documenting developer, ensuring that every action taken is traceable, compliant, and contributes to the overall project goal.
