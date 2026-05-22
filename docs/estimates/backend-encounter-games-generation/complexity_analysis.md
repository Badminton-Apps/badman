# Complexity & Risk Analysis: Backend Encounter Games Generation

**References:** [impact_map.md](./impact_map.md), [games-slot-order-and-matchName.md](./games-slot-order-and-matchName.md) (frontend matchName/order semantics).

## 1. Technical Risk

### Findings

- **Encounter Games Generation Service:** New service must implement canonical 8-slot logic (double1..4, single1..4 or MX equivalents) aligned with `ASSEMBLY_POSITION_ORDER` in sync worker (`apps/worker/sync/.../assemblyPositions.ts`). Slot semantics must match frontend and sync; any drift causes wrong game types or player assignments.
- **Matching existing games:** Logic to match by (gameType + player set) or (gameType + empty players + visualCode) is non-trivial; edge cases (partial assemblies, re-formed teams) can produce wrong matches or duplicates.
- **Idempotency:** "Generate" may be called on formation change or re-entry to Results step. Policy must be explicit: create-only-for-missing-slots vs full regenerate-and-reassign. Duplicate games for the same slot must be prevented; current impact map leaves the choice open.
- **ORM/DB:** The frontend uses `order` as **completion order** (1 = first completed, 2 = second, …), not slot index. So we cannot use `order` for slot; a separate field (`matchName` or `slotIndex`) is needed if the backend stores slot identity. See [games-slot-order-and-matchName.md](./games-slot-order-and-matchName.md).

### Risk: **Medium**

---

## 2. Integration Risk

### Findings

- **Toernooi.nl sync (high risk):**
  - **Sync FROM toernooi.nl:** Encounter processor removes DB games whose `visualCode` is not in the visual match list. Backend-generated games without `visualCode` could be **deleted on next sync** unless sync explicitly excludes them (e.g. by `linkType === "competition"` or a "generated" flag). Must clarify and possibly change sync logic.
  - **Sync TO toernooi.nl (EnterScores):** [CLARIFIED] EnterScores finds the form row by assembly position via `findGameRowByAssemblyPosition` and persists `game.visualCode` when missing; games without visualCode can be pushed. No change needed to EnterScores for backend-generated games without visualCode.
- **linkId / linkType:** [CONFIRMED] Sync-events-v2 game processor uses `linkId = draw.id`, `linkType = "tournament"` for tournament flow; competition encounters use `linkId = encounter.id`, `linkType = "competition"`. Backend generation **must** set these correctly so sync does not overwrite or delete competition encounter games.
- **GraphQL:** New mutation `generateEncounterGames(encounterId)` and optional auto-trigger when loading encounter for edit. Resolver must call generation service and return encounter with games; frontend depends on `encounter.games` as source of truth.
- **Frontend (Next.js 15, external repo):** Edit-encounter equivalent must stop using client-side `createGameObjects` / `getMatchingDatabaseGame` and consume `encounter.games` by id; save uses `updateGame` for existing games. Coordination of when to call generate (explicit button vs implicit on Results step) affects UX and backend trigger points.

### Risk: **High**

---

## 3. Data Risk

### Findings

- **visualCode lifecycle:** Games get `visualCode` from toernooi.nl (sync FROM). If Badman creates games before they exist on toernooi.nl, those games have no visualCode until sync or manual flow provides it. Sync-from logic that deletes "unknown" games would then remove valid backend-generated games. Data consistency depends on either: (1) never generating without visualCode when sync-from will run, or (2) excluding competition/generated games from the delete rule.
- **Game–slot consistency:** Backend must assign exactly one game per logical slot (1..8). Duplicates or missing slots break frontend display and EnterScores matching. Idempotent generation and clear slot identity (order/matchName) are required.
- **Assembly → players:** Generation reads assembly data (single1..4, double1..4) to resolve player IDs per slot. Stale or incomplete assembly data produces wrong GamePlayerMemberships; validation or guards may be needed.
- **No new tables:** All changes are in existing `Games` and `GamePlayerMemberships`; `order` is completion order (not slot index). Optional `matchName` or `slotIndex` if backend needs to store slot identity; see games-slot-order-and-matchName.md.

### Risk: **Medium–High**

---

## 4. Scope Risk

### Findings

- **In-scope:** Encounter games generation service; GraphQL mutation and resolver; sync adjustments for competition games and visualCode; frontend edit-encounter to use `encounter.games` and remove client-side generation; tests (unit for service, integration for resolver + generation, sync and frontend).
- **Out of scope (per impact map):** Assembly validation/save, PDF export, ranking points, detail-encounter structure (only sort by order/matchName).
- **Creep risks:** (1) Supporting "Badman-origin" games that don’t exist on toernooi.nl yet — may require EnterScores and sync-from changes beyond current assumptions. (2) Formalizing `matchName` or slot index in schema if `order` semantics are ambiguous. (3) Auto-trigger vs explicit "Generate games" — product decision affects resolver and frontend scope.

### Risk: **Medium**

---

## 5. Uncertainty Risk

### Findings

- **Ordering with toernooi.nl:** Unclear whether encounter games are always created on toernooi.nl first (so visualCodes always exist after sync) or if Badman can create games that don’t exist on toernooi yet. Resolution drives whether we need sync-from safeguards for games without visualCode.
- **Competition vs tournament sync path:** Impact map notes game processor uses draw.id / "tournament"; competition encounters may use a different path (encounter.id / "competition"). Confirmation needed so generation and sync use the same link contract.
- **Idempotency policy:** "Create missing only" vs "regenerate and reassign" is not decided; implementation and tests depend on it.
- **Slot order source of truth:** Single definition (e.g. assemblyPositions or shared constant) for slot order across backend, frontend, and sync worker; frontend slot identity (matchName) and iteration order are described in [games-slot-order-and-matchName.md](./games-slot-order-and-matchName.md).
- **Frontend hooks:** Frontend is Next.js 15 in an external repo; createGameObjects / getMatchingDatabaseGame live there; conceptual change is to remove client-side generation and use `encounter.games` by id; exact file set is in that repo.

### Risk: **High**

---

## Overall Risk Rating: **High**

The primary risks are:

1. **Toernooi.nl sync and visualCode:** Sync-from can delete backend-generated games without visualCode unless guarded (e.g. linkType === "competition"); sync-to (EnterScores) does **not** require visualCode (resolves row by assembly position and persists it). Implement sync-from guard so competition encounter games are never incorrectly removed; EnterScores already supports games without visualCode.
2. **linkId / linkType consistency:** Ensure backend generation and all sync paths use `linkId = encounter.id`, `linkType = "competition"` for encounter games so tournament and competition flows do not conflict.
3. **Idempotency and slot identity:** Define and implement a single policy for repeated "generate" calls and ensure one game per slot with stable identity (order/matchName) for display and EnterScores.
4. **Unresolved assumptions:** Ordering with toernooi.nl, competition sync path, and slot order source of truth should be confirmed before or early in implementation so the breakdown sub-agent can size tasks accurately.
