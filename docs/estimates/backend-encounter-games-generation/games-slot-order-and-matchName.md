# Games: matchName and order – backend reference

This document is for **backend engineers**. It describes how the **frontend** uses **matchName** (slot identity) and **order** (completion order) for encounter games, what the frontend sends in create/update mutations, and what the backend is expected to store/return. No frontend codebase context is assumed.

---

## Context: encounter form and games

- An **encounter** is a match between two teams (home vs away). Each encounter has up to **8 games** (4 singles + 4 doubles).
- The frontend shows these as 8 fixed “slots” (e.g. “Single 1”, “Double 2”). The user fills in players and scores per slot and saves; the frontend then either **creates** a new game or **updates** an existing one.
- The frontend does **not** receive a “slot id” from the backend. It **derives** which backend game belongs to which slot by matching: same game type (Single/Double) + same set of player IDs. So the frontend needs a stable notion of “slot” on its side – that’s **matchName**. The backend does **not** have a `matchName` field; it only has **order** (and e.g. `visualCode`) among the fields relevant here.

---

## 1. matchName (slot identity) – frontend-only

### What it is

**matchName** is the frontend’s label for each of the 8 fixed slots in an encounter. It is **never** sent to or stored by the backend.

Allowed values (TypeScript type on the frontend):

```ts
type TMatchName =
  | "single1"
  | "single2"
  | "single3"
  | "single4"
  | "double1"
  | "double2"
  | "double3"
  | "double4";
```

### Slot order (iteration order)

When the frontend builds the list of 8 slots from encounter data + team formations, it iterates in this order:

```ts
const gameTypes: TMatchName[] = [
  "double1",
  "double2",
  "double3",
  "double4",
  "single1",
  "single2",
  "single3",
  "single4",
];
```

For **mixed teams** (MX), the frontend uses a different **display** order (e.g. single1, single3, single2, single4, double3, double4), but the set of matchNames and their meaning (which formation field maps to which slot) is the same.

### Where matchName is used on the frontend

- To know which “slot” we’re on (which card, which dialog).
- To know which team-formation field to use for that slot (e.g. `single1` → formation.single1).
- **Not** sent in any mutation.

### Backend implications

- The **GraphQL `Game` type** and the input types **`GameNewInput`** / **`GameUpdateInput`** do **not** have a `matchName` field. The frontend never sends it.
- Slot identity on the backend is inferred by the frontend only by **matching**: same `gameType` + same set of players (and optionally fallback by `visualCode` for placeholder games). So if the backend ever needs to expose “which slot” a game is, it would have to be via a new field (e.g. `matchName` or `slot`) or via a convention (e.g. `order` 1–8 as slot index); currently there is no such field.

---

## 2. order (completion order) – stored and sent

### What it is

**order** is the “completion order” of a game: in which order games got a winner (1 = first completed game, 2 = second, etc.). It is **not** the slot index (that’s matchName on the frontend). The frontend computes it when the user saves a game and sends it in both create and update.

### Backend schema (what the frontend expects)

The frontend uses these types (from the GraphQL schema):

**Game (output)** – the backend returns this when querying games (e.g. encounter games):

```ts
// Relevant fields only
type Game = {
  id: Scalars["ID"]["output"];
  gameType: Maybe<Scalars["String"]["output"]>;
  order: Maybe<Scalars["Int"]["output"]>;   // ← stored, returned
  winner: Maybe<Scalars["Int"]["output"]>;
  // ... set1Team1/2, set2..., set3..., players, visualCode, etc.
};
```

**GameNewInput** – payload for **createGame**:

```ts
type GameNewInput = {
  courtId?: InputMaybe<Scalars["ID"]["input"]>;
  gameId?: InputMaybe<Scalars["ID"]["input"]>;
  gameType?: InputMaybe<Scalars["String"]["input"]>;
  linkId?: InputMaybe<Scalars["ID"]["input"]>;
  linkType?: InputMaybe<Scalars["String"]["input"]>;
  order?: InputMaybe<Scalars["Int"]["input"]>;   // ← sent on create
  playedAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  players?: InputMaybe<Array<GameNewInputPlayers>>;
  round?: InputMaybe<Scalars["String"]["input"]>;
  set1Team1?: InputMaybe<Scalars["Int"]["input"]>;
  set1Team2?: InputMaybe<Scalars["Int"]["input"]>;
  set2Team1?: InputMaybe<Scalars["Int"]["input"]>;
  set2Team2?: InputMaybe<Scalars["Int"]["input"]>;
  set3Team1?: InputMaybe<Scalars["Int"]["input"]>;
  set3Team2?: InputMaybe<Scalars["Int"]["input"]>;
  status?: InputMaybe<Scalars["String"]["input"]>;
  winner?: InputMaybe<Scalars["Int"]["input"]>;
};
// No matchName, no visualCode.
```

**GameUpdateInput** – payload for **updateGame**:

```ts
type GameUpdateInput = {
  courtId?: InputMaybe<Scalars["ID"]["input"]>;
  gameId?: InputMaybe<Scalars["ID"]["input"]>;
  gameType?: InputMaybe<Scalars["String"]["input"]>;
  linkId?: InputMaybe<Scalars["ID"]["input"]>;
  order?: InputMaybe<Scalars["Int"]["input"]>;   // ← sent on update
  playedAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  players?: InputMaybe<Array<GameNewInputPlayers>>;
  round?: InputMaybe<Scalars["String"]["input"]>;
  set1Team1?: InputMaybe<Scalars["Int"]["input"]>;
  set2Team1?: InputMaybe<Scalars["Int"]["input"]>;
  set2Team2?: InputMaybe<Scalars["Int"]["input"]>;
  set3Team1?: InputMaybe<Scalars["Int"]["input"]>;
  set3Team2?: InputMaybe<Scalars["Int"]["input"]>;
  status?: InputMaybe<Scalars["String"]["input"]>;
  winner?: InputMaybe<Scalars["Int"]["input"]>;
};
// No matchName, no visualCode.
```

### Mutations used

```graphql
mutation CreateGame($data: GameNewInput!) {
  createGame(data: $data) {
    id
  }
}

mutation UpdateGame($data: GameUpdateInput!) {
  updateGame(data: $data) {
    id
  }
}
```

The frontend always sends a payload that includes `order` (see below). So the backend must accept `order` on create and update and persist it; the frontend then reads it back via the encounter query (games with `order` in the fragment).

### How the frontend computes `order`

When the user saves a game (create or update), the frontend computes `order` with this logic (TypeScript):

```ts
/**
 * Determines the order value for a game based on completion status and existing completed games.
 * Returns the order value (number) or null if game is not completed.
 */
function getOrderValue(
  game: IFormData,
  gamesData: IEncounterFormGame[]
): number | null {
  const isGameCompleted =
    game.winner !== undefined && game.winner !== null && game.winner !== 0;

  if (!isGameCompleted) {
    return null;
  }

  const completedGames = gamesData.filter((existingGame) => {
    const isCompleted =
      existingGame.winner !== undefined &&
      existingGame.winner !== null &&
      existingGame.winner !== 0;
    const isNotCurrentGame = existingGame.id !== game.id;
    return isCompleted && isNotCurrentGame;
  });

  if (completedGames.length === 0) {
    return 1;
  }

  const highestOrder = Math.max(...completedGames.map((g) => g.order || 0));
  return highestOrder + 1;
}
```

So:

- If the game has **no winner** → `order` is **null**.
- If the game has a **winner** → `order` is **1** when it’s the first completed game, otherwise **1 + max(order of other completed games)**.

### When / where order is sent

**Create (prepGameDataForCreation)**  
The payload built for `createGame` always includes `order`:

```ts
const orderValue = getOrderValue(formData, gamesData);

return {
  playedAt: new Date().toISOString(),
  linkId: formData.encounterId,
  linkType: "competition",
  set1Team1: formData.set1Team1,
  set1Team2: formData.set1Team2,
  set2Team1: formData.set2Team1,
  set2Team2: formData.set2Team2,
  set3Team1: formData.set3Team1,
  set3Team2: formData.set3Team2,
  gameType: formData.gameType,
  winner: formData.winner,
  order: orderValue,   // number or null
  players: [...],
  status: "NORMAL",
};
```

So on **create**, the backend receives `order` as either a positive integer (when the game has a winner) or `null`.

**Update (prepGameDataForUpdate)**  
The payload built for `updateGame` includes `order` only when the game is being completed (has a winner):

```ts
const orderValue = getOrderValue(formData, gamesData);

const updateData = {
  playedAt: new Date().toISOString(),
  linkId: formData.encounterId,
  gameId: formData.id,
  set1Team1: formData.set1Team1,
  // ... other sets, gameType, players, winner
  order: orderValue,
};

// Only include order when the game is being completed (has a winner)
if (orderValue !== null) {
  updateData.order = orderValue;
}

return updateData;
```

So on **update** the payload always includes the `order` key:

- When the game has a **winner**, `order` is the computed integer (completion rank).
- When the game has **no winner**, `order` is `null`. The backend can keep the existing value or clear it depending on your rules.

### What the frontend expects from the backend

- When the frontend **fetches** an encounter with games, it uses the fragment that requests `order` (and `visualCode`, etc.):

```graphql
fragment EncounterFormGame on Game {
  id
  gameType
  winner
  status
  players { id slug fullName team player playerId single double mix }
  rankingPoints { ... }
  set1Team1
  set1Team2
  set2Team1
  set2Team2
  set3Team1
  set3Team2
  order
  visualCode
}
```

- So the backend must **return** `order` for each game (nullable int). When building form state, the frontend uses `databaseGame.order ?? 0` for display/ordering; when computing the next `order` on save, it uses the stored values of other completed games.

---

## 3. Summary for backend

| Concept      | Meaning                         | In backend schema?     | Sent in createGame? | Sent in updateGame? |
|-------------|----------------------------------|------------------------|----------------------|----------------------|
| **matchName** | Slot id (single1…single4, double1…double4) | **No** (frontend-only) | **No**               | **No**               |
| **order**     | Completion order (1 = first completed, 2 = second, …) | **Yes** (`Game.order`) | **Yes** (int or null) | **Yes** (only when game has winner; then int) |

- **matchName:** The frontend never sends it. The backend does not need to store or expose it unless you add a new field for “slot” (e.g. for toernooi.nl or reporting).
- **order:** The backend should accept `order` in `GameNewInput` and `GameUpdateInput`, persist it, and return it on `Game`. The frontend uses it as completion order (1-based); it is **not** the same as “slot index” (which is matchName on the frontend).
