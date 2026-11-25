import { EncounterCompetition } from "@badman/backend-database";
import { Page } from "puppeteer";

const FORM_SELECTOR = 'input[id^="match_"][id$="_set_1"]';

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

  // networkidle0 never settles while ad/consent scripts keep connections open, so wait
  // for the form itself instead and only give the network a short chance to calm down.
  await page.goto(`https://www.toernooi.nl/sport/matchresult.aspx?id=${eventId}&match=${matchId}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForSelector(FORM_SELECTOR, { timeout: 30000 });
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }).catch(() => null);
}
