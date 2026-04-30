# Testing Guide

This document is the authoritative reference for how unit tests are written, organised, and executed in this project. All contributors and AI agents must follow this guide when tasks require testing (see `docs/decisions.md` DEC-0001).

---

## Toolchain

| Concern | Tool |
|---|---|
| Test runner & assertion | [Vitest](https://vitest.dev/) |
| Module environment | `jsdom` (for tests that need a DOM surface) |
| Coverage | Vitest built-in (`v8` provider) |

**Why Vitest?** The project uses native ES modules. Vitest understands ESM natively, requires zero transpilation config, and integrates with the existing Node toolchain without a build step.

---

## Project Structure

```
interval-tracker/
├── src/
│   └── js/          ← source modules
├── tests/
│   └── unit/        ← unit test files (mirrors src/js/ structure)
├── package.json
└── vite.config.js   ← shared Vite/Vitest config
```

All test files live under `tests/unit/`. Each source module `src/js/foo.js` has a corresponding test file `tests/unit/foo.test.js`.

---

## Naming Conventions

- Test files: `<module-name>.test.js`
- `describe` blocks: named after the module or exported function under test.
- `it` / `test` labels: written as plain English behaviour statements beginning with a verb, e.g. `'returns an empty valid array for blank input'`.

---

## What Must Be Tested

Every module classified as **business logic** requires unit tests. This currently includes:

| Module | Responsibility |
|---|---|
| `src/js/parser.js` | Datetime text parsing and normalisation |
| `src/js/dataService.js` | localStorage read/write, deduplication, sorting |
| Future: `predictionEngine.js` | Statistical calculations and predictions |

**Excluded** from the mandatory scope (but testable if practical):

- `src/js/uiController.js` — DOM-coupled; test with integration/e2e tooling if needed.
- `src/js/script.js` — entry point bootstrapping only.

---

## Setup

Install dev dependencies (first time only):

```bash
npm install
```

The following packages must be present in `package.json` as `devDependencies`:

```json
{
  "vitest": "^2.0.0",
  "jsdom": "^24.0.0",
  "@vitest/coverage-v8": "^2.0.0"
}
```

A `vite.config.js` (or `vitest.config.js`) must declare:

```js
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/js/**/*.js'],
      exclude: ['src/js/script.js', 'src/js/uiController.js'],
    },
  },
});
```

---

## Running Tests

All standard test commands are exposed through the `Makefile` (see TASK-0004). Direct npm equivalents:

| Action | Command |
|---|---|
| Run all tests once | `npm test` |
| Watch mode | `npm run test:watch` |
| Coverage report | `npm run test:coverage` |

---

## Writing a Test — Example

```js
// tests/unit/parser.test.js
import { describe, it, expect } from 'vitest';
import { parseOccurrences } from '../../src/js/parser.js';

describe('parseOccurrences', () => {
  it('returns an empty valid array for blank input', () => {
    const result = parseOccurrences('');
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(0);
  });

  it('parses a valid ISO 8601 string', () => {
    const { valid, invalid } = parseOccurrences('2024-03-15T14:30:00');
    expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(0);
    expect(valid[0]).toBeInstanceOf(Date);
  });
});
```

---

## Coverage Expectations

A task is not considered complete until:

1. All business-logic exports have at least one test for each distinct behaviour (happy path + known edge cases).
2. `npm run test:coverage` reports ≥ 80 % line coverage for the modules introduced by that task.
