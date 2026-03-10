import { waitForSelector } from "@badman/backend-pupeteer";
import { Logger } from "@nestjs/common";
import { parse } from "date-fns";
import { Page } from "puppeteer";

export async function detailEntered(
  pupeteer: {
    page: Page | null;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  args?: {
    logger?: Logger;
  }
) {
  const { logger } = args || {};
  logger?.verbose("detailEntered");
  const { page, timeout } = pupeteer;
  if (!page) {
    throw new Error("No page provided");
  }
  // regex to find 12-10-2022 19:46 format in text
  const timeFinder = /(\d{1,2}-\d{1,2}-\d{4} \d{1,2}:\d{1,2})/gim;
  const selector = `.content .wrapper--legacy tbody`;
  {
    const targetPage = page;
    const body = await waitForSelector(selector, targetPage, timeout);

    const rows = await body.$$("tr");

    let hasEntered = false;
    let enteredOn: Date | null = null;
    const enteredBy: string | null = null;
    for (const row of rows) {
      const th = await row.$("th");
      if (th) {
        const headerTxt = (await th.evaluate((el) => el.textContent)) || "";
        if (headerTxt.indexOf("Detailuitslag ingevoerd") !== -1) {
          hasEntered = true;

          const td = await row.$("td");
          const tdTxt = (await td?.evaluate((el) => el.textContent)) || "";

          const match = timeFinder.exec(tdTxt);

          if (match) {
            enteredOn = parse(match[1], "d-M-yyyy HH:mm", new Date());
          }
        }
      }

      if (hasEntered) {
        break;
      }
    }

    return {
      entered: hasEntered ? true : false,
      enteredOn,
      enteredBy,
    };
  }
}
