---
name: anomaly-detection
description: Anomaly classification, severity, confidence and priority rules for the AI Energy Platform. Applied automatically when implementing the AnomalyClassifier, SeverityCalculator, ConfidenceCalculator, PriorityCalculator or any code that consumes analytics evidence under ai-energy-platform-api/src/modules/analytics/. Complements AGENTS.md § 17–§ 20 and § 9–§ 10.
---

# Anomaly Detection Skill — AI Energy Platform

This skill is the **operational checklist** for classification and
scoring. It complements `AGENTS.md` § 9–§ 10 (critical cases) and
§ 17–§ 20 (types, severity, confidence, priority).

## 1. The five anomaly types

```
REAL_ANOMALY      real, unexplained consumption anomaly
EXPLAINABLE       real anomaly with a known operational cause
FALSE_POSITIVE    statistical deviation caused by a known benign event
DATA_QUALITY      consumption looks fine but electrical signal is unreliable
NORMAL            no anomaly detected
```

The four critical meters must map to:

| Meter | type            | severity |
|-------|-----------------|----------|
| M-104 | `EXPLAINABLE`   | `MEDIUM` |
| M-106 | `FALSE_POSITIVE`| `LOW`    |
| M-109 | `REAL_ANOMALY`  | `HIGH`   |
| M-112 | `DATA_QUALITY`  | `HIGH`   |

These mappings are **observable consequences** of the rules below — they
are not hardcoded branches keyed on meter id.

## 2. Classification rules (deterministic)

The classifier receives the analytics evidence and emits a single
`AnomalyType`. Order matters: more specific rules override more general
ones.

```
1. dataQualityScore >= DATA_QUALITY_THRESHOLD
   -> DATA_QUALITY

2. matchedEvent != null AND matchedEvent.type == 'OPERATIONAL_CHANGE'
   -> EXPLAINABLE

3. matchedEvent != null AND matchedEvent.type == 'SCHEDULED_OUTAGE'
   -> FALSE_POSITIVE

4. matchedEvent != null AND matchedEvent.type == 'DATA_QUALITY'
   -> DATA_QUALITY

5. matchedEvent != null AND matchedEvent.type == 'UNKNOWN'
   -> (fall through, treated as no operational explanation)

6. deviation present (persistent or significant) AND no rule fired above
   -> REAL_ANOMALY

7. otherwise
   -> NORMAL
```

Rule 5 is the M-109 path: the events.csv row says `UNKNOWN — No
operational event reported`. The classifier must treat that as the
absence of an operational explanation and continue to rule 6.

## 3. Severity rules

Severity is a function of `(type, deviationPct, sampleSize)`.

```
DATA_QUALITY                        -> HIGH (always — electrical signal is unreliable)
REAL_ANOMALY, |deviation| > 50%     -> HIGH
REAL_ANOMALY, 20% < |deviation|<=50%-> MEDIUM
REAL_ANOMALY, |deviation| <= 20%    -> LOW
EXPLAINABLE, 30% < deviation <= 75% -> MEDIUM
EXPLAINABLE, otherwise              -> LOW
FALSE_POSITIVE                      -> LOW (always — known benign cause)
NORMAL                              -> LOW
```

The asymmetry between `EXPLAINABLE` and `REAL_ANOMALY` thresholds
encodes the rule "explainable anomalies get lower severity than
unexplained ones at the same deviation".

## 4. Confidence

Confidence is a deterministic 0..1 score derived from evidence
**alignment**. It is **never random and never produced by an LLM**
(AGENTS.md § 20).

```
baseConfidence = 0.5

+ 0.15 if deviation window is sustained (>= 12 h)
+ 0.15 if electrical-consistency signal is present and significant
+ 0.10 if no operational event matches (stronger signal of REAL_ANOMALY)
+ 0.10 if baseline sample size >= 100

confidence = clamp(baseConfidence + bonuses, 0, 1)
```

The exact bonuses are illustrative; they live in
`confidence.calculator.ts` as named constants. The acceptance tests do
not assert exact values.

## 5. Priority

Priority ranks anomalies for investigation. AGENTS.md § 19 lists the
factors. A simple deterministic formula:

```
priority = severity                        (primary factor)
priority = HIGH if confidence >= 0.85 and severity in {HIGH, MEDIUM}
priority is otherwise unchanged
```

The acceptance tests assert that **M-109 is `HIGH` priority**. The
formula guarantees this because M-109 has `severity = HIGH`.

## 6. Why this design (rationale, must be preserved)

The pipeline yields the right answers for the four critical meters for
these reasons:

- **M-104**: pre/post mean change is +47 % and the matching event is
  `OPERATIONAL_CHANGE`, which routes to `EXPLAINABLE`. Severity is
  `MEDIUM` because the deviation is in the 30–75 % band.
- **M-106**: the 12-hour outage produces a 12-hour sustained deviation
  window with -85 % deviation. The matching event is
  `SCHEDULED_OUTAGE`, which routes to `FALSE_POSITIVE` and forces
  `severity = LOW`.
- **M-109**: the sustained jump produces a +112 % deviation window.
  The event type is `UNKNOWN`, which the classifier treats as "no
  operational explanation", so it routes to `REAL_ANOMALY` with
  `severity = HIGH`.
- **M-112**: consumption is stable so no deviation window opens.
  However, voltage / power-factor / electrical-ratio outliers produce
  a high `dataQualityScore`, which routes to `DATA_QUALITY` and forces
  `severity = HIGH` regardless of the consumption signal.

If any of these behaviours drift, the four acceptance tests fail.

## 7. Forbidden patterns

- A branch keyed on `meter.id === 'M-104'`. Never.
- Reading `expected_results.csv` to "calibrate" thresholds.
- Returning severity from a single metric (e.g. only z-score).
- Letting an LLM assign severity, confidence or priority.
- Asserting exact confidence numbers in tests.

## 8. Acceptance tests

Located at
`src/modules/analytics/__tests__/acceptance/<meter>.spec.ts`. Each test:

1. Loads the real dataset through a fixture helper.
2. Runs the analytics pipeline (via `AnalyticsService`) for that meter.
3. Asserts `anomaly.type` and `anomaly.severity` match the table in
   § 1.
4. Asserts nothing else specific (no baseline numbers, no confidence
   numbers, no z-score numbers).

A test suite run with an empty database MUST fail. A test suite run
against a fake dataset MUST fail. Determinism is the contract.

## 9. Definition of done (anomaly change)

A change is "done" only when:

1. The four acceptance tests still pass.
2. The full unit and e2e suites still pass.
3. No rule in § 7 has been violated.
4. New thresholds, if any, are added to
   `shared/constants/analytics.constants.ts` (no magic numbers).
