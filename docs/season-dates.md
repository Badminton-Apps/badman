# Season dates

The calendar dates Badman's season and ranking logic depends on, where each one comes from, and how sure we are of it. All dates are calendar dates in Europe/Brussels, the timezone production runs in (see [Timezone](queue-job-and-worker-lifecycle.md#timezone)).

Sources: the Badminton Vlaanderen regulations at <https://badminton.vlaanderen/reglementen/>, and answers from Badminton Vlaanderen to our questions (ticket and date given).

| Date | Used for | Source | Status |
| --- | --- | --- | --- |
| Competition period: 1 September – 30 April | Which season an encounter belongs to; change-request date checks | C320 art. 1§2 | Regulation. Badminton Vlaanderen (BAD-397, 2026-11-19): an encounter that exceptionally moves to May still counts for the season that ended in April, and one played on 31 August counted for the season starting in September. Badman today switches seasons on 1 May for encounters; the fix is BAD-397. |
| Halves: 1 September – 31 December and 1 January – 30 April | Which half an encounter is in; change-request deadlines per half | C320 art. 26§5 | Regulation, confirmed by Badminton Vlaanderen (BAD-397, 2026-11-19): 1 January is the boundary and the actual date of the encounter decides the half. An encounter may move to the other half, as long as each opponent is still played once per half. |
| Enrollment ranking: the newest ranking up to 10 June of the season year | Enrollment, team index, line-up export, sync of entries | C320 art. 51§1 says the May ranking | Badman practice that differs from the regulation. Open question with Badminton Vlaanderen (BAD-401). |
| Line-up ranking: the newest update publication in May of the season year | Line-up check | Event setting `usedRankingUnit = "months"`, `usedRankingAmount = 4` (every event in production) | Badman practice, no regulation found. Open question with Badminton Vlaanderen on the ranking a line-up uses (BAD-407). |
| Membership year: 1 July – 30 June | Transfers, loans, membership checks | C925, C950: transfers and loans take effect on 1 July | Regulation for transfers and loans. Badminton Vlaanderen (BAD-397, 2026-11-19): there is no fixed reference date for a membership; a player needs a valid membership when the club enrolls and on the day of an encounter (follow-up in BAD-400). |
| Enrollment year: "the current season" means the upcoming one from 1 May | Enrollment screens and checks | None | Badman practice. Badminton Vlaanderen (BAD-397, 2026-11-19): enrollment opens early May, at the earliest on 1 May after the last encounters of 30 April, and closes on 22 May. |
| Result entry closes on 1 July of the following year | Pushing results to toernooi.nl | [`result-entry-rules.md`](result-entry-rules.md) | Badman practice. Badminton Vlaanderen (BAD-397, 2026-11-19): a club may still enter the result of an encounter that exceptionally took place in May. |
