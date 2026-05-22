# Samenvatting voor de klant

## Overzicht

We bouwen de zes export- en rapportfuncties die eerder beschikbaar waren in de oude applicatie opnieuw in voor de nieuwe omgeving. Het gaat om rapporten die gekoppeld zijn aan een competitie-afdeling: een interactief overzicht van het gemiddeld niveau, en vijf downloadbare bestanden (basisspelers, ploegen, uitzonderingen, locaties, en het CP-bestand voor de competitieplanner). Een deel van de achterliggende logica bestaat al in de huidige backend, maar drie van de zes exports draaien vandaag volledig in de browser van de gebruiker — die logica moet verhuizen naar de server om betrouwbaar en veilig te werken in de nieuwe applicatie. De nieuwe frontend wordt gebouwd in Next.js 15 met Material UI.

## Werkstromen

- **Drie nieuwe backend-endpoints bouwen (~6u):** De exports voor ploegen, uitzonderingen en locaties worden vandaag in de browser gegenereerd. We verplaatsen die logica naar de server zodat de nieuwe frontend er eenvoudig gebruik van kan maken. Dit omvat het correct ophalen van de data, het toepassen van de juiste filtering en deduplicatie, en het genereren van Excel-bestanden.
- **Herbruikbare Excel-module (~1.2u):** We bouwen een gedeelde utility voor het genereren van Excel-bestanden (kolombreedte, filters, buffer-generatie). Dit voorkomt code-duplicatie en maakt toekomstige exports veel sneller te bouwen.
- **Beveiliging op orde brengen (~2u):** Twee bestaande download-endpoints (basisspelers en CP-bestand) hebben op dit moment géén inlogcontrole — iedereen met de juiste URL kan gevoelige spelergegevens downloaden. We voegen authenticatie en autorisatie toe aan alle vijf de endpoints. De benodigde rechten bestaan al in de database en worden per gebruiker toegekend. Dit is niet alleen nodig voor de nieuwe app, maar dicht ook een bestaand beveiligingslek.
- **Invoervalidatie en foutafhandeling (~1u):** Alle endpoints krijgen correcte validatie (bestaat de competitie? is de ID geldig?) en duidelijke foutmeldingen, zodat de frontend-gebruiker bij problemen een begrijpelijke melding krijgt in plaats van een technische fout.
- **Frontend: interactieve pagina Gemiddeld Niveau (~7u):** Dit is geen simpele download maar een volledige pagina met grafieken (gemiddeld niveau per reeks, geslacht en discipline), filtermogelijkheden en een CSV-export. De data komt via de bestaande GraphQL API die al correct werkt. Wordt gebouwd als Next.js client component met een React charting library en Material UI.
- **Frontend: downloadmenu met 5 exportknoppen (~3.5u):** Een MUI Menu op de competitiepagina met knoppen voor elke export. Elke knop is alleen zichtbaar voor gebruikers met de juiste rechten, toont een laadindicator tijdens het downloaden, en geeft een melding bij fouten.
- **Testen en kwaliteitsborging (~15u):** We schrijven geautomatiseerde tests voor alle nieuwe backend-logica (datatransformaties, deduplicatie, datumformattering) en voor de beveiligingscontroles. Daarnaast vergelijken we de output van de nieuwe exports met die van de oude applicatie om te garanderen dat de bestanden identiek zijn. Deze stap is cruciaal om regressies te voorkomen en vertrouwen te geven dat de migratie correct is verlopen.
- **Documentatie (~1u):** API-documentatie voor de nieuwe endpoints en inline commentaar bij complexe logica, zodat toekomstig onderhoud vlot verloopt.

## Complexiteit: Gemiddeld

De benodigde data en businesslogica bestaan al — we bouwen geen nieuwe functionaliteit maar verplaatsen en beveiligen bestaande logica. Er zijn geen databasewijzigingen nodig. De complexiteit zit vooral in het zorgvuldig repliceren van de bestaande datatransformaties en het grondig testen van de output.

## Tijdsinschatting

| Categorie | Uren |
|-----------|------|
| Backend (incl. gedeelde Excel-module) | 11.0 |
| Frontend (Next.js 15) | 10.4 |
| Testen | 15.3 |
| Documentatie | 0.8 |
| **Totaal** | **~38 uur** |

**Doorlooptijd:** Past binnen één sprint van twee weken met één ontwikkelaar. Bij twee ontwikkelaars (backend + frontend parallel) kan de doorlooptijd teruggebracht worden tot ~1 week.

**Bandbreedte:** Optimistisch 30 uur — verwacht 38 uur — pessimistisch 50 uur, afhankelijk van de complexiteit van de React charting library en de permissie-integratie in Next.js.

## Top 3 Risico's

1. **Beveiligingslekken in bestaande endpoints:** Twee huidige endpoints zijn toegankelijk zonder inloggen. Dit wordt als onderdeel van dit werk opgelost, maar het is belangrijk te weten dat dit een bestaand probleem is dat prioriteit verdient.
2. **Output moet exact overeenkomen:** De Excel-bestanden die de nieuwe backend genereert moeten identiek zijn aan wat de oude applicatie produceerde. Kleine verschillen in datumnotatie of deduplicatielogica kunnen voor verwarring zorgen bij eindgebruikers. We mitigeren dit door zij-aan-zij vergelijkingstests uit te voeren.
3. **CP-bestand werkt alleen op Windows:** De generator voor het competitieplanner-bestand gebruikt een Windows-specifieke bibliotheek (Microsoft Access). Dit is een bestaande beperking — het CP-bestand is bedoeld voor de "Competition Planner" desktopsoftware die zelf ook alleen op Windows draait, dus dit is geen probleem maar wel goed om te weten.
