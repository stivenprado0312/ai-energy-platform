---
name: frontend
description: Frontend development rules for the AI Energy Platform Next.js app. Applied automatically when implementing components, pages, hooks, API clients, or any code under ai-energy-platform-app/. Complements AGENTS.md § 33–§ 34 with file-level patterns.
---

# Frontend Skill — AI Energy Platform

This skill is the **operational checklist** for the Next.js frontend.
It complements `AGENTS.md` § 33–§ 34 with concrete rules for the
App Router, the API client, and the visual hierarchy.

## 1. Stack and conventions

- Next.js (App Router) + TypeScript strict.
- Tailwind CSS for styling. **No additional UI libraries** (no
  Material UI, Chakra, shadcn, …) unless explicitly required.
- Recharts for charts. No other charting library.
- Tests with Jest + React Testing Library.
- API base URL via `NEXT_PUBLIC_API_URL`. Default
  `http://localhost:3000`.
- The backend (NestJS) is the **single source of truth** for all
  derived data (baselines, deviations, classifications, AI text).
  The frontend never re-computes them.

## 2. Folder layout

```
ai-energy-platform-app/
├── src/
│   ├── app/                       App Router pages
│   │   ├── layout.tsx
│   │   ├── page.tsx               /            dashboard
│   │   ├── meters/page.tsx
│   │   ├── meters/[meterId]/page.tsx
│   │   ├── anomalies/page.tsx
│   │   ├── anomalies/[id]/page.tsx
│   │   └── ...
│   ├── components/
│   │   ├── ui/                    generic primitives (Card, Badge, Button, Table)
│   │   ├── charts/                Recharts wrappers
│   │   └── domain/                meters, anomalies, evidence
│   ├── lib/
│   │   ├── api-client.ts          single HTTP entry point
│   │   ├── types.ts               API DTOs mirroring backend
│   │   ├── format.ts              number / date / energy formatters
│   │   └── hooks/                 data-fetching hooks
│   └── styles/
│       └── globals.css
├── public/
├── tests/                         Jest setup + component tests
├── .env.example                   NEXT_PUBLIC_API_URL=
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── jest.config.js
```

A page is a thin composition of `components/...`. Pages do not
contain business logic; they orchestrate data fetching via hooks and
render components.

## 3. API client

- Single module `lib/api-client.ts` exposes typed methods
  (`getDashboardSummary()`, `getMeters()`, `getMeter(id)`,
  `getAnomalies(filter)`, `getAnomaly(id)`, `generateExplanation(id)`,
  …). Components do **not** call `fetch` directly.
- The client throws `ApiError` for non-2xx responses. The hook layer
  translates that into UI state (`loading | error | data`).
- No retries, no SWR/Tanstack-Query — keep it simple with `useEffect`.

## 4. Data fetching pattern

```tsx
const { data, loading, error, refetch } = useMeters();
```

Each hook lives under `lib/hooks/` and follows the same contract.
Pages render `loading`, `error`, or `data` branches; they do not
re-implement the state machine.

## 5. Types

- All API DTOs live in `lib/types.ts` and are hand-mirrored from the
  backend. Do **not** use `any`. Use `unknown` at the boundary if a
  shape is genuinely unknown.
- Re-export enum-like unions (`Severity`, `Priority`, `AnomalyType`)
  as `as const` objects so that they can be used both as types and as
  dictionaries for badges / colors.

## 6. Visual hierarchy

- The dashboard is the entry point. It must answer in one screen:
  "is there something I should look at?"
- Severity color is **never the only signal**. Always pair the color
  with the text label and (where useful) an icon.
- `HIGH` → red, `MEDIUM` → amber, `LOW` → slate.
- `REAL_ANOMALY` → red, `EXPLAINABLE` → blue, `FALSE_POSITIVE` →
  slate, `DATA_QUALITY` → amber, `NORMAL` → slate.

## 7. Loading / empty / error states

- Every list view must handle three states: `loading`, `empty`,
  `error`. Never show a blank screen.
- Errors are user-friendly and never expose raw API payloads.
- Buttons that trigger mutations (e.g. "Generate explanation") show:
  `idle → loading → success/error` with the result in place when
  finished.

## 8. Accessibility and responsive

- Every interactive element is a real `<button>` or `<a>`.
- Charts include a textual fallback (e.g. a small summary card).
- The layout works at 1280 px and degrades to single column at
  < 768 px.

## 9. Forbidden patterns

- Computing baseline / deviation / classification in the frontend.
- Hardcoding meter ids or anomaly values that must come from the API.
- Using `any` to bypass the typed API client.
- Adding new dependencies "to make it pretty" (no icon packs, no
  animation libraries, no date libraries when `Date` works).
- Putting data-fetching logic inside JSX render functions.

## 10. Tests

- Unit / component tests with React Testing Library for the critical
  surfaces: dashboard KPI card, anomaly card, evidence panel, the
  "Generate explanation" interaction.
- Mock the API client (`lib/api-client.ts`) — do not hit the network.
- No screenshot / e2e tests in this phase; visual verification is
  manual (the evaluator will click through).

## 11. Definition of done (frontend change)

1. `npm run lint` exits 0.
2. `npm run build` exits 0.
3. `tsc --noEmit` exits 0 (when run separately).
4. `npm test` passes for the changed surfaces.
5. The page renders successfully against the real backend
   (verified manually).
