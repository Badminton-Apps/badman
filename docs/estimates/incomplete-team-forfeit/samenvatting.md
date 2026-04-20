# Samenvatting: Onvolledige Teamopstelling & Forfait-synchronisatie

## Overzicht

Deze feature maakt het mogelijk om in de Badman-applicatie een team met minder dan 4 spelers op te stellen (bijvoorbeeld 3 spelers, wat reglementair is toegestaan), lege spelersplaatsen in het scoreformulier als forfait te behandelen, en de automatische synchronisatie naar toernooi.nl correct te laten werken bij onvolledige opstellingen. Dit lost een concreet probleem op dat zich op 8 maart 2026 voordeed bij Brugse 1H: het team moest een fictieve vierde speler invoeren, wat leidde tot dubbele wedstrijden, foutieve scores en handmatig ingrijpen op toernooi.nl.

## Werkstromen

- **Backend validatieregels aanpassen (~3 uur):** De 8 bestaande validatieregels voor teamopstellingen worden aangepast zodat lege spelersposities niet als fout maar als waarschuwing worden behandeld. Dit is nodig om te voorkomen dat het systeem een onvolledige opstelling blokkeert, terwijl de gebruiker wel duidelijk te zien krijgt dat er posities ontbreken.
- **Synchronisatie naar toernooi.nl repareren (~7 uur):** Het kernprobleem wordt opgelost: wanneer een spelerspositie leeg is (forfait), wordt het dropdown-menu op toernooi.nl niet meer ingevuld. Hierdoor verdwijnt het conflict waarbij dezelfde speler aan meerdere enkelwedstrijden werd toegewezen. Dit is het meest complexe onderdeel omdat het afhankelijk is van het gedrag van een externe website.
- **Frontend aanpassingen (~7 uur):** Het opstellingsformulier krijgt een visuele indicatie voor lege posities ("Forfait"). Het scoreformulier krijgt een optie om per wedstrijd aan te geven dat er geen speler beschikbaar is, waarna de scores automatisch op 21-0 21-0 worden gezet. Dit maakt het proces voor de gebruiker intuïtief en foutbestendig.
- **Testen en kwaliteitsborging (~12 uur):** Uitgebreide tests zijn nodig, met name een handmatige verificatie tegen de echte toernooi.nl-website om te bevestigen dat lege spelerselecties correct worden verwerkt. Daarnaast worden unit tests geschreven voor de aangepaste logica en een end-to-end test voor het volledige scenario.

## Complexiteit

**Gemiddeld** -- De databasestructuur hoeft niet aangepast te worden en de bestaande code ondersteunt al grotendeels nullable spelersposities. De complexiteit zit voornamelijk in de Puppeteer-synchronisatie met toernooi.nl, waar we afhankelijk zijn van het gedrag van een externe website.

## Tijdsinschatting


| Categorie    | Uren (met AI-ondersteuning) |
| ------------ | --------------------------- |
| Backend      | 11 uur                      |
| Frontend     | 7 uur                       |
| Testen       | 11 uur                      |
| Documentatie | 0,5 uur                     |
| **Totaal**   | **29 uur**                  |



| Scenario      | Uren   |
| ------------- | ------ |
| Optimistisch  | 22 uur |
| Verwacht      | 29 uur |
| Pessimistisch | 42 uur |


**Verwachte doorlooptijd:** 1 sprint (2 weken) voor een enkele ontwikkelaar met AI-ondersteuning.

## Top 3 Risico's

1. **Gedrag van toernooi.nl bij lege spelerselecties.** Het is mogelijk dat de website een foutmelding toont wanneer een spelerdropdown niet is ingevuld. Dit kan alleen getest worden tegen de echte website. We mitigeren dit door een feature-vlag in te bouwen waarmee de synchronisatie apart kan worden in- en uitgeschakeld, en door eerst handmatig te testen voordat de functie wordt geactiveerd.
2. **Logica voor het matchen van wedstrijden aan opstellingsposities.** De huidige code koppelt wedstrijden aan posities op basis van spelers-ID's. Bij forfait zijn er geen spelers-ID's beschikbaar. De alternatieve aanpak (matchen op positievolgorde) is robuust maar voegt complexiteit toe aan een kritiek onderdeel. We mitigeren dit met uitgebreide unit tests.
3. **Consistentie van scoretelling bij forfaitwedstrijden.** Het systeem moet forfaitwedstrijden correct meetellen in de encounter-score (bijvoorbeeld 5-3 in plaats van 8-0). De bestaande logica ondersteunt dit al via de winnaar-statussen, maar dit moet zorgvuldig geverifieerd worden om te voorkomen dat klassementen verkeerd berekend worden.

