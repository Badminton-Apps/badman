import { EncounterCompetition } from '@badman/backend-database';
import { runParrallel } from '@badman/utils';
import { Page } from 'puppeteer';

export async function gotoEncounterPage(
  pupeteer: {
    page: Page;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  encounter: EncounterCompetition
) {
  const { page } = pupeteer;
  const matchId = encounter.visualCode;
  const eventId =
    encounter.drawCompetition.subEventCompetition.eventCompetition.visualCode;
  const url = `https://www.toernooi.nl/sport/teammatch.aspx?id=${eventId}&match=${matchId}`;

  {
    const targetPage = page;
    const promises = [];
    promises.push(targetPage.waitForNavigation());
    await targetPage.goto(url);
    await runParrallel(promises);
  }
  return url;
}
