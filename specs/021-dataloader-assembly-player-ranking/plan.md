# Implementation Plan: Eliminate conditional per-player RankingPlace fallback in assembly resolver

**Branch**: `021-dataloader-assembly-player-ranking` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/021-dataloader-assembly-player-ranking/spec.md`

## Summary

Add `RankingPlace` to the `include` array of the two existing `Player.findAll` calls in `AssemblyResolver` (`titularsPlayers` and `baseTeamPlayers`). `Player.getCurrentRanking()` already prefers `RankingLastPlace` when available; if none matches the system it falls back to `getRankingPlaces()` — a per-player DB query. With `RankingPlace` eager-loaded, the fallback reads from memory and the conditional per-player DB call is eliminated. Zero changes to `getCurrentRanking`, zero DataLoader needed.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20)
**Primary Dependencies**: Sequelize-typescript (`include` option), NestJS
**Storage**: PostgreSQL — `ranking.RankingPlaces` table (existing); no migrations
**Testing**: Jest via `nx test backend-graphql`
**Target Platform**: NestJS API (apps/api)
**Project Type**: NestJS GraphQL resolver (`libs/backend/graphql`)
**Performance Goals**: Eliminate M per-player `getRankingPlaces` DB queries per assembly validation request
**Constraints**: Must not change output shape of `titularsPlayers` / `baseTeamPlayers`; must not modify `getCurrentRanking` logic
**Scale/Scope**: Two `Player.findAll` call sites in one resolver file; 6-16 players per assembly request

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code-First GraphQL via Sequelize Models | PASS | No new models or types; only `include` option changed |
| II. Translation Discipline | PASS | No i18n changes |
| III. Transactional Mutations | PASS | No mutations affected |
| IV. Resolver Test Discipline | APPLIES | Tests asserting `getRankingPlaces()` called for unranked players must flip to asserting NOT called |
| V. Legacy Frontend Boundary | PASS | No frontend changes |

## Project Structure

### Documentation (this feature)

```text
specs/021-dataloader-assembly-player-ranking/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
└── tasks.md             ← Phase 2 output (speckit-tasks)
```

### Source Code (repository root)

```text
libs/backend/graphql/src/resolvers/event/competition/
├── assembly.resolver.ts      (add RankingPlace to include in titularsPlayers + baseTeamPlayers)
└── assembly.resolver.spec.ts (update test assertions for getCurrentRanking fallback path)
```

**Structure Decision**: Minimal single-file change. No new services, no new modules, no new dependencies.

## Key Design Decisions

1. Add `{ model: RankingPlace }` to `include` in both `titularsPlayers` and `baseTeamPlayers` `Player.findAll` calls.
2. No change to `getCurrentRanking` — once `rankingPlaces` is populated by the include, the fallback `getRankingPlaces()` at line 363 is unreachable.
3. Verify the `Player → RankingPlace` association alias matches what `getCurrentRanking` reads at `this.rankingPlaces`.
4. Invert any test spy expecting `getRankingPlaces()` to be called — assert it is NOT called.

## Complexity Tracking

No constitution violations.
