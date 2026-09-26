# Data Analysis — AI Energy Platform

This document captures the **real findings** from inspecting the supplied
dataset (`data/readings.csv` and `data/events.csv`). It is the source of
truth used to design the analytics pipeline implemented in later phases.

The file `expected_results.csv` is reserved for evaluator validation only
and was **never** read, copied, or referenced during this analysis.

---

## 1. Dataset overview

### 1.1 `readings.csv`

| Property             | Value                                       |
|----------------------|---------------------------------------------|
| Total rows           | 4,032                                       |
| Columns              | 7                                           |
| Granularity          | 1 reading per meter per hour                |
| Date range           | 2026-09-01 00:00 — 2026-09-14 23:00         |
| Days covered         | 14                                          |
| Meters               | 12 (`M-101` … `M-112`)                      |
| Readings per meter   | 336 (14 × 24)                               |

**Columns**

| Column            | Type     | Min      | Max       | Mean    | Median  | Nulls |
|-------------------|----------|----------|-----------|---------|---------|-------|
| `consumption_kwh` | float    | 7.39     | 117.51    | 38.50   | 35.72   | 0     |
| `voltage_v`       | float    | 201.56   | 241.23    | 220.46  | 220.46  | 0     |
| `current_a`       | float    | 38.72    | 507.43    | 174.88  | 161.54  | 0     |
| `power_factor`    | float    | 0.58     | 0.99      | 0.93    | 0.94    | 0     |
| `status`          | string   | —        | —         | always `"OK"` | — | 0     |

Additional checks:

- 0 duplicate `(meter_id, timestamp)` pairs.
- 0 negative or zero `consumption_kwh` values.
- The `status` column is **always** `"OK"` and is therefore **not useful for
  anomaly detection**; all signal must come from the numerical variables.

### 1.2 `events.csv`

Four rows, one per critical meter:

| meter_id | event_timestamp       | event_type          | description                                        |
|----------|-----------------------|---------------------|----------------------------------------------------|
| M-104    | 2026-09-11 00:00      | OPERATIONAL_CHANGE  | New production line activated                      |
| M-106    | 2026-09-08 00:00      | SCHEDULED_OUTAGE    | Scheduled maintenance outage for 12 hours          |
| M-109    | 2026-09-12 14:00      | UNKNOWN             | No operational event reported                      |
| M-112    | 2026-09-13 00:00      | DATA_QUALITY        | Intermittent readings and abnormal electrical jumps|

Every event timestamp falls **exactly** on a point of inflection observed in
the corresponding meter's readings, which validates that events are the
operational truth and must be used for correlation.

---

## 2. Per-meter statistics (full 14-day window)

| Meter | Mean kWh/h | SD kWh/h | Min | Max  |
|-------|-----------:|---------:|----:|-----:|
| M-101 | 30.43      | 5.28     | 19.4 | 40.2 |
| M-102 | 41.93      | 7.30     | 27.4 | 54.3 |
| M-103 | 24.81      | 4.30     | 16.2 | 32.8 |
| M-104 | 55.19      | 14.17    | 32.2 | 88.0 |
| M-105 | 36.36      | 6.33     | 23.1 | 46.5 |
| M-106 | 54.69      | 12.69    | 7.4  | 72.3 |
| M-107 | 19.94      | 3.54     | 12.6 | 25.9 |
| M-108 | 50.46      | 8.76     | 34.0 | 64.5 |
| M-109 | 52.16      | 20.81    | 28.7 | 117.5 |
| M-110 | 29.44      | 5.07     | 19.9 | 38.9 |
| M-111 | 39.09      | 6.76     | 26.0 | 49.5 |
| M-112 | 27.55      | 4.76     | 17.8 | 36.1 |

First 7 days vs second 7 days, delta in total consumption:

| Meter | Δ%       | Verdict                                       |
|-------|---------:|-----------------------------------------------|
| M-101 | +0.3     | normal                                        |
| M-102 | +0.8     | normal                                        |
| M-103 | +0.3     | normal                                        |
| M-104 | +26.5    | real shift; coincides with operational event  |
| M-105 | +0.2     | normal                                        |
| M-106 | −5.4     | contains a 12 h scheduled outage              |
| M-107 | −0.1     | normal                                        |
| M-108 | +0.2     | normal                                        |
| M-109 | +38.7    | abrupt sustained shift from 2026-09-12 14:00  |
| M-110 | −0.1     | normal                                        |
| M-111 | +0.1     | normal                                        |
| M-112 | −0.3     | consumption flat; electrical readings drift   |

---

## 3. Critical meters — detailed findings

### 3.1 M-104 — EXPLAINABLE / MEDIUM

- Pre-event (10 days, 240 readings): mean **48.69 kWh/h**, sd 8.34,
  current ~219 A.
- Post-event (4 days, 96 readings): mean **71.45 kWh/h**, sd 12.62,
  current ~323 A.
- Mean deviation: **+46.75 %**.
- Voltage stable (~220 V, sd ~1.2 V). Power factor similar (0.91 → 0.89).
- Current rises roughly in line with consumption (+47 %), confirming the
  change is real but proportional.
- Daily totals: ~1167 kWh/day → ~1715 kWh/day from 2026-09-11 onward,
  persistent.
- **Interpretation:** a real and sustained deviation, but fully explained by
  the `OPERATIONAL_CHANGE` event ("New production line activated").

### 3.2 M-106 — FALSE_POSITIVE / LOW

- Pre-event (7 days): mean 56.21 kWh/h, sd 9.60.
- Post-event window (7 days): mean 53.17 kWh/h, sd 15.02 (wider spread
  because of the outage).
- The outage window is **exactly 12 hours**: 2026-09-08 00:00 → 12:00.
  During those hours, consumption drops from ~64 kWh/h to ~8 kWh/h and
  current drops from ~300 A to ~39 A. After 12:00 readings return to
  normal (~65 kWh/h).
- Voltage and power factor stay stable throughout, so the drop is fully
  explained by the current drop caused by the scheduled shutdown.
- **Interpretation:** a real statistical deviation caused by a known
  `SCHEDULED_OUTAGE`; no action required.

### 3.3 M-109 — REAL_ANOMALY / HIGH

- Pre-event (11 days, 278 readings): mean **43.69 kWh/h**, sd 7.61,
  current ~235 A, PF ~0.94.
- Post-event (58 readings): mean **92.77 kWh/h**, sd 15.46, current ~493 A,
  PF ~0.74.
- Mean deviation: **+112.35 %**.
- **Exact change point:** 2026-09-12 14:00.
  - 13:00: 48.64 kWh, 236.38 A, PF 0.953
  - 14:00: 110.35 kWh, 492.65 A, PF 0.736
  - This is a one-hour step change of more than 2×.
- The change persists. Daily totals: ~1050 kWh → 1570 kWh (Sep 12) →
  2195 kWh (Sep 13) → 2208 kWh (Sep 14).
- **Electrical consistency:** theoretical power = V × I × PF ≈ 79 kW, but
  reported consumption ≈ 110 kWh. The ratio `P_theoretical / reported`
  collapses from ~0.95 to ~0.72 during the anomaly — the electrical
  readings alone do not fully explain the consumption jump.
- Event declared: `UNKNOWN` ("No operational event reported").
- **Interpretation:** a real, sustained, electrical anomaly with no
  explaining operational event and inconsistent electrical signals.

### 3.4 M-112 — DATA_QUALITY / HIGH

- Pre-event (12 days): consumption stable, voltage 217.96–224.06 V
  (sd ≈ 0.8), current 88–156 A, power factor 0.903–0.987.
- Post-event (2 days, from 2026-09-13 00:00): consumption stays stable
  (mean 27.61 kWh/h, sd 4.38 — no real change), but:
  - **Voltage** jumps between ~202 V and ~241 V from one hour to the next,
    producing **16 readings outside the 210–230 V nominal band**.
  - **Power factor** falls to discrete anomalous values of **0.58** and
    **0.72** that do not appear anywhere else in the dataset.
  - **Current** swings between 46 A and 218 A without a corresponding
    change in consumption.
  - The ratio `P_theoretical / reported_kWh` varies wildly (0.24–1.73)
    between adjacent readings — the electrical variables are internally
    inconsistent.
- Event declared: `DATA_QUALITY` ("Intermittent readings and abnormal
  electrical jumps") — matches the observation exactly.
- **Interpretation:** consumption looks fine, but the underlying electrical
  signal is unreliable; the system must flag this as a data-quality issue
  rather than a consumption anomaly.

---

## 4. Other meters

M-101, M-102, M-103, M-105, M-107, M-108, M-110, M-111 all show:

- ≤ 1 % change between first 7 days and second 7 days.
- No voltage outliers outside the 210–230 V band.
- No power factor values below 0.85.
- No associated operational events.

These meters are expected to be classified as `NORMAL`.

---

## 5. Derived thresholds (starting point)

These values were derived from the dataset itself and will live in
`src/shared/constants.ts` in the backend. They are not hardcoded answers
from `expected_results.csv`.

| Threshold                          | Value     | Rationale                                           |
|------------------------------------|-----------|-----------------------------------------------------|
| Nominal voltage band               | 210–230 V | Covers > 99 % of normal readings (sd ≈ 1.2 V around 220 V). |
| Nominal power factor lower bound   | 0.85      | Lowest PF observed in normal meters ≈ 0.88.         |
| Spike z-score                      | 3.0       | Standard threshold for hourly readings.            |
| Persistent deviation (hours)       | 12 h      | Aligns with M-109's sustained shift.                |
| Real anomaly deviation threshold   | 50 %      | Captures M-109 (+112 %) without flagging normal variance. |
| Explainable deviation threshold    | 20 %      | Captures M-104 (+47 %); anything below is normal.  |
| Electrical ratio tolerance         | ± 20 %    | Normal variation between `P_theoretical` and `reported kWh`. |
| Data-quality outlier rate          | 10 %      | Threshold to flag M-112-style noise.               |

These are the **starting values** for the implementation; they may be
refined during Phase 2 as long as the four critical classifications remain
stable.

---

## 6. Contradictions / observations vs the spec

- The CSVs were delivered in `C:\Users\Lenovo\Downloads\` rather than
  inside a `data/` folder. Per the agreed workflow, both files were copied
  to `data/readings.csv` and `data/events.csv` in this repository, and the
  `Downloads/` copies are no longer the source of truth.
- `expected_results.csv` is not present in the provided download bundle.
  The rule "never read, never copy, never reference" still applies even
  if the file appears in another location.
- The `status` column in `readings.csv` is always `"OK"`. It is not used by
  the anomaly detection engine.
