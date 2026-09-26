---
name: testing
description: Testing rules for the AI Energy Platform. Applied automatically when writing or reviewing tests under ai-energy-platform-api/ or ai-energy-platform-app/. Complements AGENTS.md with project-specific testing patterns.
---

# Testing Skill — AI Energy Platform

This skill is the **operational checklist** for writing tests on this
project. It complements `AGENTS.md` § 36 with file-level patterns.

## 1. Frameworks

- Backend: **Jest** with `@nestjs/testing` for module wiring.
- Frontend: **Jest** + **React Testing Library** for component tests.
- One runner across the project. Do not introduce Vitest, Mocha, or any
  second framework.

## 2. Test layering

Tests are layered; each layer has a different scope and cost.

| Layer             | Scope                                              | Speed      |
|-------------------|----------------------------------------------------|------------|
| Unit              | One class or pure function in isolation            | Fast       |
| Integration       | Service + repository with a real or in-memory DB   | Medium     |
| Acceptance        | End-to-end analytics pipeline on the real dataset  | Slower     |
| E2E (optional)    | Full HTTP request through NestJS                   | Slowest    |

Most tests should be unit. The four critical-meter acceptance tests are
**mandatory** and live in their own folder.

## 3. Folder layout

```
src/modules/<name>/
  <unit>.spec.ts                    co-located with the unit
  __tests__/
    fixtures/                       shared CSV / data fixtures
    acceptance/
      m-104.spec.ts
      m-106.spec.ts
      m-109.spec.ts
      m-112.spec.ts
```

If a component has multiple sub-components, prefer one `*.spec.ts` per
sub-component (e.g. `baseline.calculator.spec.ts`,
`spike.detector.spec.ts`) rather than a single mega-test.

## 4. Structure: Arrange / Act / Assert

Every test follows the AAA pattern with visible separators:

```ts
describe('BaselineCalculator', () => {
  it('returns the per-hour-of-day mean of stable readings', () => {
    // Arrange
    const readings = makeReadings([...]);
    const calc = new BaselineCalculator();

    // Act
    const baseline = calc.compute(readings);

    // Assert
    expect(baseline.byHourOfDay[9]).toBeCloseTo(51.0, 1);
  });
});
```

No `it.each` blocks with more than 5 cases that hide intent.

## 5. Coverage targets by component

| Component                 | Cases that MUST be tested                                 |
|---------------------------|-----------------------------------------------------------|
| `BaselineCalculator`      | empty input, stable input, mixed stable+outlier input     |
| `SpikeDetector`           | no spike, single spike, sustained spike window            |
| `PersistentDeviationDetector` | no deviation, transient blip, sustained shift         |
| `OutlierDetector`         | nominal readings, V outlier, PF outlier, current outlier  |
| `ElectricalConsistencyChecker` | consistent data, M-112-style inconsistency           |
| `DataQualityAnalyzer`     | clean meter, M-112-style noise                            |
| `EventCorrelator`         | no event, event matches window, event outside window      |
| `AnomalyClassifier`       | the 4 critical cases + at least one NORMAL meter          |
| `SeverityCalculator`      | the 4 critical cases + a low-severity path                |
| `ConfidenceCalculator`    | aligned signals vs single weak signal                     |
| `PriorityCalculator`      | HIGH / MEDIUM / LOW bucketing                             |
| `StubDeterministicProvider` | each anomaly type + insufficient-evidence path          |
| Controllers               | happy path, validation error, 404, 500 mapped error      |

## 6. Critical acceptance tests (mandatory)

Located in `src/modules/analytics/__tests__/acceptance/`. Each one:

- Loads the **real** `data/readings.csv` and `data/events.csv` through
  a shared fixture helper.
- Runs the analytics pipeline (or the relevant sub-pipeline).
- Asserts **only** the category and severity bucket:
  - `M-104` → `EXPLAINABLE`, `MEDIUM`
  - `M-106` → `FALSE_POSITIVE`, `LOW`
  - `M-109` → `REAL_ANOMALY`, `HIGH`
  - `M-112` → `DATA_QUALITY`, `HIGH`
- Does **not** assert exact numerical values (baseline, z-score,
  deviation percentage, confidence).
- Does **not** read `expected_results.csv` under any circumstance.

These tests guard the four evaluation scenarios in `AGENTS.md` § 4.

## 7. Determinism

- No `Date.now()`, no `Math.random()`, no real-time clock reads in tests.
  Inject a clock provider if needed.
- No dependency on external services. The `OpenAIProvider` is never used
  in tests; only `StubDeterministicProvider`.
- No filesystem access unless the test is explicitly an integration test
  on the seed. Otherwise build in-memory fixtures.

## 8. Fixtures and builders

- Use **factory functions**, not class hierarchies with inheritance:
  `makeReading({ meterId: 'M-101', timestamp: ..., kwh: ... })`.
- Prefer `partial<>` overrides; provide sensible defaults for all other
  fields so tests focus on the variables that matter.
- One fixture file per module; do not duplicate builders.

## 9. What NOT to test

- Implementation details (private fields, internal helper order).
- Third-party library behavior.
- Trivial getters and pass-through methods.
- Re-declaring TypeScript's type system in tests (e.g. asserting
  `typeof x === 'number'`).

## 10. Mocking rules

- Mock at the **boundary** (repository, LLM provider, clock), not deep
  inside a service.
- Prefer hand-rolled fakes over `jest.mock` when the surface is small.
  Hand-rolled fakes are easier to read and refactor.
- When `jest.spyOn` is used, restore the spy at the end of the test
  (`afterEach(() => jest.restoreAllMocks())`).

## 11. Coverage expectations

- Analytics components: **100 %** line coverage is realistic and
  expected; they are pure logic.
- Services: ≥ 80 % line coverage.
- Controllers: tested through the service contract; HTTP-layer tests
  are nice-to-have, not required for every endpoint.
- The whole project must remain ≥ 70 % lines covered.

## 12. Definition of done (tests)

A test change is "done" only when:

1. It follows AAA.
2. It tests behavior, not implementation.
3. It is deterministic (no real clock, no real network).
4. It uses real data only where the data is the spec (the 4 acceptance
   tests); everywhere else, in-memory fixtures are fine.
5. It runs in isolation and in the full suite.
