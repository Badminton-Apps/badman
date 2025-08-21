import { EncounterCompetition } from "@badman/backend-database";
import { runParallel } from "@badman/utils";
import { Page } from "puppeteer";

export async function enterEditMode(
  pupeteer: {
    page: Page | null;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  encounter: EncounterCompetition
) {
  const { page } = pupeteer;
  if (!page) {
    throw new Error("No page provided");
  }
  const matchId = encounter.visualCode;
  const eventId = encounter.drawCompetition?.subEventCompetition?.eventCompetition?.visualCode;

  {
    const targetPage = page;
    const promises = [];
    promises.push(targetPage.waitForNavigation());
    const url = `https://www.toernooi.nl/sport/matchresult.aspx?id=${eventId}&match=${matchId}`;
    console.log(`Entering edit mode for encounter ${matchId} at url ${url}`);
    await targetPage.goto(url);
    await runParallel(promises);
  }
}
