import { EncounterCompetition } from '@badman/backend-database';
import { runParrallel } from '@badman/utils';
import { Page } from 'puppeteer';

export async function enterEditMode(
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

  {
    const targetPage = page;
    const promises = [];
    promises.push(targetPage.waitForNavigation());
    await targetPage.goto(
      `https://www.toernooi.nl/sport/matchresult.aspx?id=${eventId}&match=${matchId}`
    );
    await runParrallel(promises);
  }
}
