---
name: architecture
description: Architectural rules for the AI Energy Platform. Applied automatically when designing or refactoring the backend modules of ai-energy-platform-api/. Complements AGENTS.md § 26 with layering and dependency-direction guidance.
---

# Architecture Skill — AI Energy Platform

This skill is the **operational checklist** for architectural decisions
on this project. It complements `AGENTS.md` § 26 ("modular monolith")
with concrete layering rules and dependency direction.

## 1. Big picture

```
+---------------------------------------------+
| Presentation                                |  HTTP layer
|   controllers, DTOs, mappers                |
+--------------------+------------------------+
                     |
+--------------------v------------------------+
| Application                                 |  Use cases
|   services (one per module)                 |
|   orchestrating domain + ports              |
+--------------------+------------------------+
                     |
+--------------------v------------------------+
| Domain                                      |  Business rules
|   entities, value objects, domain services  |
|   (BaselineCalculator, AnomalyClassifier,   |
|    SeverityCalculator, ...)                 |
+--------------------+------------------------+
                     |
+--------------------v------------------------+
| Infrastructure                              |  Adapters
|   Prisma repositories, LLM providers,       |
|   clock, CSV readers                        |
+---------------------------------------------+
```

Dependencies **only point downward**. Domain never imports from
Application or Infrastructure. Application never imports from
Infrastructure concrete classes — only from **ports** (interfaces).

## 2. Why a modular monolith (not microservices)

- AGENTS.md § 26 mandates a modular monolith.
- Do **not** introduce Kafka, Redis, RabbitMQ, or any message broker
  unless a real concurrency need appears (it has not).
- Do **not** split modules into separate processes. One NestJS process
  runs everything.
- If a future need justifies extraction, the modular boundaries
  defined here make that extraction straightforward without rewriting
  the domain.

## 3. Layer responsibilities

### 3.1 Presentation

- HTTP in/out only. Validates request DTOs. Maps domain → response DTOs.
- Knows about HTTP status codes, but routes the actual mapping through
  a single global exception filter.
- Never reaches into Prisma or into analytics components directly.

### 3.2 Application (services)

- One orchestrator per module (`MetersService`, `AnomaliesService`,
  `AiAnalysisService`).
- Coordinates domain components and ports to fulfill a use case.
- Holds no business rules of its own — only orchestration. If you find
  yourself adding business rules to a service, move them into the
  domain layer instead.

### 3.3 Domain

- The heart of the system. All anomaly-detection rules live here.
- Pure TypeScript. No NestJS decorators, no `@Injectable()`, no
  `@Controller()`. Domain is framework-free and trivially testable.
- Entities and value objects are immutable where possible.
- Domain services receive their collaborators (clock, repositories)
  through constructor arguments, not through DI decorators.

### 3.4 Infrastructure

- Implements the ports declared by Application/Domain.
  - `PrismaMeterRepository implements MeterRepository`
  - `StubDeterministicProvider implements ILLMProvider`
- Contains all I/O: database calls, file reads, external API calls.
- The only place where `@prisma/client` may be imported.

## 4. Dependency direction (concrete examples)

```
GOOD:
  AnomaliesController  ->  AnomaliesService  ->  AnomalyClassifier (domain)
                                                ->  AnomalyRepository (port)
                                                <-  PrismaAnomalyRepository

BAD:
  AnomalyClassifier  ->  PrismaAnomalyRepository   (domain depends on infra)
  AnomaliesService   ->  new StubDeterministicProvider()  (no port)
```

Whenever a class needs a collaborator, ask: "is this collaborator
replaceable?". If yes, depend on the **interface** declared by the
caller's layer (or by Domain). If no, depend on the concrete class
and document why.

## 5. When to introduce an interface (port)

Introduce an interface only when at least one of these is true:

1. There is a realistic alternative implementation (e.g. `OpenAIProvider`
   alongside `StubDeterministicProvider`).
2. The collaborator is hard to instantiate in tests (e.g. Prisma).
3. Multiple modules need to depend on the collaborator and the
   abstraction clarifies ownership.

If none of these hold, use the concrete class directly. **Do not
pre-emptively wrap every collaborator in an interface** — that is the
exact over-abstraction AGENTS.md warns against.

## 6. Ports owned by Application or Domain?

- **Domain** owns ports to *purely technical* collaborators that the
  domain does not naturally know about (clock, ID generator, LLM
  provider).
- **Application** owns ports to *persistence* collaborators
  (`MeterRepository`, `ReadingRepository`, `AnomalyRepository`).

This split prevents the domain from knowing that Prisma exists while
keeping the application responsible for persistence orchestration.

## 7. Cross-module access

- Modules expose a **public API** through their service. Controllers
  of other modules must not call repositories of another module
  directly.
- Cross-module references go through the **owning** module's service.
- If two modules need to share a concept, extract it into a shared
  kernel under `src/shared/` (a type or enum), **not** a new module.

## 8. Anti-patterns to actively reject

- A "fat service" that holds the entire use-case logic in one file.
- A domain class that imports `@nestjs/common` or `@prisma/client`.
- A controller that imports the Prisma service.
- A repository whose interface is declared inside the infrastructure
  folder (the interface belongs to the consumer's layer).
- Shared mutable state between modules (singletons holding request data).
- Kafka/Redis/RabbitMQ introduced without a measured need.
- A "god module" `AppModule` doing all wiring — wire each module's
  imports explicitly.

## 9. LLM-specific architecture

```
AiAnalysisService (application)
  -> AnalyticsPipeline (domain)        produces Evidence
  -> ILLMProvider (port in domain)
       <- StubDeterministicProvider (infrastructure)
       <- OpenAIProvider              (infrastructure, optional)
```

The LLM **never** computes evidence. It receives the evidence object
and returns structured text. The application service is responsible for
persisting both the evidence and the explanation.

## 10. Definition of done (architectural review)

A structural change is "done" only when:

1. Dependencies point downward (Presentation → Application → Domain ←
   Infrastructure).
2. No domain file imports from `@nestjs/*` or `@prisma/client`.
3. No controller imports the Prisma service directly.
4. No cross-module repository reach-around.
5. New ports have a concrete alternative implementation or a clear
   testability reason to exist.
6. No premature infrastructure was added (no broker, no cache).
