# Result entry rules

Who may enter and correct a competition result in Badman, and the error a client gets when the window has closed. Source: Badminton Vlaanderen regulations, <https://badminton.vlaanderen/reglementen/>.

## Rule

From C320 art. 62 (Competitiereglement Vlaamse en Provinciale competitie), confirmed by the competition lead on 2026-10-29:

- The game leader enters the result and may correct it until **36 hours after the encounter's planned start** (`EncounterCompetition.date`).
- After that, only the sports commission (`change-any:encounter`) may change it.
- The away club has no right to enter results.
- An encounter without a date has no deadline.

Badman never pushes a result to toernooi.nl when toernooi.nl already has one, or when the season is closed (season `n` stays open until 1 July `n+1`).

## Who may call what

| Mutation | Always | Until `date + 36h` | Otherwise |
| --- | --- | --- | --- |
| `updateEncounterCompetition` | `change-any:encounter` | game leader, home club (`{homeClubId}_enter:results`) | `UnauthorizedException`; a game leader or home club after the deadline gets `RESULT_EDIT_WINDOW_CLOSED` |
| `createGame`, `updateGame` | `change-any:encounter` | game leader | `NotFoundException("You are not the game leader")`; the game leader after the deadline gets `RESULT_EDIT_WINDOW_CLOSED` |

`updateEncounterCompetition` also accepts `tempHomeCaptainId` / `tempAwayCaptainId`. When either is sent, the same per-side check as `updateTempTeamCaptain` applies: encounter admin, that side's club `enter:results`, that team's captain or temporary captain, or the game leader.

Code:

- `packages/backend-graphql/src/resolvers/event/competition/result-edit-window.ts`
- `packages/backend-graphql/src/resolvers/event/competition/encounter.resolver.ts` (`updateEncounterCompetition`)
- `packages/backend-graphql/src/resolvers/game/game.resolver.ts` (`createGame`, `updateGame`)

## Error codes

| Code | When | `extensions` |
| --- | --- | --- |
| `RESULT_EDIT_WINDOW_CLOSED` | A game leader or home club changes the result more than 36 hours after the planned start | `{ code, encounterId: string, deadline: string (ISO 8601) }` |

Clients should tell the user to contact the sports commission.
