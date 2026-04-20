# Samenvatting: Backend Encounter Games Generation

## Overzicht

We verplaatsen de aanmaak van de 8 wedstrijden per encounter van de frontend naar de backend. Nu worden deze games aan de client-kant gegenereerd, wat leidt tot “spook”-games en dubbele wedstrijden. Door ze **eenmalig op de server** te creëren, ontstaat één duidelijke bron van waarheid: de encounter heeft precies 8 games met vastgelegde spelers en volgorde. Dat verbetert de stabiliteit en voorkomt de huidige bugs. De bestaande synchronisatie met toernooi.nl (inclusief visualCode) blijft gewaarborgd.

## Aanpak

- **Backend:** Een nieuwe service berekent voor een encounter de 8 slots (dubbel 1–4, enkel 1–4 of MX-equivalent) op basis van de assemblies, koppelt bestaande games waar mogelijk en maakt alleen ontbrekende games aan. Een GraphQL-mutatie `generateEncounterGames(encounterId)` roept deze service aan; de frontend kan dit expliciet (knop) of bij het openen van de Resultaten-stap doen.
- **Frontend:** De edit-encounter pagina stopt met eigen “createGameObjects”-logica en gebruikt uitsluitend `encounter.games` (op id). Het formulier wordt opgebouwd uit deze lijst (gesorteerd op volgorde); bij opslaan worden bestaande games via `updateGame` bijgewerkt. Er worden geen extra games meer client-side aangemaakt voor de 8 slots.
- **Sync (toernooi.nl):** De worker wordt aangepast zodat games die bij een competition encounter horen (`linkId` = encounter.id, `linkType` = "competition") niet worden verwijderd wanneer ze niet in de visuele matchlijst van toernooi.nl staan. Bij het verwerken van encounter-games worden `linkId` en `linkType` correct gezet. EnterScores vindt de formulierrij op basis van assembly-positie (`findGameRowByAssemblyPosition`) en slaat `game.visualCode` op wanneer die ontbreekt; backend-gegenereerde games met of zonder visualCode kunnen dus worden weggeschreven.

**Toernooi.nl-integratie** (sync van en naar toernooi.nl) is een belangrijke randvoorwaarde. De inschatting houdt expliciet rekening met aanpassingen in de worker en, waar nodig, met de afstemming van `linkId`/`linkType` voor competition encounters.

## Hoofdrisico

Het grootste risico zit in de **sync met toernooi.nl en het gebruik van visualCode**. Games krijgen hun visualCode vanuit toernooi.nl; als we server-side games aanmaken vóór sync, kunnen ze (zonder visualCode) ten onrechte worden verwijderd bij een volgende sync-from, tenzij de worker competition-games uitsluit van die opruimlogica. EnterScores werkt al met games zonder visualCode (vindt rij op assembly-positie en slaat visualCode op); backend-gegenereerde games met of zonder visualCode kunnen worden weggeschreven. De voorgestelde sync-aanpassingen (guard op linkType, correct zetten van linkId/linkType) mitigeren dit; de exacte volgorde “toernooi eerst” vs “Badman eerst” beïnvloedt de randgevallen.

## Inschatting inspanning

| Scenario      | Uren  | Toelichting |
|---------------|-------|-------------|
| Optimistisch  | 48 u  | Geen migratieproblemen; sync ondersteunt competition al; frontend heeft geen extra create-paden. |
| Verwachting   | **56 u** | Circa 7 dev-dagen met AI; standaard aannames. |
| Pessimistisch | 68 u  | Verduidelijking competition vs tournament sync; idempotency randgevallen; migratie voor veel bestaande encounters. |

**Doorlooptijd:** 1 sprint (2 weken) met 1 developer + AI, of 2 sprints als eerst sync/visualCode wordt uitgerijpt.

---

Deze samenvatting ondersteunt de beslissing om de feature te doen: één duidelijke generatie op de backend, stabielere encounters en behoud van toernooi.nl-sync, met een realistische bandbreedte rond 56 uur.
