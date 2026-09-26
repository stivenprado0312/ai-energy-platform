---
name: backend
description: Backend development rules for the AI Energy Platform NestJS API. Applied automatically when implementing modules, services, controllers, DTOs, or any TypeScript code under ai-energy-platform-api/src/. Complements AGENTS.md with NestJS-specific backend practices.
---

# Backend Skill — AI Energy Platform

This skill is the **operational checklist** for writing backend code on this
project. It does **not** restate the general rules in `AGENTS.md`; it adds
NestJS-specific, file-level guidance.

The rules below are **mandatory** during implementation.

## 1. Stack and version expectations

- Node.js LTS, TypeScript with `strict: true`.
- NestJS 10+. Use `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`.
- Prisma as the only ORM. The generated client lives in
  `infrastructure/database/prisma/`.
- Jest for tests, with `@nestjs/testing` for module wiring.
- No additional backend frameworks (no Fastify, no Express-only mode)
  unless a concrete need appears later.

## 2. Module layout

Each domain module under `src/modules/<name>/` follows this layout:

```
<name>/
  <name>.module.ts
  <name>.controller.ts          thin: parses request, calls service, returns DTO
  <name>.service.ts             application logic / use-case coordination
  dto/
    create-<name>.dto.ts        class-validator + class-transformer
    update-<name>.dto.ts
    <name>-response.dto.ts
  domain/
    <name>.entity.ts            pure type / class, no Prisma decorators
    <name>.repository.ts        interface (port)
  infrastructure/
    prisma-<name>.repository.ts Prisma implementation (adapter)
  <name>.spec.ts                unit tests next to the unit they cover
```

If a module is genuinely trivial (e.g. a static lookup), skip the
`domain/` and `infrastructure/` subfolders — the rule against
over-architecting applies.

## 3. Controllers

- Thin. No business logic.
- Always declare a typed response DTO; never return raw Prisma models.
- Always declare a request DTO with `class-validator` decorators.
- Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true,
  transform: true })` is configured in `main.ts` — do not re-declare per
  controller.
- Map domain errors to HTTP responses via a single `HttpExceptionFilter`
  shared in `shared/filters/`. Controllers throw domain errors, not HTTP
  errors.

## 4. Services (application layer)

- One service per module. Split into multiple **collaborators**
  (injected) when the service grows beyond ~150–200 lines or clearly
  mixes responsibilities.
- Public methods are use-case shaped: `analyzeMeter(id, opts)`,
  `getDashboardSummary()`, `runAnalysis()`. No generic CRUD methods
  exposed publicly when a use-case is more meaningful.
- Inject repositories through their **interface** (`@Inject('TOKEN')`),
  not the Prisma class directly, so tests can swap them.
- No `console.log` in production code. Use `Logger` from `@nestjs/common`.

## 5. Domain layer

- Domain entities are plain TypeScript types or classes.
- Domain rules (e.g. "an outage event explains a consumption drop")
  live in domain services under `src/modules/analytics/`, **not** in the
  Prisma layer.
- Domain never imports from `@prisma/client` or from NestJS framework
  packages. Only types and pure logic.
- When the analytics engine must read raw readings, it does so through
  a `ReadingRepository` interface implemented in `infrastructure/`.

## 6. Prisma and persistence

- `schema.prisma` is the single source of truth for tables and columns.
- Field names use camelCase in TS, snake_case in DB via `@map`.
- All read models expose DTOs, never raw `Prisma.Model` types, to the
  controller and beyond.
- The `prisma.service.ts` extends `PrismaClient` and implements
  `OnModuleInit` / `OnModuleDestroy` for lifecycle.
- Migrations live under `prisma/migrations/`. Never edit an applied
  migration; create a new one.
- The seed script lives at `prisma/seed.ts` and is invoked by
  `prisma db seed`. It must read from `data/*.csv` only.

## 7. Configuration

- All thresholds live in `src/shared/constants.ts`. No magic numbers in
  services or analytics components.
- Environment variables are loaded via `@nestjs/config` and validated
  with `Joi` (or `zod`) at boot. Invalid env crashes startup — no silent
  defaults for required values.
- `LLM_PROVIDER` selects the provider via a factory provider bound to a
  string token, so swapping stub ↔ openai touches one line.

## 8. Errors

- Domain throws typed errors (e.g. `MeterNotFoundError`,
  `InsufficientEvidenceError`). The global filter translates them.
- Never swallow errors. Never catch and re-throw without adding context.
- Async methods let errors propagate; controllers do not `try/catch` the
  service call.

## 9. Dependencies and DI

- Constructor injection only. No field injection.
- Provider tokens use `Symbol` or string constants from
  `src/shared/tokens.ts`. Avoid magic strings scattered across modules.
- Circular dependencies are forbidden; redesign module boundaries before
  allowing one.
- Singleton scope is the default. Request scope only when a per-request
  context is genuinely needed (e.g. multi-tenant resolver) — and then
  documented as such.

## 10. Naming and code shape

- File names match the primary export: `baseline.calculator.ts`,
  `spike.detector.ts`. Class names match: `BaselineCalculator`,
  `SpikeDetector`.
- Functions are small (target ≤ 30 lines) and do one thing. If a function
  has more than one reason to change, split it.
- Comments only explain **why**, never **what**. The code already shows
  what it does.
- Public API is typed; `any` is banned. `unknown` is allowed at trust
  boundaries with narrowing.

## 11. Anti-patterns to actively reject

- Service files exceeding ~300 lines without internal splitting.
- Controllers that compute or transform domain data.
- `PrismaService` injected directly into controllers.
- Hard-coded thresholds in analytics code (`if (kwh > 50)`).
- "Utility" modules that grow into a junk drawer.
- Wrapping every call in an interface when there is only one
  implementation and no realistic second one (over-abstraction).
- Re-exporting `@prisma/client` types across module boundaries.

## 12. Definition of done (backend code)

A backend change is "done" only when:

1. TypeScript compiles with no errors.
2. The relevant Jest tests pass.
3. No new `any` was introduced.
4. No new magic numbers slipped in.
5. DTOs are used at the controller boundary.
6. The global error filter handles the new failure mode.
